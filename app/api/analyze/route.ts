import { embedMany, generateObject, NoObjectGeneratedError } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

import { parseTranscript, isModerator } from '@/lib/parse'
import {
  SegmentationSchema,
  SEGMENTATION_SYSTEM_PROMPT,
  formatTurnsForPrompt,
  filterHallucinated,
  type SegmentedUtterance,
} from '@/lib/segment'
import { aggregateAndProject } from '@/lib/aggregate'
import type {
  AnalysisResult,
  ProjectionMethod,
  Utterance,
  UtteranceKind,
} from '@/lib/types'

export const maxDuration = 60

const MODEL = 'gpt-5.4-mini'
const EMBEDDING_MODEL = 'text-embedding-3-small'

/** Guards against a paste large enough to blow the duration limit. */
const MAX_TRANSCRIPT_CHARS = 120_000
/** Turns per segmentation call; keeps each request well inside maxDuration. */
const SEGMENT_BATCH_TURNS = 40

const RequestSchema = z.object({
  transcript: z.string().min(1),
  /** Include facilitator speech in the map. Off by default. */
  includeModerators: z.boolean().optional(),
})

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status })
}

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return jsonError(
      'OPENAI_API_KEY is not configured on the server.',
      503,
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonError('Request body must be JSON.', 400)
  }

  const parsedBody = RequestSchema.safeParse(body)
  if (!parsedBody.success) {
    return jsonError('Expected { transcript: string }.', 400)
  }

  const { transcript, includeModerators = false } = parsedBody.data
  if (transcript.length > MAX_TRANSCRIPT_CHARS) {
    return jsonError(
      `Transcript is ${transcript.length} characters; the limit is ${MAX_TRANSCRIPT_CHARS}.`,
      413,
    )
  }

  // 1. Attribute lines to speakers.
  const parsed = parseTranscript(transcript)
  if (parsed.turns.length === 0) {
    return jsonError(
      'No speaker-attributed lines found. Expected lines like "김철수: ..." or "[김철수] ...".',
      422,
    )
  }

  // 2. Segment turns into argument units.
  let units: SegmentedUtterance[] = []
  let hallucinatedCount = 0

  try {
    for (let i = 0; i < parsed.turns.length; i += SEGMENT_BATCH_TURNS) {
      const batch = parsed.turns.slice(i, i + SEGMENT_BATCH_TURNS)
      const { object } = await generateObject({
        model: openai(MODEL),
        schema: SegmentationSchema,
        system: SEGMENTATION_SYSTEM_PROMPT,
        prompt: formatTurnsForPrompt(batch),
      })

      const { kept, dropped } = filterHallucinated(object.utterances, batch)
      units.push(...kept)
      hallucinatedCount += dropped.length
    }
  } catch (error) {
    // A schema-conformance failure is worth distinguishing from a transport
    // error: it usually means the prompt or schema needs work, not a retry.
    if (NoObjectGeneratedError.isInstance(error)) {
      console.error('segmentation: no object generated', {
        cause: error.cause,
        text: error.text?.slice(0, 500),
      })
      return jsonError(
        'The model did not return usable segmentation output.',
        502,
      )
    }
    const message =
      error instanceof Error ? error.message : 'Segmentation failed.'
    return jsonError(`Segmentation failed: ${message}`, 502)
  }

  if (units.length === 0) {
    return jsonError(
      'Segmentation produced no usable units. The transcript may be too short.',
      422,
    )
  }

  // Reconcile speaker names against the parsed set: the model occasionally
  // returns a variant, and an unrecognised name would create a phantom speaker.
  // Units whose speaker cannot be resolved are dropped, not reassigned.
  const knownSpeakers = new Set(parsed.speakers)
  let unresolvedSpeakerUnits = 0
  units = units.flatMap((u) => {
    if (knownSpeakers.has(u.speaker)) return [u]
    const resolved = nearestSpeaker(u.speaker, parsed.speakers)
    if (resolved) return [{ ...u, speaker: resolved }]
    unresolvedSpeakerUnits += 1
    return []
  })

  if (units.length === 0) {
    return jsonError(
      'No segmented unit could be attributed to a known speaker.',
      422,
    )
  }

  const utterances: Utterance[] = units.map((u, i) => ({
    id: `u${i}`,
    speaker: u.speaker,
    text: u.text,
    // Only carry a translation when it says something the original does not.
    ...(u.textEn && u.textEn.trim() && u.textEn.trim() !== u.text.trim()
      ? { textEn: u.textEn.trim() }
      : {}),
    kind: u.kind,
    index: i,
  }))

  // 3. Embed. Only units that can carry a position need vectors.
  const embeddable = utterances.filter(
    (u) => u.kind === 'claim' || u.kind === 'question',
  )
  if (embeddable.length < 2) {
    return jsonError(
      'Fewer than two substantive utterances were found, so no map can be drawn.',
      422,
    )
  }

  let vectorByIndex: Map<number, number[]>
  try {
    vectorByIndex = await embedUtterances(embeddable)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Embedding failed.'
    return jsonError(`Embedding failed: ${message}`, 502)
  }

  // 4. Project, once per method, so the client can switch without a round trip.
  const vectors = utterances.map((u) => vectorByIndex.get(u.index) ?? [])
  const excludeSpeakers = includeModerators
    ? []
    : parsed.speakers.filter(isModerator)

  const methods: ProjectionMethod[] = ['pca', 'mds']
  const projections = {} as AnalysisResult['projections']
  let droppedSpeakers: string[] = []

  for (const method of methods) {
    const out = aggregateAndProject({
      utterances,
      vectors,
      method,
      excludeSpeakers,
    })
    projections[method] = {
      utterances: out.projectedUtterances,
      speakers: out.speakers,
      meta: {
        method,
        explainedVariance: out.explainedVariance,
        componentVariance: out.componentVariance,
      },
    }
    // Method-independent, so either pass yields the same set.
    droppedSpeakers = out.droppedSpeakers
  }

  const counts: Record<UtteranceKind, number> = {
    claim: 0,
    question: 0,
    agreement: 0,
    procedural: 0,
  }
  for (const u of utterances) counts[u.kind] += 1

  const result: AnalysisResult & {
    diagnostics: Record<string, unknown>
  } = {
    projections,
    counts,
    droppedSpeakers,
    diagnostics: {
      turns: parsed.turns.length,
      speakers: parsed.speakers,
      moderators: parsed.speakers.filter(isModerator),
      moderatorsExcluded: !includeModerators,
      aliasMap: parsed.aliasMap,
      continuationLines: parsed.continuationLines,
      preambleLines: parsed.preambleLines,
      unitsDroppedAsHallucinated: hallucinatedCount,
      unitsDroppedUnresolvedSpeaker: unresolvedSpeakerUnits,
      model: MODEL,
      embeddingModel: EMBEDDING_MODEL,
    },
  }

  return Response.json(result)
}

/**
 * Embeds utterances, returning vectors keyed by utterance index.
 *
 * `embedMany` chunks against the model's `maxEmbeddingsPerCall` (2048 here),
 * retries, and guarantees the returned array is ordered to match `values`.
 */
async function embedUtterances(
  utterances: Utterance[],
): Promise<Map<number, number[]>> {
  const { embeddings } = await embedMany({
    model: openai.embeddingModel(EMBEDDING_MODEL),
    values: utterances.map((u) => u.text),
    maxParallelCalls: 2,
  })

  const out = new Map<number, number[]>()
  utterances.forEach((u, i) => {
    const vector = embeddings[i]
    if (vector) out.set(u.index, vector)
  })
  return out
}

/**
 * Maps a model-returned speaker name onto a known one, or null if it cannot be
 * resolved confidently.
 *
 * Returns null rather than guessing. Assigning an unresolvable name to the first
 * known speaker would credit real words to the wrong participant and shift that
 * participant's centroid, with nothing in the output to indicate it happened.
 */
function nearestSpeaker(candidate: string, known: string[]): string | null {
  const c = candidate.replace(/\s+/g, '')
  if (!c) return null

  const stripped = known.map((k) => ({ name: k, key: k.replace(/\s+/g, '') }))

  // Exact match after whitespace removal.
  const exact = stripped.find((k) => k.key === c)
  if (exact) return exact.name

  // The candidate carries the known name plus a title, e.g. "김철수 위원".
  const extended = stripped.filter((k) => c.startsWith(k.key))
  if (extended.length === 1) return extended[0].name

  // The candidate is a prefix of exactly one known name. Requiring uniqueness
  // matters for Korean surnames: "김" prefixes both 김철수 and 김영수, and
  // picking the first would attribute by transcript order rather than identity.
  const prefixOf = stripped.filter((k) => k.key.startsWith(c))
  if (prefixOf.length === 1 && c.length >= 2) return prefixOf[0].name

  return null
}
