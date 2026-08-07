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
 * Where each statement sits between the closest and the furthest, 0 to 1.
 *
 * The gaps themselves run 0.75 to 1.00 on every meeting measured, and that is
 * not a property of these meetings: in 1536 dimensions everything is roughly
 * equally far from everything, so a chart drawn on the raw share is a flat line
 * against an axis of empty space. Rescaling to the observed range is what makes
 * the differences visible — and it is also why nothing here may be labelled
 * with a distance. The view says "closest of what was said" and "furthest",
 * never "close to the consensus", because the first is what this number knows.
 */
export function spreadPositions(
  gap: Record<string, number>,
): Record<string, number> {
  const values = Object.values(gap).filter((g) => Number.isFinite(g))
  if (values.length === 0) return {}
  const low = Math.min(...values)
  const high = Math.max(...values)
  if (high - low < 1e-12) return {}

  const out: Record<string, number> = {}
  for (const [id, g] of Object.entries(gap)) {
    if (Number.isFinite(g)) out[id] = (g - low) / (high - low)
  }
  return out
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
- false if they stated positions and stopped, or if speakers attached conditions that contradict each other. Most meetings are false. Do not reward a meeting for being polite.
- a facilitator's closing summary is evidence of what was landed on, but not proof: it counts when the participants' own words show them taking it up, and not when it papers over a disagreement they never resolved.

When "reached" is true, write "statement":
- one or two sentences saying what the room landed on, in the participants' own words and level of detail. "Thursday's release is held; logs go in this week and the date is set once the bug reproduces" — not "the team agreed to postpone".
- it must be something you can point at statements for. Put those ids in "anchors", from at least two different speakers.
- never name a speaker in it. It is the room's sentence, not anybody's.

When "reached" is false, leave "statement" as empty strings and put nothing in "anchors".

Always write "open": the question that is still unsettled, in one sentence. If everything was settled, say what the decision depends on.

Both languages for every field. The Korean is primary and must read naturally; it is not a translation of the English. Neutral register — you are reporting, not judging, and never saying who was right.`

/** Statements shown to the model, oldest first, capped for a long meeting. */
const MAX_STATEMENTS = 100

/**
 * The whole meeting, with only the mapped statements given ids.
 *
 * The facilitator's closing line and the procedural turns are shown even though
 * they carry no position: "then we hold Thursday and revisit on Friday" is
 * where a room's landing point is usually said out loud, and it is almost
 * always said by whoever was chairing — who is excluded from the map by
 * default. Reading the meeting without it returned "no consensus" for a meeting
 * that ended with four people taking away four agreed actions.
 *
 * They are shown without ids, so they cannot be anchored to. The evidence a
 * reader is pointed at stays inside the statements that are on the map.
 */
export function formatForConsensus(
  utterances: Utterance[],
  anchorable: Set<string>,
): string {
  const shown =
    utterances.length <= MAX_STATEMENTS
      ? utterances
      : [
          ...utterances.slice(0, MAX_STATEMENTS / 2),
          ...utterances.slice(-MAX_STATEMENTS / 2),
        ]
  const lines = shown
    .map((u) => {
      const mark = anchorable.has(u.id) ? `[${u.id}]` : '[ — ]'
      return `${mark} ${u.speaker}${u.at ? ` (${u.at})` : ''}: ${u.text}`
    })
    .join('\n')
  const speakers = [
    ...new Set(
      utterances.filter((u) => anchorable.has(u.id)).map((u) => u.speaker),
    ),
  ].join(', ')
  return `MAPPED SPEAKERS: ${speakers}\n\nLines marked [ — ] are facilitation or process talk. Read them for what was decided, but never cite them: "anchors" may only contain the bracketed ids.\n\n${lines}`
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
