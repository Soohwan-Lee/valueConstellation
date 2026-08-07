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
  // Nullable rather than optional: OpenAI structured output rejects optional
  // fields, and a null here means "same language as the source".
  textEn: z
    .string()
    .nullable()
    .describe(
      'Faithful English translation when the source is not English; null when ' +
        'the source is already English. Translation only — never a summary.',
    ),
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

/**
 * A verified unit together with the clock time of the turn it was copied from.
 *
 * The time is taken from the source turn rather than asked of the model. The
 * model never sees a timestamp: it is not needed to split an argument, and a
 * time in the prompt is a time that can end up copied into the statement text
 * or attached to the wrong unit. Verification already finds which turn a unit
 * came from, so the exact answer is free.
 */
export interface LocatedUtterance extends SegmentedUtterance {
  /** Timestamp as written in the transcript. Absent when the source had none. */
  at?: string
}

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
8. For "textEn": give a faithful English translation of the unit when the source is not English. Translate, do not summarise or soften — hedging and force must survive. Set it to null when the source is already English. Translate EVERY word: a "textEn" containing any Korean character is wrong, including for terms that feel untranslatable — render 기준 as "the standard", 조건 as "the condition", and so on.

Be conservative about splitting. A long turn developing one argument is ONE unit.

Splitting discipline — this matters more than any other rule:
- Most turns yield exactly ONE unit. A turn becomes two only when it makes two claims that could stand as separate positions someone might agree with one of and reject the other.
- Never split a claim from its supporting reason, evidence, statistic, example, or consequence. "We should do X. The cost is Y. So Z follows." is ONE unit.
- Never split on sentence boundaries, discourse markers, or paragraph breaks alone. "그리고", "또한", "먼저", "마지막으로", "However", "Additionally" signal continuation of one argument, not a new one.
- A one-minute speaking turn is normally one unit, occasionally two, and almost never three or more.
- If unsure whether to split, do not split.`

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
  turns: { speaker: string; text: string; time?: string }[],
): { kept: LocatedUtterance[]; dropped: SegmentedUtterance[] } {
  const normalize = (s: string) => s.replace(/\s+/g, '').toLowerCase()

  // Each turn is kept as a separate haystack. Concatenating a speaker's turns
  // would erase the boundaries between them, letting a unit that splices the
  // end of one turn onto the start of the next pass verification.
  const turnsBySpeaker = new Map<string, { text: string; time?: string }[]>()
  for (const t of turns) {
    const list = turnsBySpeaker.get(t.speaker) ?? []
    list.push({ text: normalize(t.text), time: t.time })
    turnsBySpeaker.set(t.speaker, list)
  }

  const kept: LocatedUtterance[] = []
  const dropped: SegmentedUtterance[] = []

  for (const u of units) {
    const needle = normalize(u.text)
    // A few characters can match almost any sentence — "니다" is a bare Korean
    // verb ending. Require enough length for the match to mean something.
    if (needle.length < MIN_VERIFIABLE_CHARS) {
      dropped.push(u)
      continue
    }
    // Verify against the attributed speaker's own turns only. Falling back to
    // the whole transcript would let one speaker's words be credited to
    // another, which is exactly the corruption this check exists to stop.
    const own = turnsBySpeaker.get(u.speaker) ?? []
    // The first turn that contains the unit. A unit that occurs twice is one
    // sentence somebody repeated, and the earlier saying is the one it came
    // from — guessing the later one would move a statement forward in a
    // timeline it did not belong to.
    const source = own.find((turn) => turn.text.includes(needle))
    if (source) {
      kept.push({ ...u, ...(source.time ? { at: source.time } : {}) })
    } else {
      dropped.push(u)
    }
  }

  return { kept, dropped }
}

/**
 * Minimum normalised length for a text match to be evidence of provenance.
 *
 * Short fragments match by coincidence: two Korean characters will appear
 * somewhere in almost any transcript.
 */
const MIN_VERIFIABLE_CHARS = 8
