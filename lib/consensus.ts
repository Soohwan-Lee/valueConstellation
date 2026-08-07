import { z } from 'zod'
import type { Utterance } from './types.ts'

/**
 * Where the room landed, written out and then placed on the map.
 *
 * The map has always been able to say who sits apart and never what the meeting
 * arrived at, which is the thing anybody sitting in one actually wants. The
 * honest way to add it is not to compute a point and narrate it: it is to write
 * the sentence from the statements, embed that sentence with the same model
 * that embedded them, and let it land where it lands. Its distance to each
 * speaker is then the same kind of distance as every other on the page — a
 * measurement, not a drawing.
 *
 * Which means the point can be wrong in a checkable way, and that is the
 * feature. If the written consensus sits far from somebody whose statements it
 * claims to include, that shows on the map, and the anchors say which
 * statements to go read.
 *
 * Meetings that did not converge are the normal case and must not be given a
 * point. `reached` is false for them, no vector is embedded, nothing is drawn,
 * and the open question is reported instead — a tool that always finds
 * agreement is worth nothing on the meetings where finding it matters.
 */

const BilingualSchema = z.object({ ko: z.string(), en: z.string() })

export const ConsensusSchema = z.object({
  reached: z
    .boolean()
    .describe(
      'True only if the discussion arrived at something every mapped speaker ' +
        'could sign, whether a decision, a next step, or a shared framing.',
    ),
  statement: BilingualSchema.describe(
    'When reached: one or two sentences stating what the room landed on, in ' +
      'the participants own vocabulary. Empty strings when not reached.',
  ),
  anchors: z
    .array(z.string())
    .describe('Ids of the statements the landing point is read from.'),
  open: BilingualSchema.describe(
    'The question still open. Always filled in: a meeting that agreed on ' +
      'something usually still left something unsettled.',
  ),
})

export type ConsensusRead = z.infer<typeof ConsensusSchema>

/** What the interface receives: the reading, plus what can be checked. */
export interface Consensus {
  reached: boolean
  statement: { ko: string; en: string }
  open: { ko: string; en: string }
  /** Statement ids it rests on, verified against the transcript. */
  anchors: string[]
  /**
   * How far each statement sits from the landing point, as a share of the
   * furthest. Measured in embedding space, before any projection — so the
   * convergence view is not reading a picture that was fitted to show people
   * apart. Keyed by statement id.
   */
  gap: Record<string, number>
  /**
   * What the gaps are measured from. `group` when no consensus was reached and
   * the room's average is used instead, so the view still says something true
   * about a meeting that agreed on nothing.
   */
  basis: 'consensus' | 'group'
}

/**
 * How far each statement sits from the landing point, as a share of the
 * furthest one.
 *
 * A share rather than a distance, like every other figure on the page: the raw
 * number is in embedding units and means nothing between two meetings, while
 * "half as far as the furthest thing anybody said" is readable without a scale.
 *
 * Measured on the vectors, never on the map. The convergence view is the one
 * place a reader watches something approach something else over time, which is
 * exactly where a layout fitted to spread people out would be most flattering
 * to itself.
 */
export function measureGaps(
  entries: { id: string; vector: number[] }[],
  basis: number[],
): Record<string, number> {
  const raw = new Map<string, number>()
  let widest = 0
  for (const { id, vector } of entries) {
    if (vector.length !== basis.length) continue
    let sum = 0
    for (let i = 0; i < basis.length; i += 1) {
      const d = vector[i] - basis[i]
      sum += d * d
    }
    const distance = Math.sqrt(sum)
    if (!Number.isFinite(distance)) continue
    raw.set(id, distance)
    if (distance > widest) widest = distance
  }
  if (widest < 1e-12) return {}

  const gap: Record<string, number> = {}
  for (const [id, distance] of raw) gap[id] = distance / widest
  return gap
}

export const CONSENSUS_SYSTEM_PROMPT = `You read a meeting transcript and report what, if anything, the room arrived at.

You are given every substantive statement with an id and a speaker.

Decide "reached":
- true only if the discussion arrived at something EVERY listed speaker could sign: a decision, an agreed next step, or a shared framing of the problem they all came to use.
- false if they stated positions and stopped, if the agreement is only the facilitator summarising, or if speakers attached conditions that contradict each other. Most meetings are false. Do not reward a meeting for being polite.

When "reached" is true, write "statement":
- one or two sentences saying what the room landed on, in the participants' own words and level of detail. "Thursday's release is held; logs go in this week and the date is set once the bug reproduces" — not "the team agreed to postpone".
- it must be something you can point at statements for. Put those ids in "anchors", from at least two different speakers.
- never name a speaker in it. It is the room's sentence, not anybody's.

When "reached" is false, leave "statement" as empty strings and put nothing in "anchors".

Always write "open": the question that is still unsettled, in one sentence. If everything was settled, say what the decision depends on.

Both languages for every field. The Korean is primary and must read naturally; it is not a translation of the English. Neutral register — you are reporting, not judging, and never saying who was right.`

/** Statements shown to the model, oldest first, capped for a long meeting. */
const MAX_STATEMENTS = 80

export function formatForConsensus(utterances: Utterance[]): string {
  const shown =
    utterances.length <= MAX_STATEMENTS
      ? utterances
      : [
          ...utterances.slice(0, MAX_STATEMENTS / 2),
          ...utterances.slice(-MAX_STATEMENTS / 2),
        ]
  const lines = shown
    .map((u) => `[${u.id}] ${u.speaker}${u.at ? ` (${u.at})` : ''}: ${u.text}`)
    .join('\n')
  const speakers = [...new Set(utterances.map((u) => u.speaker))].join(', ')
  return `SPEAKERS: ${speakers}\n\n${lines}`
}

/**
 * Keeps only what the transcript supports.
 *
 * An anchor pointing at a statement nobody made, or at one statement repeated,
 * would make the reading uncheckable in exactly the place it claims to be
 * checkable. A "reached" with no surviving anchors is downgraded rather than
 * shown: agreement asserted with nothing to point at is the failure mode this
 * whole module is built against.
 */
export function verifyConsensus(
  read: ConsensusRead,
  utterances: Utterance[],
): { reached: boolean; anchors: string[] } {
  const byId = new Map(utterances.map((u) => [u.id, u]))
  const anchors = [...new Set(read.anchors)].filter((id) => byId.has(id))
  const speakers = new Set(anchors.map((id) => byId.get(id)!.speaker))

  // Two speakers, because a landing point read from one person's statements is
  // that person's position with a different label on it.
  const reached =
    read.reached && read.statement.ko.trim().length > 0 && speakers.size >= 2

  return { reached, anchors: reached ? anchors : [] }
}
