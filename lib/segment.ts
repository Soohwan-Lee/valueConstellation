import { z } from 'zod'

/**
 * Segmentation of speaker turns into argument units.
 *
 * The unit of analysis is an argument, not a turn or a sentence: adjacent
 * sentences that together make one claim (position + reasons + implications)
 * stay together, while a turn covering two unrelated points is split. This was
 * the conclusion of the previous generation of this project — sentence-level
 * units fragment reasoning, and turn-level units blur distinct positions.
 */

export const UtteranceKindSchema = z.enum([
  'claim',
  'question',
  'agreement',
  'procedural',
])

export const SegmentedUtteranceSchema = z.object({
  speaker: z
    .string()
    .describe('Speaker name, copied exactly from the input turn.'),
  text: z
    .string()
    .describe('The argument unit, verbatim from the source. Never paraphrased.'),
  kind: UtteranceKindSchema.describe(
    'claim: a substantive position, usually with reasons. ' +
      'question: asking rather than asserting. ' +
      'agreement: pure assent adding no content. ' +
      'procedural: agenda, logistics, turn-taking.',
  ),
})

export const SegmentationSchema = z.object({
  utterances: z.array(SegmentedUtteranceSchema),
})

export type SegmentedUtterance = z.infer<typeof SegmentedUtteranceSchema>

export const SEGMENTATION_SYSTEM_PROMPT = `You split meeting-transcript turns into argument units.

An argument unit is one claim together with the reasons and implications that belong to it. Rules:

1. NEVER paraphrase, translate, summarise, or clean up. Copy text verbatim from the input. Preserve the original language.
2. Keep adjacent sentences together when they form ONE argument: a position plus its justification, evidence, or consequence.
3. Split a turn when it makes two genuinely separate points. Do not split a single point across sentences.
4. Preserve the speaker exactly as given.
5. Classify each unit:
   - "claim" — a substantive position on the topic. The default for anything with content.
   - "question" — asking, not asserting.
   - "agreement" — pure assent with no added content ("네", "맞아요", "동의합니다", "그렇죠"). If assent comes WITH a reason, it is a claim.
   - "procedural" — agenda, timing, turn-taking, logistics. Not about the substance.
6. Drop filler that carries nothing: "음", "어", "저기", throat-clearing.
7. Output every unit in transcript order.

Be conservative about splitting. A long turn developing one argument is ONE unit.`

/** Turns, formatted for the model with indices so it can preserve order. */
export function formatTurnsForPrompt(
  turns: { speaker: string; text: string }[],
): string {
  return turns
    .map((t, i) => `[${i}] ${t.speaker}: ${t.text}`)
    .join('\n')
}

/**
 * Rejects units the model invented rather than copied.
 *
 * The prompt forbids paraphrasing, but a model that paraphrases anyway would
 * silently corrupt every downstream coordinate, so verify rather than trust:
 * a unit's text must actually occur in the source for that speaker.
 */
export function filterHallucinated(
  units: SegmentedUtterance[],
  turns: { speaker: string; text: string }[],
): { kept: SegmentedUtterance[]; dropped: SegmentedUtterance[] } {
  const bySpeaker = new Map<string, string>()
  for (const t of turns) {
    bySpeaker.set(t.speaker, (bySpeaker.get(t.speaker) ?? '') + ' ' + t.text)
  }

  const normalize = (s: string) => s.replace(/\s+/g, '').toLowerCase()
  const haystacks = new Map(
    [...bySpeaker.entries()].map(([k, v]) => [k, normalize(v)]),
  )
  const allText = normalize(turns.map((t) => t.text).join(' '))

  const kept: SegmentedUtterance[] = []
  const dropped: SegmentedUtterance[] = []

  for (const u of units) {
    const needle = normalize(u.text)
    if (needle.length < 2) {
      dropped.push(u)
      continue
    }
    const own = haystacks.get(u.speaker)
    // Accept if the text appears under this speaker, or anywhere in the
    // transcript (covering minor speaker-attribution slips without letting
    // fabricated text through).
    if (own?.includes(needle) || allText.includes(needle)) {
      kept.push(u)
    } else {
      dropped.push(u)
    }
  }

  return { kept, dropped }
}
