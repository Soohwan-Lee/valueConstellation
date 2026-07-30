import { test } from 'node:test'
import assert from 'node:assert/strict'

import { applyPca, classicalMds, fitPca } from './project.ts'
import {
  aggregateAndProject,
  centroid,
  covarianceEllipse,
  speakerSeparation,
} from './aggregate.ts'
import type { Utterance } from './types.ts'

/** Deterministic PRNG so these tests never flake. */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    s >>>= 0
    return s / 0xffffffff
  }
}

function claim(speaker: string, index: number): Utterance {
  return { id: `u${index}`, speaker, text: `t${index}`, kind: 'claim', index }
}

test('PCA recovers planted structure', () => {
  const r = rng(42)
  const dim = 64
  const vectors: number[][] = []
  for (let i = 0; i < 40; i++) {
    const v = Array.from({ length: dim }, () => (r() - 0.5) * 0.02)
    v[0] += i < 20 ? 1 : -1
    vectors.push(v)
  }
  const model = fitPca(vectors)
  assert.ok(model)
  assert.ok(model.explainedVariance > 0.9)

  const pts = vectors.map((v) => applyPca(model, v))
  const meanX = (a: [number, number][]) =>
    a.reduce((s, p) => s + p[0], 0) / a.length
  assert.ok(Math.abs(meanX(pts.slice(0, 20)) - meanX(pts.slice(20))) > 1)
})

test('PCA is linear: project(mean) equals mean(project)', () => {
  // This identity is why speaker centroids are computed in embedding space and
  // then projected. Under a non-linear map the two disagree and a speaker's
  // position would depend on which operation ran first.
  const r = rng(7)
  const dim = 32
  const vectors = Array.from({ length: 25 }, () =>
    Array.from({ length: dim }, () => r() - 0.5),
  )
  const model = fitPca(vectors)
  assert.ok(model)

  const unit = (v: number[]) => {
    const len = Math.hypot(...v)
    return v.map((x) => x / len)
  }
  const subset = vectors.slice(0, 8).map(unit)

  const arithMean = Array.from({ length: dim }, (_, d) =>
    subset.reduce((s, v) => s + v[d], 0) / subset.length,
  )
  const projOfMean = applyPca(model, arithMean)

  const projections = subset.map((v) => applyPca(model, v))
  const meanOfProj = [
    projections.reduce((s, p) => s + p[0], 0) / projections.length,
    projections.reduce((s, p) => s + p[1], 0) / projections.length,
  ]

  assert.ok(Math.hypot(projOfMean[0] - meanOfProj[0], projOfMean[1] - meanOfProj[1]) < 1e-9)
})

test('fitPca rejects non-finite input rather than emitting a NaN model', () => {
  // `NaN < 1e-12` is false, so a magnitude-only guard let NaN through and every
  // coordinate on the map serialised as null.
  assert.equal(fitPca([[NaN, 1, 0], [0, 1, 0], [1, 0, 0]]), null)
  assert.equal(fitPca([]), null)
  assert.equal(fitPca([[1, 2]]), null)
})

test('centroid ignores ragged rows', () => {
  const c = centroid([[1, 0, 0], [0, 1, 0], []])
  assert.ok(c)
  assert.ok(c.every(Number.isFinite))
  assert.equal(centroid([]), null)
  assert.equal(centroid([[]]), null)
})

test('covariance ellipse reports orientation and needs three points', () => {
  const r = rng(99)
  const pts: [number, number][] = Array.from(
    { length: 300 },
    () => [(r() - 0.5) * 8, (r() - 0.5) * 2] as [number, number],
  )
  const e = covarianceEllipse(pts)
  assert.ok(e)
  assert.ok(e.rx > e.ry * 2, 'major axis follows the wider spread')
  const flat = Math.min(Math.abs(e.angle), Math.abs(Math.abs(e.angle) - 180))
  assert.ok(flat < 15, `expected near-horizontal, got ${e.angle}`)

  assert.equal(covarianceEllipse([[0, 0], [1, 1]]), null)
})

test('classical MDS separates distinct clusters', () => {
  const r = rng(5)
  const dim = 48
  const vectors: number[][] = []
  for (let i = 0; i < 30; i++) {
    const v = Array.from({ length: dim }, () => (r() - 0.5) * 0.05)
    v[i < 15 ? 0 : 3] += 1
    vectors.push(v)
  }
  const coords = classicalMds(vectors)
  assert.ok(coords)
  assert.ok(coords.every((p) => Number.isFinite(p[0]) && Number.isFinite(p[1])))

  const mean = (a: [number, number][]) =>
    [a.reduce((s, p) => s + p[0], 0) / a.length, a.reduce((s, p) => s + p[1], 0) / a.length] as const
  const [ax, ay] = mean(coords.slice(0, 15))
  const [bx, by] = mean(coords.slice(15))
  assert.ok(Math.hypot(ax - bx, ay - by) > 0.1)
  assert.equal(classicalMds([[1, 2]]), null)
})

test('each speaker centroid lands nearest its own utterances', () => {
  const r = rng(11)
  const dim = 40
  const utterances: Utterance[] = []
  const vectors: number[][] = []
  let i = 0
  for (const [speaker, axis] of [['A', 0], ['B', 5], ['C', 9]] as [string, number][]) {
    for (let k = 0; k < 6; k++) {
      utterances.push(claim(speaker, i++))
      const v = Array.from({ length: dim }, () => (r() - 0.5) * 0.05)
      v[axis] += 1
      vectors.push(v)
    }
  }

  for (const method of ['pca', 'mds'] as const) {
    const out = aggregateAndProject({ utterances, vectors, method })
    assert.equal(out.speakers.length, 3, method)
    for (const s of out.speakers) {
      const own = out.projectedUtterances.filter((u) => u.speaker === s.speaker)
      const others = out.projectedUtterances.filter((u) => u.speaker !== s.speaker)
      const dist = (list: typeof own) =>
        list.reduce((a, u) => a + Math.hypot(u.x - s.x, u.y - s.y), 0) / list.length
      assert.ok(dist(own) < dist(others), `${method}: ${s.speaker}`)
    }
  }
})

test('a missing embedding does not poison the whole map', () => {
  // An empty array is truthy in JS, so a bare existence check let a missing
  // embedding through and the column-wise mean became NaN in every dimension.
  const utterances = [claim('A', 0), claim('A', 1), claim('B', 2)]
  for (const vectors of [
    [[1, 0, 0], [0, 1, 0], []],
    [[], [0, 1, 0], [1, 0, 0]],
  ]) {
    const out = aggregateAndProject({ utterances, vectors, method: 'pca' })
    assert.ok(out.projectedUtterances.every((u) => Number.isFinite(u.x) && Number.isFinite(u.y)))
    assert.ok(out.speakers.every((s) => Number.isFinite(s.x) && Number.isFinite(s.y)))
    assert.equal(out.projectedUtterances.length, 2)
  }
})

test('assent and procedural talk are excluded but counted', () => {
  const utterances: Utterance[] = [
    claim('A', 0),
    claim('A', 1),
    claim('A', 2),
    { id: 'u3', speaker: 'B', text: '네', kind: 'agreement', index: 3 },
    { id: 'u4', speaker: 'C', text: '다음 안건', kind: 'procedural', index: 4 },
  ]
  const vectors = [[1, 0, 0], [0.9, 0.1, 0], [0.8, 0, 0.2], [0, 1, 0], [0, 0, 1]]
  const out = aggregateAndProject({ utterances, vectors, method: 'pca' })

  assert.deepEqual(out.speakers.map((s) => s.speaker), ['A'])
  // Speakers who only assented have no position, and are named as unplaced.
  assert.deepEqual(out.droppedSpeakers.sort(), ['B', 'C'])
})

test('few utterances are flagged saturated', () => {
  const utterances = [claim('A', 0), claim('A', 1), claim('A', 2), claim('B', 3)]
  const vectors = [[1, 0, 0], [0.9, 0.1, 0], [0.8, 0.2, 0], [0, 1, 0]]
  const out = aggregateAndProject({ utterances, vectors, method: 'pca' })
  // Four points fit two dimensions almost exactly regardless of structure, so
  // explained variance is arithmetic rather than evidence.
  assert.equal(out.saturated, true)
  assert.equal(out.fittedOn, 4)
})

test('separation detects speakers who do not separate', () => {
  const spread = (speaker: string, cx: number, n: number, r: () => number) =>
    Array.from({ length: n }, (_, k) => ({
      ...claim(speaker, k),
      x: cx + (r() - 0.5) * 2,
      y: (r() - 0.5) * 2,
    }))

  const r = rng(3)
  // Overlapping: centroids 0.1 apart, points scattered by +-1.
  const overlapping = [...spread('A', 0, 20, r), ...spread('B', 0.1, 20, r)]
  const overlapProfiles = ['A', 'B'].map((s, i) => ({
    speaker: s,
    colorIndex: i,
    n: 20,
    nExcluded: 0,
    x: i === 0 ? 0 : 0.1,
    y: 0,
    ellipse: null,
    underdetermined: false,
  }))
  const low = speakerSeparation(overlapping, overlapProfiles)
  assert.ok(low !== null && low < 1, `expected < 1, got ${low}`)

  // Distinct: same scatter, centroids 10 apart.
  const distinct = [...spread('A', 0, 20, r), ...spread('B', 10, 20, r)]
  const distinctProfiles = overlapProfiles.map((p, i) => ({
    ...p,
    x: i === 0 ? 0 : 10,
  }))
  const high = speakerSeparation(distinct, distinctProfiles)
  assert.ok(high !== null && high > 1, `expected > 1, got ${high}`)
})

test('degenerate input returns empty rather than throwing', () => {
  assert.deepEqual(
    aggregateAndProject({ utterances: [], vectors: [], method: 'pca' }).speakers,
    [],
  )
  assert.deepEqual(
    aggregateAndProject({
      utterances: [claim('A', 0)],
      vectors: [[1, 0, 0]],
      method: 'pca',
    }).speakers,
    [],
  )
  // Identical vectors have no variance to project.
  const identical = aggregateAndProject({
    utterances: [claim('A', 0), claim('A', 1), claim('A', 2)],
    vectors: [[1, 0], [1, 0], [1, 0]],
    method: 'pca',
  })
  assert.ok(identical.speakers.every((s) => Number.isFinite(s.x)))
})
