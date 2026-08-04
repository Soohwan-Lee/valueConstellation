import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  containsAny,
  mapResolution,
  regionPath,
  regionRings,
  ringsArea,
  type Point,
} from './blob.ts'

/**
 * The property that matters is coverage: a region that leaves one of the
 * speaker's own statements outside it is drawing a claim about where they stood
 * that the data does not support.
 *
 * The second property is that the region separates when the statements do. That
 * is the whole reason for not using an ellipse, so a shape that always comes
 * back as one connected blob would have failed at the thing it was built for.
 */

/** Deterministic pseudo-random, so a failure is reproducible. */
function lcg(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

function ringsFor(points: Point[], floor = 12) {
  const { reach } = mapResolution([points], floor)
  return regionRings(points, reach)
}

test('every statement is inside its own region', () => {
  const rand = lcg(11)
  for (let trial = 0; trial < 40; trial += 1) {
    const n = 3 + Math.floor(rand() * 24)
    const points: Point[] = Array.from({ length: n }, () => [
      rand() * 800,
      rand() * 600,
    ])
    const rings = ringsFor(points)
    for (const p of points) {
      assert.ok(
        containsAny(rings, p),
        `trial ${trial}: statement at ${p} fell outside its region`,
      )
    }
  }
})

test('coverage holds when the statements are nearly collinear', () => {
  // A degenerate arrangement the grid could miss between samples.
  const points: Point[] = Array.from({ length: 9 }, (_, i) => [
    100 + i * 37,
    300 + i * 0.4,
  ])
  const rings = ringsFor(points)
  for (const p of points) assert.ok(containsAny(rings, p))
})

test('two groups far apart draw as two shapes, not one', () => {
  // The case an ellipse gets wrong: one fat oval spanning ground nobody took.
  const left: Point[] = [
    [100, 300],
    [118, 288],
    [96, 316],
    [124, 312],
  ]
  const right: Point[] = [
    [600, 300],
    [618, 306],
    [592, 288],
    [612, 320],
  ]
  const points = [...left, ...right]
  const rings = ringsFor(points)

  assert.equal(rings.length, 2, 'two separated groups should draw two rings')
  for (const p of points) assert.ok(containsAny(rings, p))
  assert.ok(
    !containsAny(rings, [350, 300]),
    'the empty ground between the groups is not claimed',
  )
})

test('statements at the typical spacing merge into one shape', () => {
  // Evenly spaced along a line: every gap is the typical gap, so the region has
  // to hold together. This is the other half of the promise the reach makes.
  const points: Point[] = Array.from({ length: 6 }, (_, i) => [
    100 + i * 40,
    300,
  ])
  const rings = ringsFor(points)
  assert.equal(rings.length, 1)
  for (const p of points) assert.ok(containsAny(rings, p))
})

test('the resolution is the typical neighbour gap, and says when there is none', () => {
  const evenlySpaced: Point[] = [
    [0, 0],
    [40, 0],
    [80, 0],
    [120, 0],
  ]
  const measured = mapResolution([evenlySpaced], 5)
  assert.equal(measured.reach, 40)
  assert.equal(measured.provisional, false)

  // One outlier must not move the scale for the whole map, which is why this
  // is a median rather than a mean.
  const withOutlier: Point[] = [...evenlySpaced, [9000, 0]]
  assert.equal(mapResolution([withOutlier], 5).reach, 40)

  // Too few statements to take a median of anything.
  const pair = mapResolution(
    [
      [
        [0, 0],
        [400, 0],
      ],
    ],
    12,
  )
  assert.equal(pair.reach, 12)
  assert.equal(pair.provisional, true)

  const alone = mapResolution([[[5, 5]]], 12)
  assert.equal(alone.reach, 12)
  assert.equal(alone.provisional, true)
})

test('the resolution ignores how close two different people sat', () => {
  // Two speakers whose own statements are 100 apart, but who each have one
  // statement almost on top of one of the other's. Measured over every point on
  // the map those near-coincident pairs dominate the median and the resolution
  // collapses; measured within each speaker, they are irrelevant.
  const a: Point[] = [
    [0, 0],
    [100, 0],
    [200, 0],
    [300, 0],
  ]
  const b: Point[] = [
    [2, 6],
    [102, 6],
    [202, 6],
    [302, 6],
  ]
  const withinSpeaker = mapResolution([a, b], 5)
  assert.equal(withinSpeaker.reach, 100)

  // The same points pooled as one group, for contrast.
  const acrossMap = mapResolution([[...a, ...b]], 5)
  assert.ok(
    acrossMap.reach < 10,
    'sanity: pooling everybody together does collapse the figure',
  )
})

test('a lone statement draws a disk of exactly the reach', () => {
  const rings = regionRings([[200, 200]], 30)
  assert.equal(rings.length, 1)
  const radii = rings[0].map(([x, y]) => Math.hypot(x - 200, y - 200))
  for (const r of radii) {
    assert.ok(
      Math.abs(r - 30) < 1.5,
      `outline sits at ${r.toFixed(2)} rather than at the reach of 30`,
    )
  }
})

test('nothing to draw yields nothing, not a stray shape', () => {
  assert.deepEqual(regionRings([], 20), [])
  assert.deepEqual(regionRings([[1, 1]], 0), [])
  assert.equal(regionPath([]), '')
})

test('non-finite coordinates are skipped, not propagated', () => {
  const points: Point[] = [
    [100, 100],
    [Number.NaN, 40],
    [140, 130],
    [120, 160],
  ]
  const rings = ringsFor(points)
  const d = regionPath(rings)
  assert.ok(!/NaN|Infinity/.test(d))
  assert.ok(containsAny(rings, [100, 100]))
  assert.ok(containsAny(rings, [140, 130]))
})

test('the path closes every ring and stays finite', () => {
  const points: Point[] = [
    [100, 100],
    [160, 120],
    [130, 170],
    [400, 400],
    [440, 420],
    [410, 460],
  ]
  const rings = ringsFor(points)
  const d = regionPath(rings)
  assert.equal(d.match(/M/g)?.length, rings.length)
  assert.equal(d.match(/Z/g)?.length, rings.length)
  assert.ok(!/NaN|Infinity/.test(d))
  assert.ok(ringsArea(rings) > 0)
})
