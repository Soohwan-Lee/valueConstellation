/**
 * Aggregating utterances into speaker positions.
 *
 * Two rules govern this file:
 *
 * 1. A speaker's centroid is computed in embedding space and then projected, not
 *    averaged from projected coordinates. For a linear map the two agree; for
 *    anything else they do not, and the speaker's position would silently depend
 *    on operation order.
 *
 * 2. A centroid alone is not an answer. Spread and utterance count travel with
 *    it, because a position inferred from two utterances is a weaker claim than
 *    one inferred from forty, and the map must be able to say so.
 */

import type {
  Ellipse,
  ProjectedUtterance,
  ProjectionMethod,
  SpeakerProfile,
  Utterance,
  UtteranceKind,
} from './types.ts'
import {
  applyPca,
  classicalMds,
  fitPca,
  fitPeopleAxes,
  type Vector,
} from './project.ts'

/** Below this many mappable utterances, a centroid is not reported as a position. */
export const MIN_UTTERANCES_FOR_POSITION = 3

/** Kinds that carry a position. Agreement and procedural talk do not. */
const MAPPABLE_KINDS: UtteranceKind[] = ['claim', 'question']

export function isMappable(u: Utterance): boolean {
  return MAPPABLE_KINDS.includes(u.kind)
}

/** Unit-normalises, so the mean is a direction in cosine space. */
function normalize(v: Vector): Vector {
  let sum = 0
  for (const x of v) sum += x * x
  const len = Math.sqrt(sum)
  if (len < 1e-12) return [...v]
  return v.map((x) => x / len)
}

/**
 * Mean of unit vectors, re-normalised.
 *
 * These embeddings are compared by cosine similarity, so the meaningful centre
 * of a set of directions is the normalised mean direction, not the raw average.
 */
export function centroid(vectors: Vector[]): Vector | null {
  // Ignore rows of the wrong length rather than averaging across ragged input,
  // which would silently yield NaN for every dimension.
  const dim = vectors.find((v) => v?.length)?.length ?? 0
  if (dim === 0) return null
  const usable = vectors.filter((v) => v?.length === dim)
  if (usable.length === 0) return null

  const sum = new Array<number>(dim).fill(0)
  for (const v of usable) {
    const unit = normalize(v)
    for (let d = 0; d < dim; d++) sum[d] += unit[d]
  }
  return normalize(sum.map((x) => x / usable.length))
}

/**
 * 1-SD covariance ellipse of a point set.
 *
 * Chosen over a convex hull: a hull is driven by its most extreme member and so
 * overstates the region, whereas this reports the actual dispersion. Returns
 * null below three points, where a covariance estimate is not meaningful.
 */
export function covarianceEllipse(points: [number, number][]): Ellipse | null {
  const n = points.length
  if (n < 3) return null

  let mx = 0
  let my = 0
  for (const [x, y] of points) {
    mx += x
    my += y
  }
  mx /= n
  my /= n

  let sxx = 0
  let syy = 0
  let sxy = 0
  for (const [x, y] of points) {
    const dx = x - mx
    const dy = y - my
    sxx += dx * dx
    syy += dy * dy
    sxy += dx * dy
  }
  // Sample covariance.
  sxx /= n - 1
  syy /= n - 1
  sxy /= n - 1

  if (!Number.isFinite(sxx) || !Number.isFinite(syy)) return null

  // Eigenvalues of the 2x2 covariance matrix.
  const trace = sxx + syy
  const det = sxx * syy - sxy * sxy
  const disc = Math.max(0, (trace * trace) / 4 - det)
  const root = Math.sqrt(disc)
  const l1 = trace / 2 + root
  const l2 = trace / 2 - root

  const rx = Math.sqrt(Math.max(0, l1))
  const ry = Math.sqrt(Math.max(0, l2))

  // Leading eigenvector angle.
  let angle: number
  if (Math.abs(sxy) < 1e-12) {
    angle = sxx >= syy ? 0 : 90
  } else {
    angle = (Math.atan2(l1 - sxx, sxy) * 180) / Math.PI
  }

  return { cx: mx, cy: my, rx, ry, angle }
}

export interface AggregateInput {
  utterances: Utterance[]
  /** Embedding per utterance, index-aligned with `utterances`. */
  vectors: Vector[]
  method: ProjectionMethod
  /** Speakers to exclude from the map (moderators, by default). */
  excludeSpeakers?: string[]
}

export interface AggregateOutput {
  projectedUtterances: ProjectedUtterance[]
  speakers: SpeakerProfile[]
  explainedVariance: number | null
  componentVariance: [number, number] | null
  droppedSpeakers: string[]
  /** Utterances the projection was fitted on. */
  fittedOn: number
  /** Too few points for explained variance to carry information. See ProjectionMeta. */
  saturated: boolean
  /** Between-speaker distance over within-speaker spread. See speakerSeparation. */
  separation: number | null
  /** How often a statement lands nearest its own speaker. See speakerAttribution. */
  attribution: Attribution | null
  /** The layout's own share is arithmetic rather than evidence. */
  fitSaturated: boolean
  /** The second axis fell back to within-speaker variation. See fitPeopleAxes. */
  secondAxisFromResiduals: boolean
}

/**
 * Below this many utterances, a 2D projection reproduces the input almost
 * exactly regardless of structure, so explained variance stops being evidence.
 */
export const SATURATION_THRESHOLD = 6

/**
 * Speakers needed before the people-first layout reports a meaningful share.
 * Three centroids define a plane exactly, so two axes hold all of them by
 * arithmetic rather than by finding structure.
 */
export const MIN_SPEAKERS_FOR_FIT = 3

/**
 * Separation: how far apart speakers sit relative to how far each spreads.
 *
 *   separation = mean pairwise centroid distance / mean within-speaker spread
 *
 * Measured in the original embedding space, never on the projected
 * coordinates. It used to be computed on the finished map, which made it a
 * property of the layout rather than of the meeting — PCA and MDS returned
 * different figures for the same transcript — and would have been worse than
 * useless once a layout existed that is chosen to show people apart. A
 * projection picked to separate people will separate people; only the
 * untouched vectors can say whether there was anything to separate.
 *
 * Below 1, speakers overlap more than they differ, and the centroids are not
 * distinguishing anybody — the layout is being driven by something other than
 * who is talking. Measured on a real 57-minute five-party debate this came out
 * at 0.38: each party discussed every sub-topic, so averaging across all of
 * them returned the topic centroid rather than a position, and all five landed
 * on top of each other.
 *
 * This is a property of the data, not a defect, but a map that hides it invites
 * exactly the misreading the tool exists to prevent.
 */
export function speakerSeparation(
  vectorsBySpeaker: Map<string, Vector[]>,
  centroids: Map<string, Vector>,
): number | null {
  const names = [...centroids.keys()]
  if (names.length < 2) return null

  let withinSum = 0
  let withinCount = 0
  for (const name of names) {
    const centre = centroids.get(name)!
    for (const v of vectorsBySpeaker.get(name) ?? []) {
      withinSum += distance(v, centre)
      withinCount += 1
    }
  }
  if (withinCount === 0) return null
  const within = withinSum / withinCount
  if (within < 1e-9) return null

  let betweenSum = 0
  let betweenCount = 0
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      betweenSum += distance(centroids.get(names[i])!, centroids.get(names[j])!)
      betweenCount += 1
    }
  }
  if (betweenCount === 0) return null

  return betweenSum / betweenCount / within
}

function distance(a: Vector, b: Vector): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i]
    sum += d * d
  }
  return Math.sqrt(sum)
}

/** Below this, speaker centroids are not separating the participants. */
export const MIN_USEFUL_SEPARATION = 1

export interface Attribution {
  /** Statements whose nearest speaker centre is their own speaker's. */
  correct: number
  total: number
  /** correct / total. */
  share: number
  /** What guessing would get: one over the number of speakers. */
  chance: number
}

/**
 * How often a statement is nearest to the centre of the person who said it.
 *
 * The trust figure a reader can actually hold. Separation is a ratio of two
 * distances with no natural scale — is 0.95 good? — and it turns out to sit
 * near 1 for almost any real meeting, because a centroid is an average and
 * averages are closer together than the things they average. This is bounded,
 * has an obvious floor, and answers the question directly: if the map handed
 * you a statement with the name torn off, how often would its position give the
 * name back?
 *
 * Leave-one-out, because a statement that helped build its own speaker's centre
 * is drawn toward it: including it inflates the figure by exactly the amount
 * the statement contributed, and worst on the speakers with fewest statements,
 * which are the ones already least reliable.
 *
 * Measured in embedding space like separation, and for the same reason: a
 * layout chosen to show people apart must not be able to grade itself.
 */
export function speakerAttribution(
  vectorsBySpeaker: Map<string, Vector[]>,
): Attribution | null {
  const names = [...vectorsBySpeaker.keys()].filter(
    (n) => (vectorsBySpeaker.get(n) ?? []).length > 0,
  )
  if (names.length < 2) return null

  let correct = 0
  let total = 0

  for (const owner of names) {
    const own = vectorsBySpeaker.get(owner)!
    for (let i = 0; i < own.length; i += 1) {
      // The owner's centre without this statement. With only one statement
      // there is no centre left to compare against, so it is not scored.
      const rest = own.filter((_, k) => k !== i)
      if (rest.length === 0) continue
      const ownCentre = centroid(rest)
      if (!ownCentre) continue

      let best = distance(own[i], ownCentre)
      let bestIsOwn = true
      for (const other of names) {
        if (other === owner) continue
        const centre = centroid(vectorsBySpeaker.get(other)!)
        if (!centre) continue
        const d = distance(own[i], centre)
        if (d < best) {
          best = d
          bestIsOwn = false
        }
      }
      total += 1
      if (bestIsOwn) correct += 1
    }
  }

  if (total === 0) return null
  return {
    correct,
    total,
    share: correct / total,
    chance: 1 / names.length,
  }
}

/**
 * Projects utterances and speaker centroids into one shared 2D space.
 *
 * For PCA the model is fitted on utterances and applied to centroids. For MDS,
 * which has no out-of-sample extension, centroids are appended to the input
 * matrix so they are embedded jointly.
 */
export function aggregateAndProject(input: AggregateInput): AggregateOutput {
  const { utterances, vectors, method } = input
  const excluded = new Set(input.excludeSpeakers ?? [])

  // Index of every utterance that both carries a position and is not excluded.
  //
  // The length check matters: an empty array is truthy in JS, so a missing
  // embedding would pass a bare existence check and then poison the column-wise
  // mean with NaN — corrupting every coordinate on the map, not just its own.
  const dim = vectors.find((v) => v?.length)?.length ?? 0
  const mappableIdx: number[] = []
  utterances.forEach((u, i) => {
    if (
      isMappable(u) &&
      !excluded.has(u.speaker) &&
      vectors[i]?.length === dim &&
      dim > 0
    ) {
      mappableIdx.push(i)
    }
  })

  const emptyResult: AggregateOutput = {
    projectedUtterances: [],
    speakers: [],
    explainedVariance: null,
    componentVariance: null,
    droppedSpeakers: [],
    fittedOn: 0,
    saturated: false,
    fitSaturated: false,
    separation: null,
    attribution: null,
    secondAxisFromResiduals: false,
  }
  if (mappableIdx.length < 2) return emptyResult

  // Group by speaker, preserving first-appearance order for colour assignment.
  const bySpeaker = new Map<string, number[]>()
  const speakerOrder: string[] = []
  for (const i of mappableIdx) {
    const s = utterances[i].speaker
    if (!bySpeaker.has(s)) {
      bySpeaker.set(s, [])
      speakerOrder.push(s)
    }
    bySpeaker.get(s)!.push(i)
  }

  // Centroids in embedding space — rule 1 above.
  const centroids = new Map<string, Vector>()
  for (const s of speakerOrder) {
    const c = centroid(bySpeaker.get(s)!.map((i) => vectors[i]))
    if (c) centroids.set(s, c)
  }

  const utteranceVectors = mappableIdx.map((i) => normalize(vectors[i]))

  // Unit vectors grouped by who said them, for the separation measurement.
  const vectorsBySpeaker = new Map<string, Vector[]>()
  mappableIdx.forEach((i, k) => {
    const list = vectorsBySpeaker.get(utterances[i].speaker) ?? []
    list.push(utteranceVectors[k])
    vectorsBySpeaker.set(utterances[i].speaker, list)
  })
  const centroidSpeakers = speakerOrder.filter((s) => centroids.has(s))

  let utterancePoints: [number, number][] = []
  let centroidPoints: [number, number][] = []
  let explainedVariance: number | null = null
  let componentVariance: [number, number] | null = null
  let secondAxisFromResiduals = false

  if (method === 'people') {
    // Fitted on the speaker centroids, so the plane is the one that shows the
    // participants apart. See fitPeopleAxes for why this cannot flatter itself.
    const residuals = mappableIdx.map((i, k) => {
      const centre = centroids.get(utterances[i].speaker)
      const v = utteranceVectors[k]
      return centre ? v.map((x, d) => x - centre[d]) : v
    })
    const model = fitPeopleAxes(
      centroidSpeakers.map((s) => centroids.get(s)!),
      centroidSpeakers.map((s) => bySpeaker.get(s)!.length),
      residuals,
    )
    if (!model) return emptyResult
    utterancePoints = utteranceVectors.map((v) => applyPca(model, v))
    centroidPoints = centroidSpeakers.map((s) => applyPca(model, centroids.get(s)!))
    explainedVariance = model.explainedVariance
    componentVariance = model.componentVariance
    secondAxisFromResiduals = model.secondAxisFromResiduals
  } else if (method === 'pca') {
    const model = fitPca(utteranceVectors)
    if (!model) return emptyResult
    utterancePoints = utteranceVectors.map((v) => applyPca(model, v))
    centroidPoints = centroidSpeakers.map((s) => applyPca(model, centroids.get(s)!))
    explainedVariance = model.explainedVariance
    componentVariance = model.componentVariance
  } else {
    // Embed utterances and centroids together; MDS cannot project new points.
    const combined = [...utteranceVectors, ...centroidSpeakers.map((s) => centroids.get(s)!)]
    const coords = classicalMds(combined)
    if (!coords) return emptyResult
    utterancePoints = coords.slice(0, utteranceVectors.length)
    centroidPoints = coords.slice(utteranceVectors.length)
  }

  const projectedUtterances: ProjectedUtterance[] = mappableIdx.map((idx, k) => ({
    ...utterances[idx],
    x: utterancePoints[k][0],
    y: utterancePoints[k][1],
  }))

  // Excluded-kind counts per speaker, so the UI can show what was left off.
  const excludedCounts = new Map<string, number>()
  for (const u of utterances) {
    if (!isMappable(u) && !excluded.has(u.speaker)) {
      excludedCounts.set(u.speaker, (excludedCounts.get(u.speaker) ?? 0) + 1)
    }
  }

  const pointsBySpeaker = new Map<string, [number, number][]>()
  projectedUtterances.forEach((u) => {
    const list = pointsBySpeaker.get(u.speaker) ?? []
    list.push([u.x, u.y])
    pointsBySpeaker.set(u.speaker, list)
  })

  const speakers: SpeakerProfile[] = centroidSpeakers.map((s, k) => {
    const n = bySpeaker.get(s)!.length
    return {
      speaker: s,
      colorIndex: k,
      n,
      nExcluded: excludedCounts.get(s) ?? 0,
      x: centroidPoints[k][0],
      y: centroidPoints[k][1],
      ellipse: covarianceEllipse(pointsBySpeaker.get(s) ?? []),
      underdetermined: n < MIN_UTTERANCES_FOR_POSITION,
    }
  })

  // Speakers who spoke but contributed nothing mappable.
  const allSpeakers = new Set(utterances.map((u) => u.speaker))
  const droppedSpeakers = [...allSpeakers].filter(
    (s) => !excluded.has(s) && !centroids.has(s),
  )

  return {
    projectedUtterances,
    speakers,
    explainedVariance,
    componentVariance,
    droppedSpeakers,
    fittedOn: mappableIdx.length,
    saturated: mappableIdx.length < SATURATION_THRESHOLD,
    // The `people` layout is fitted to the centroids, so its share is
    // arithmetic below four of them: three points define a plane exactly.
    fitSaturated:
      method === 'people'
        ? centroidSpeakers.length <= MIN_SPEAKERS_FOR_FIT
        : mappableIdx.length < SATURATION_THRESHOLD,
    separation: speakerSeparation(vectorsBySpeaker, centroids),
    attribution: speakerAttribution(vectorsBySpeaker),
    secondAxisFromResiduals,
  }
}
