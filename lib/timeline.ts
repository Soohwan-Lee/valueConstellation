/**
 * What changed between the first half of the meeting and the second.
 *
 * Only possible when the transcript carries timestamps, which most do not. The
 * whole module returns null rather than guessing an order from line numbers:
 * transcript position says who spoke after whom, not how much of the meeting
 * had passed, and a "first half" measured in lines would split a meeting where
 * one person talks in long turns straight down the middle of their argument.
 *
 * Measured in embedding space, before any projection, for the reason every
 * other diagnostic in this codebase is — see `lib/aggregate.ts`. A layout
 * fitted to push speakers apart cannot be asked whether speakers moved.
 *
 * The hard part is not measuring movement but knowing when there is none.
 * Split any set of statements in two and the halves' centres will differ, by
 * an amount that depends only on how many statements there were and how widely
 * that person ranges. That amount is the baseline every figure here is divided
 * by: a move counts when it is larger than reshuffling the same statements
 * would produce. Without it, "everybody moved" is the answer for every meeting,
 * and most loudly for the people who said least.
 */

import { centroid, normalize } from './aggregate.ts'
import type { Vector } from './project.ts'
import type { Utterance } from './types.ts'

/**
 * Statements each side of the split before a speaker's halves are compared.
 *
 * Three is the floor everywhere else a centroid is treated as a position
 * (`MIN_UTTERANCES_FOR_POSITION`), and for the same reason: two statements
 * average to a point on the line between them, which is a position only in the
 * sense that any two points have a midpoint.
 */
export const MIN_STATEMENTS_PER_HALF = 3

/**
 * Share of mapped statements that must carry a timestamp.
 *
 * A partly timed transcript would compare halves built only from the lines that
 * happened to be timed — usually the ones a transcription tool was confident
 * about, which is not a random sample of the meeting.
 */
export const MIN_TIMED_SHARE = 0.8

/**
 * How much bigger than the reshuffle baseline a move has to be to be reported.
 *
 * 1.5 is chosen the way `MIN_USEFUL_SEPARATION` is: at 1.0 the figure equals
 * what chance produces, so anything at or near it is noise being read as a
 * finding. Half again as large is the smallest gap that survives being wrong
 * about the baseline by a few tens of percent, which the analytic form below
 * certainly is.
 */
export const MIN_MOVE_RATIO = 1.5

/** How far a speaker's second half sat from their first. */
export interface SpeakerMove {
  speaker: string
  /** Mapped statements before and after the split. */
  early: number
  late: number
  /**
   * Distance between the two halves' centres, over the distance reshuffling
   * the same statements would have produced. 1 is chance; see MIN_MOVE_RATIO.
   */
  ratio: number
  moved: boolean
}

/** Whether two people's positions closed or opened over the meeting. */
export interface PairChange {
  a: string
  b: string
  /** Gap between the two, in the first half and in the second. */
  earlyGap: number
  lateGap: number
  /** lateGap / earlyGap. Below 1 they closed, above 1 they opened. */
  ratio: number
  /** `same` when the change is inside what reshuffling would produce. */
  direction: 'closer' | 'apart' | 'same'
}

export interface Timeline {
  /** Mapped statements carrying a timestamp, and mapped statements in total. */
  timed: number
  total: number
  /** The clock time the meeting was cut at, as written in the transcript. */
  splitAt: string
  /** First and last timestamps on the map, as written. */
  span: [string, string]
  /** One entry per speaker with enough statements each side of the split. */
  moves: SpeakerMove[]
  /** One entry per pair where both speakers qualify. */
  pairs: PairChange[]
}

/**
 * Seconds from a written timestamp, or null if it is not one.
 *
 * Two parts are read as minutes and seconds, three as hours, minutes and
 * seconds. That is the convention every transcription export follows, and the
 * only thing the choice affects is the split point of a meeting long enough to
 * cross an hour.
 */
export function clockSeconds(at: string | undefined): number | null {
  if (!at) return null
  const parts = at.trim().split(':')
  if (parts.length < 2 || parts.length > 3) return null
  const numbers = parts.map((p) => Number(p))
  if (numbers.some((n) => !Number.isFinite(n) || n < 0)) return null
  return parts.length === 2
    ? numbers[0] * 60 + numbers[1]
    : numbers[0] * 3600 + numbers[1] * 60 + numbers[2]
}

function distance(a: Vector, b: Vector): number {
  let sum = 0
  for (let i = 0; i < a.length; i += 1) {
    const d = a[i] - b[i]
    sum += d * d
  }
  return Math.sqrt(sum)
}

/** Mean distance from a set of points to their own centre. */
function spread(vectors: Vector[], centre: Vector): number {
  if (vectors.length === 0) return 0
  let sum = 0
  for (const v of vectors) sum += distance(v, centre)
  return sum / vectors.length
}

/**
 * What splitting the same statements at random would move the centre by.
 *
 * Points scattered at radius `s` around a centre have a mean of k of them
 * landing about `s / sqrt(k)` from it, so two halves' centres sit roughly
 * `s * sqrt(1/nEarly + 1/nLate)` apart with no drift at all. Approximate — it
 * treats the statements as independent draws, which real speech is not — and
 * so used only as a scale, never as a p-value.
 */
function reshuffleBaseline(s: number, nEarly: number, nLate: number): number {
  return s * Math.sqrt(1 / nEarly + 1 / nLate)
}

export interface TimelineInput {
  /** Statements already filtered to those on the map. */
  utterances: Utterance[]
  /** Embedding per statement, index-aligned with `utterances`. */
  vectors: (Vector | undefined)[]
}

export function buildTimeline({
  utterances,
  vectors,
}: TimelineInput): Timeline | null {
  const dim = vectors.find((v) => v?.length)?.length ?? 0
  if (dim === 0 || utterances.length === 0) return null

  const timed: { u: Utterance; v: Vector; t: number }[] = []
  let usable = 0
  utterances.forEach((u, i) => {
    const v = vectors[i]
    if (v?.length !== dim) return
    usable += 1
    const t = clockSeconds(u.at)
    if (t !== null) timed.push({ u, v: normalize(v), t })
  })

  if (usable === 0) return null
  if (timed.length / usable < MIN_TIMED_SHARE) return null

  timed.sort((a, b) => a.t - b.t)
  const first = timed[0]
  const last = timed[timed.length - 1]
  // A recording where every line carries the same clock time has no halves.
  if (last.t === first.t) return null

  // Split so that the two halves hold as near the same number of statements as
  // the timestamps allow, rather than at the midpoint of the clock: a meeting
  // that spends forty minutes on one agenda item and five on the next would
  // otherwise put almost everything in the "first half".
  const mid = timed[Math.floor(timed.length / 2)]
  const splitSeconds = mid.t
  const isEarly = (t: number) => t < splitSeconds

  // Everything sharing the median second would land on one side, which for a
  // transcript timed to the minute can be most of the meeting.
  const earlyCount = timed.filter((s) => isEarly(s.t)).length
  if (earlyCount === 0 || earlyCount === timed.length) return null

  const bySpeaker = new Map<string, { early: Vector[]; late: Vector[] }>()
  for (const s of timed) {
    const entry = bySpeaker.get(s.u.speaker) ?? { early: [], late: [] }
    ;(isEarly(s.t) ? entry.early : entry.late).push(s.v)
    bySpeaker.set(s.u.speaker, entry)
  }

  const moves: SpeakerMove[] = []
  const halves = new Map<string, { early: Vector; late: Vector; noise: number }>()

  for (const [speaker, { early, late }] of bySpeaker) {
    if (
      early.length < MIN_STATEMENTS_PER_HALF ||
      late.length < MIN_STATEMENTS_PER_HALF
    ) {
      continue
    }
    const all = [...early, ...late]
    const centre = centroid(all)
    const earlyCentre = centroid(early)
    const lateCentre = centroid(late)
    if (!centre || !earlyCentre || !lateCentre) continue

    const baseline = reshuffleBaseline(
      spread(all, centre),
      early.length,
      late.length,
    )
    if (baseline < 1e-9) continue

    const ratio = distance(earlyCentre, lateCentre) / baseline
    moves.push({
      speaker,
      early: early.length,
      late: late.length,
      ratio,
      moved: ratio >= MIN_MOVE_RATIO,
    })
    halves.set(speaker, { early: earlyCentre, late: lateCentre, noise: baseline })
  }

  const names = [...halves.keys()]
  const pairs: PairChange[] = []
  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) {
      const a = halves.get(names[i])!
      const b = halves.get(names[j])!
      const earlyGap = distance(a.early, b.early)
      const lateGap = distance(a.late, b.late)
      if (earlyGap < 1e-9) continue

      // Both people's centres carry their own reshuffle noise, so the gap
      // between them carries both. A change smaller than that is not a change.
      const noise = Math.sqrt(a.noise * a.noise + b.noise * b.noise)
      const delta = lateGap - earlyGap
      pairs.push({
        a: names[i],
        b: names[j],
        earlyGap,
        lateGap,
        ratio: lateGap / earlyGap,
        direction:
          Math.abs(delta) < noise ? 'same' : delta < 0 ? 'closer' : 'apart',
      })
    }
  }

  // Largest movement first, then the pairs that changed most.
  moves.sort((x, y) => y.ratio - x.ratio)
  pairs.sort(
    (x, y) => Math.abs(Math.log(y.ratio)) - Math.abs(Math.log(x.ratio)),
  )

  if (moves.length === 0) return null

  return {
    timed: timed.length,
    total: usable,
    splitAt: mid.u.at!,
    span: [first.u.at!, last.u.at!],
    moves,
    pairs,
  }
}
