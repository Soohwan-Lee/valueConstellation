import { z } from 'zod'
import type { Utterance } from './types.ts'
import type { Lang } from './i18n.ts'

/**
 * What each participant actually argued.
 *
 * The map answers "who is near whom" and refuses to answer "why" — a direction
 * in a projection is a direction, and the tool has been careful not to narrate
 * one. But a reader who sees two people sitting apart wants the sentence that
 * says what the gap is, and the honest way to give it is not to read it off the
 * picture: it is to read the person's statements.
 *
 * So this is computed from the transcript, not from the coordinates. It would
 * be identical if the map were laid out differently, which is the property that
 * makes it worth trusting — nothing here is downstream of the flattening.
 *
 * Every summary carries `anchors`, the ids of the statements it rests on, and
 * the interface shows them underneath. A summary a reader cannot check against
 * what was said is a summary that gets believed for the wrong reasons.
 */

const BilingualSchema = z.object({
  ko: z.string(),
  en: z.string(),
})

const SummarySchema = z.object({
  speaker: z.string().describe('The speaker name exactly as given.'),
  stance: BilingualSchema.describe(
    'One sentence: the position this person argued for. Korean first.',
  ),
  themes: z
    .array(BilingualSchema)
    .min(1)
    .max(4)
    .describe('2-4 short phrases: what they kept coming back to.'),
  anchors: z
    .array(z.string())
    .min(1)
    .max(3)
    .describe('Ids of the statements the stance is drawn from.'),
})

export const SpeakerSummariesSchema = z.object({
  summaries: z.array(SummarySchema),
})

export type SpeakerSummary = z.infer<typeof SummarySchema>
/** Keyed by speaker name as spoken, matching every other speaker-keyed map. */
export type SpeakerSummaries = Record<string, SpeakerSummary>

export const SUMMARY_SYSTEM_PROMPT = `You summarise what each participant in a discussion argued.

You are given every substantive statement, grouped by speaker, each with an id.

For each speaker produce:
- "stance": ONE sentence naming the position they argued for, and what they
  argued it on. Not a list of topics — the claim itself. "Wants the site moved
  because the access road cannot take the traffic", not "discussed traffic".
- "themes": 2-4 short phrases (2-5 words) for what they kept returning to. The
  concern or the value underneath the argument, not the surface topic:
  "cost to residents", "who decides", "reversibility", "safety first".
- "anchors": the ids of 1-3 statements the stance is drawn from. Pick the ones
  that carry the position most plainly. Ids must come from that speaker.

Rules:
- Summarise only from that speaker's statements. Never attribute to one person
  a position taken by another.
- Where two speakers differ, let the summaries make the difference visible: if
  one argues cost and another argues safety, say so in each. Do not write two
  summaries that could be swapped.
- If a speaker's statements do not add up to a position — they asked questions,
  or moved between unrelated items — say that plainly rather than inventing a
  coherence they did not have.
- Neutral register. You are reporting what was argued, not judging it, and not
  saying who was right.
- Never write the speaker's name in "stance" or "themes". The summary is shown
  directly under their name, so repeating it wastes the one line there is —
  and a name transliterated into the other language stops matching the label
  beside it. Start with the position.
- Give Korean and English for every field. The Korean is primary and must read
  naturally; it is not a translation of the English.
- Copy "speaker" exactly as given.`

/** Statements per speaker shown to the model. */
const PER_SPEAKER = 12

/**
 * Groups the statements by speaker for the prompt.
 *
 * Long meetings are truncated per speaker rather than overall, so a participant
 * who spoke twice is still summarised from both of their statements while one
 * who spoke sixty times contributes a readable sample. Taking the first and
 * last of a run keeps an opening position and whatever it became, which is
 * where a speaker who changed their mind shows up.
 */
export function formatStatementsForPrompt(utterances: Utterance[]): string {
  const bySpeaker = new Map<string, Utterance[]>()
  for (const u of utterances) {
    const list = bySpeaker.get(u.speaker)
    if (list) list.push(u)
    else bySpeaker.set(u.speaker, [u])
  }

  return [...bySpeaker]
    .map(([speaker, all]) => {
      const shown =
        all.length <= PER_SPEAKER
          ? all
          : [
              ...all.slice(0, Math.ceil(PER_SPEAKER / 2)),
              ...all.slice(-Math.floor(PER_SPEAKER / 2)),
            ]
      const lines = shown.map((u) => `  [${u.id}] ${u.text}`).join('\n')
      const elided =
        all.length > shown.length
          ? `\n  (${all.length - shown.length} further statements not shown)`
          : ''
      return `SPEAKER: ${speaker}\n${lines}${elided}`
    })
    .join('\n\n')
}

/**
 * True when there is enough from this speaker for a stance to be a reading
 * rather than a guess. One statement is a quote, not a position.
 */
export const MIN_STATEMENTS_FOR_SUMMARY = 2

export function canSummarise(utterances: Utterance[]): boolean {
  const counts = new Map<string, number>()
  for (const u of utterances) counts.set(u.speaker, (counts.get(u.speaker) ?? 0) + 1)
  return [...counts.values()].some((n) => n >= MIN_STATEMENTS_FOR_SUMMARY)
}

/** The field in the reader's language. */
export function say(value: { ko: string; en: string }, lang: Lang): string {
  return (lang === 'ko' ? value.ko : value.en)?.trim() || value.ko || value.en
}
