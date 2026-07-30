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
} from './types'
import { applyPca, classicalMds, fitPca, type Vector } from './project'

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
  if (vectors.length === 0) return null
  const dim = vectors[0].length
  const sum = new Array<number>(dim).fill(0)
  for (const v of vectors) {
    const unit = normalize(v)
    for (let d = 0; d < dim; d++) sum[d] += unit[d]
  }
  return normalize(sum.map((x) => x / vectors.length))
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
  const mappableIdx: number[] = []
  utterances.forEach((u, i) => {
    if (isMappable(u) && !excluded.has(u.speaker) && vectors[i]) mappableIdx.push(i)
  })

  const emptyResult: AggregateOutput = {
    projectedUtterances: [],
    speakers: [],
    explainedVariance: null,
    componentVariance: null,
    droppedSpeakers: [],
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
  const centroidSpeakers = speakerOrder.filter((s) => centroids.has(s))

  let utterancePoints: [number, number][] = []
  let centroidPoints: [number, number][] = []
  let explainedVariance: number | null = null
  let componentVariance: [number, number] | null = null

  if (method === 'pca') {
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
  }
}
