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
 * Split any set of statements in two and the halves' centres will differ, by an
 * amount that depends on how many statements there were and how widely that
 * person ranges. So nothing here is compared against a fixed threshold: every
 * figure is compared against the same statements re-split at random, over and
 * over. A speaker moved if the real split separates their halves further than
 * `NULL_PERCENTILE` of random splits do. Without that, "everybody moved" is the
 * answer for every meeting, loudest for whoever said least.
 *
 * The re-splits are drawn from a fixed seed, so the same transcript always
 * produces the same answer. A finding that changed between two runs of the same
 * input would be indistinguishable from a finding about the meeting.
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
 * Random re-splits each figure is measured against, and where the line is
 * drawn among them.
 *
 * 99 draws put the 95th percentile between two of them rather than on one, and
 * cost a few milliseconds over vectors already in memory. The percentile is the
 * usual one, and it means what it says here: nineteen of twenty ways of cutting
 * this person's own statements in half produce less movement than the clock
 * did.
 */
export const NULL_DRAWS = 99
export const NULL_PERCENTILE = 0.95

/** How far a speaker's second half sat from their first. */
export interface SpeakerMove {
  speaker: string
  /** Mapped statements before and after the split. */
  early: number
  late: number
  /**
   * Distance between the two halves' centres, over the typical distance a
   * random re-split of the same statements produces. 1 is what chance gives.
   */
  ratio: number
  /** Further apart than `NULL_PERCENTILE` of random re-splits. */
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

/** Whether the meeting's statements approached what it landed on, or left it. */
export interface ConvergenceTrend {
  /**
   * Rank correlation between when something was said and how far it sat from
   * the landing point. Negative means later statements were closer.
   */
  r: number
  /** Statements compared. */
  n: number
  /**
   * `toward` and `away` are only used when the correlation beat
   * `NULL_PERCENTILE` of the same gaps shuffled into a different order.
   */
  direction: 'toward' | 'away' | 'none'
}

/** Below this, a correlation is a shape in six points rather than a trend. */
export const MIN_STATEMENTS_FOR_TREND = 8

/** Pearson correlation of two equal-length series. */
function correlation(xs: number[], ys: number[]): number {
  const n = xs.length
  if (n < 2) return 0
  const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length
  const mx = mean(xs)
  const my = mean(ys)
  let sxy = 0
  let sxx = 0
  let syy = 0
  for (let i = 0; i < n; i += 1) {
    const dx = xs[i] - mx
    const dy = ys[i] - my
    sxy += dx * dy
    sxx += dx * dx
    syy += dy * dy
  }
  const denom = Math.sqrt(sxx * syy)
  return denom < 1e-12 ? 0 : sxy / denom
}

/** Ranks, ties averaged, so one outlying distance cannot make a trend. */
function ranks(values: number[]): number[] {
  const order = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v)
  const out = new Array<number>(values.length)
  let i = 0
  while (i < order.length) {
    let j = i
    while (j + 1 < order.length && order[j + 1].v === order[i].v) j += 1
    const rank = (i + j) / 2
    for (let k = i; k <= j; k += 1) out[order[k].i] = rank
    i = j + 1
  }
  return out
}

/**
 * Did the meeting move toward what it landed on, or away from it?
 *
 * Correlates when a statement was said against how far it sat from the landing
 * point, on ranks rather than values: the distances are bunched — in 1536
 * dimensions everything is roughly equally far from everything — so one
 * outlying statement would otherwise set the slope on its own.
 *
 * Judged against the same gaps shuffled into a different order, `NULL_DRAWS`
 * times, exactly as movement between the halves is. A correlation of -0.3 over
 * twenty statements is easy to produce by accident, and a tool that reports
 * "the room converged" from one is worse than one that says nothing.
 */
export function convergenceTrend(
  ordered: string[],
  gap: Record<string, number>,
): ConvergenceTrend | null {
  const gaps = ordered.map((id) => gap[id]).filter((g) => Number.isFinite(g))
  if (gaps.length < MIN_STATEMENTS_FOR_TREND) return null

  const position = gaps.map((_, i) => i)
  const observed = correlation(position, ranks(gaps))

  const random = seeded(SEED + gaps.length)
  let beaten = 0
  for (let k = 0; k < NULL_DRAWS; k += 1) {
    const shuffled = [...gaps]
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    if (Math.abs(correlation(position, ranks(shuffled))) >= Math.abs(observed)) {
      beaten += 1
    }
  }

  const real = beaten <= Math.floor((1 - NULL_PERCENTILE) * NULL_DRAWS)
  return {
    r: observed,
    n: gaps.length,
    direction: !real ? 'none' : observed < 0 ? 'toward' : 'away',
  }
}

/**
 * Lookups for the interface, so a component never walks the arrays itself.
 *
 * Both take a nullable timeline and answer for the untimed case, which is the
 * common one: every caller is a component that has to render the same thing
 * whether or not the transcript had a clock in it.
 */
export function speakerMove(
  timeline: Timeline | null,
  speaker: string,
): SpeakerMove | null {
  return timeline?.moves.find((m) => m.speaker === speaker) ?? null
}

export function pairChange(
  timeline: Timeline | null,
  a: string,
  b: string,
): PairChange | null {
  return (
    timeline?.pairs.find(
      (p) => (p.a === a && p.b === b) || (p.a === b && p.b === a),
    ) ?? null
  )
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

/**
 * A small deterministic generator, so the same transcript always gets the same
 * answer. Nothing here is cryptographic; it needs only to be even and fixed.
 */
function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** The seed. Any fixed value; this one is the year the pipeline was written. */
const SEED = 2026

/**
 * The same statements cut into halves of the same sizes, `NULL_DRAWS` times.
 *
 * This is what "no change" looks like for this particular person: their own
 * range, their own counts, and no relationship to the clock. Every figure
 * reported is read against it.
 */
function randomHalves(
  vectors: Vector[],
  nEarly: number,
): { early: Vector; late: Vector }[] {
  const random = seeded(SEED + vectors.length * 1000 + nEarly)
  const draws: { early: Vector; late: Vector }[] = []

  for (let k = 0; k < NULL_DRAWS; k += 1) {
    const order = vectors.map((_, i) => i)
    for (let i = order.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1))
      ;[order[i], order[j]] = [order[j], order[i]]
    }
    const early = centroid(order.slice(0, nEarly).map((i) => vectors[i]))
    const late = centroid(order.slice(nEarly).map((i) => vectors[i]))
    if (early && late) draws.push({ early, late })
  }
  return draws
}

/** The value at `NULL_PERCENTILE` of a set of draws. */
function percentile(values: number[]): number {
  if (values.length === 0) return Infinity
  const sorted = [...values].sort((a, b) => a - b)
  const at = Math.min(
    sorted.length - 1,
    Math.floor(NULL_PERCENTILE * sorted.length),
  )
  return sorted[at]
}

/** The middle value of a set of draws, used as the scale a figure is read on. */
function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2
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
  const halves = new Map<
    string,
    { early: Vector; late: Vector; draws: { early: Vector; late: Vector }[] }
  >()

  for (const [speaker, { early, late }] of bySpeaker) {
    if (
      early.length < MIN_STATEMENTS_PER_HALF ||
      late.length < MIN_STATEMENTS_PER_HALF
    ) {
      continue
    }
    const earlyCentre = centroid(early)
    const lateCentre = centroid(late)
    if (!earlyCentre || !lateCentre) continue

    const draws = randomHalves([...early, ...late], early.length)
    const nullShifts = draws.map((d) => distance(d.early, d.late))
    const typical = median(nullShifts)
    if (typical < 1e-9) continue

    const shift = distance(earlyCentre, lateCentre)
    moves.push({
      speaker,
      early: early.length,
      late: late.length,
      ratio: shift / typical,
      moved: shift > percentile(nullShifts),
    })
    halves.set(speaker, { early: earlyCentre, late: lateCentre, draws })
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

      // The same question asked of the gap: how much do these two people's
      // halves drift apart or together when the clock is taken away? A change
      // the shuffles produce just as often is not a change.
      //
      // It has to be measured rather than derived. A half-centroid moves a long
      // way in 1536 dimensions while the distance between two of them barely
      // changes, since only the component along the line between them counts —
      // so a threshold taken from how far the centres move rejects everything.
      const draws = Math.min(a.draws.length, b.draws.length)
      const nullDeltas: number[] = []
      for (let k = 0; k < draws; k += 1) {
        nullDeltas.push(
          Math.abs(
            distance(a.draws[k].late, b.draws[k].late) -
              distance(a.draws[k].early, b.draws[k].early),
          ),
        )
      }

      const delta = lateGap - earlyGap
      const noise = percentile(nullDeltas)
      pairs.push({
        a: names[i],
        b: names[j],
        earlyGap,
        lateGap,
        ratio: lateGap / earlyGap,
        direction:
          Math.abs(delta) <= noise ? 'same' : delta < 0 ? 'closer' : 'apart',
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
