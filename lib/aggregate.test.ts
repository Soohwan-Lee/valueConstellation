import { test } from 'node:test'
import assert from 'node:assert/strict'

import { applyPca, classicalMds, fitPca } from './project.ts'
import {
  aggregateAndProject,
  attributionVerdict,
  centroid,
  covarianceEllipse,
  MIN_STATEMENTS_FOR_ATTRIBUTION,
  speakerAttribution,
  speakerSeparation,
} from './aggregate.ts'
import type { Utterance } from './types.ts'

/** Deterministic PRNG so these tests never flake. */
/** A random unit vector, for building synthetic embedding clouds. */
function randomUnit(dim: number, r: () => number): number[] {
  const v = Array.from({ length: dim }, () => r() - 0.5)
  const len = Math.hypot(...v) || 1
  return v.map((x) => x / len)
}

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
  // Measured in embedding space, so these are vectors rather than coordinates.
  const cloud = (cx: number, n: number, r: () => number) =>
    Array.from({ length: n }, () => [cx + (r() - 0.5) * 2, (r() - 0.5) * 2])

  const r = rng(3)
  const near = new Map([
    ['A', cloud(0, 20, r)],
    ['B', cloud(0.1, 20, r)],
  ])
  const nearCentroids = new Map([
    ['A', [0, 0]],
    ['B', [0.1, 0]],
  ])
  const low = speakerSeparation(near, nearCentroids)
  assert.ok(low !== null && low < 1, `expected < 1, got ${low}`)

  const far = new Map([
    ['A', cloud(0, 20, r)],
    ['B', cloud(10, 20, r)],
  ])
  const farCentroids = new Map([
    ['A', [0, 0]],
    ['B', [10, 0]],
  ])
  const high = speakerSeparation(far, farCentroids)
  assert.ok(high !== null && high > 1, `expected > 1, got ${high}`)
})

test('attribution reports how much it had to work with', () => {
  // The figure alone cannot distinguish "these people did not differ" from
  // "there was not enough of them to tell", and those need opposite advice, so
  // the sample size travels with it.
  const r = rng(11)
  const cloud = (cx: number, n: number) =>
    Array.from({ length: n }, () => [cx + (r() - 0.5) * 0.4, (r() - 0.5) * 0.4])

  const thin = speakerAttribution(
    new Map([
      ['A', cloud(0, 3)],
      ['B', cloud(5, 3)],
      ['C', cloud(10, 3)],
    ]),
  )
  assert.ok(thin)
  assert.equal(thin.perSpeaker, 3)
  assert.ok(thin.perSpeaker < MIN_STATEMENTS_FOR_ATTRIBUTION)
  assert.equal(thin.chance, 1 / 3)

  // The median, not the mean, so one talkative participant cannot vouch for a
  // room where nobody else said enough to be placed.
  const lopsided = speakerAttribution(
    new Map([
      ['A', cloud(0, 40)],
      ['B', cloud(5, 3)],
      ['C', cloud(10, 2)],
    ]),
  )
  assert.ok(lopsided)
  assert.equal(lopsided.perSpeaker, 3)
})

test('attribution scores separated speakers and rejects overlapping ones', () => {
  // Built on the unit sphere, because a centroid here is a mean *direction* —
  // every vector is normalised before averaging, which is right for text
  // embeddings and makes a cloud centred on the origin meaningless.
  const r = rng(12)
  const around = (base: number[], n: number, spread: number) =>
    Array.from({ length: n }, () => {
      const noise = randomUnit(base.length, r)
      return base.map((x, i) => x + noise[i] * spread)
    })

  const [a, b] = [randomUnit(24, r), randomUnit(24, r)]
  const apart = speakerAttribution(
    new Map([
      ['A', around(a, 12, 0.2)],
      ['B', around(b, 12, 0.2)],
    ]),
  )
  assert.ok(apart && apart.share > 0.9, `expected near 1, got ${apart?.share}`)

  // One cloud split arbitrarily between two names: nothing distinguishes them,
  // so the score must land near chance rather than near 1. This is the failure
  // the `mixed` example exists to show, in miniature.
  const shared = randomUnit(24, r)
  const merged = speakerAttribution(
    new Map([
      ['A', around(shared, 20, 1.4)],
      ['B', around(shared, 20, 1.4)],
    ]),
  )
  assert.ok(
    merged && merged.share < 0.75,
    `expected near chance, got ${merged?.share}`,
  )
})

test('separation does not change when the layout does', () => {
  // The whole point of measuring it before the projection: a layout chosen to
  // show people apart must not be able to report that it succeeded.
  const r = rng(11)
  const vectors = Array.from({ length: 24 }, () => randomUnit(16, r))
  const utterances = vectors.map((_, i) => claim(i % 3 === 0 ? 'A' : i % 3 === 1 ? 'B' : 'C', i))

  const figures = (['people', 'pca', 'mds'] as const).map(
    (method) => aggregateAndProject({ utterances, vectors, method }).separation,
  )
  assert.ok(figures[0] !== null)
  for (const f of figures) {
    assert.ok(
      Math.abs((f ?? 0) - (figures[0] ?? 0)) < 1e-9,
      `layouts disagree on separation: ${figures.join(', ')}`,
    )
  }
})

test('the people layout puts more of the between-speaker difference on screen', () => {
  const r = rng(5)
  // Three speakers, each clustered around their own direction, plus noise that
  // dominates the total variance — the situation plain PCA handles badly.
  const base = ['A', 'B', 'C'].map(() => randomUnit(24, r))
  const vectors: number[][] = []
  const utterances = []
  for (let s = 0; s < 3; s += 1) {
    for (let k = 0; k < 10; k += 1) {
      vectors.push(base[s].map((x: number) => x + (r() - 0.5) * 1.4))
      utterances.push(claim(['A', 'B', 'C'][s], s * 10 + k))
    }
  }

  const people = aggregateAndProject({ utterances, vectors, method: 'people' })
  const pca = aggregateAndProject({ utterances, vectors, method: 'pca' })

  // Separation as drawn: how far the centroids sit apart relative to the
  // scatter, measured on the finished coordinates of each layout.
  const drawn = (out: ReturnType<typeof aggregateAndProject>) => {
    const within =
      out.projectedUtterances.reduce((sum, u) => {
        const s = out.speakers.find((p) => p.speaker === u.speaker)!
        return sum + Math.hypot(u.x - s.x, u.y - s.y)
      }, 0) / out.projectedUtterances.length
    let between = 0
    let pairs = 0
    for (let i = 0; i < out.speakers.length; i += 1) {
      for (let j = i + 1; j < out.speakers.length; j += 1) {
        between += Math.hypot(
          out.speakers[i].x - out.speakers[j].x,
          out.speakers[i].y - out.speakers[j].y,
        )
        pairs += 1
      }
    }
    return between / pairs / within
  }

  assert.ok(
    drawn(people) > drawn(pca),
    `people ${drawn(people).toFixed(2)} should beat pca ${drawn(pca).toFixed(2)}`,
  )
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

test('two speakers can reach a clear verdict', () => {
  // With two participants chance is 50%, so "twice chance" is a perfect score
  // and `strong` was unreachable however cleanly the meeting split. Observed
  // on the `drift` example: 87% against 50%, two people arguing from two
  // different kinds of reason for the whole meeting, reported as weak.
  const enough = MIN_STATEMENTS_FOR_ATTRIBUTION
  assert.equal(
    attributionVerdict({
      correct: 87,
      total: 100,
      share: 0.87,
      chance: 0.5,
      perSpeaker: enough,
    }),
    'strong',
  )
  // Still graded, though: a coin toss with two speakers is not a finding.
  assert.equal(
    attributionVerdict({
      correct: 55,
      total: 100,
      share: 0.55,
      chance: 0.5,
      perSpeaker: enough,
    }),
    'none',
  )
  // And the doubling rule survives where doubling is attainable: four
  // participants, 60% against 25%, is the shape the method exists for.
  assert.equal(
    attributionVerdict({
      correct: 60,
      total: 100,
      share: 0.6,
      chance: 0.25,
      perSpeaker: enough,
    }),
    'strong',
  )
  assert.equal(
    attributionVerdict({
      correct: 5,
      total: 100,
      share: 0.05,
      chance: 0.33,
      perSpeaker: enough,
    }),
    'none',
  )
})

test('a good score outranks a thin transcript, a bad one does not', () => {
  const thin = MIN_STATEMENTS_FOR_ATTRIBUTION - 1
  // Whether these people differ is established; that the meeting was short
  // does not unestablish it.
  assert.equal(
    attributionVerdict({
      correct: 90,
      total: 100,
      share: 0.9,
      chance: 0.25,
      perSpeaker: thin,
    }),
    'strong',
  )
  // A failure on this little material says nothing about the meeting, so it is
  // reported as too little material rather than as an unfocused agenda.
  assert.equal(
    attributionVerdict({
      correct: 11,
      total: 100,
      share: 0.11,
      chance: 0.33,
      perSpeaker: thin,
    }),
    'thin',
  )
})
