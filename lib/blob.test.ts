import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  blobPath,
  blobPolygon,
  contains,
  polygonArea,
  type Point,
} from './blob.ts'

/**
 * The property that matters is coverage: a region that leaves one of the
 * speaker's own statements outside it is drawing a claim about where they
 * stood that the data does not support. Dilation before smoothing exists
 * solely to hold that guarantee, so it is the thing under test.
 */

function centroid(points: Point[]): Point {
  const n = points.length
  return [
    points.reduce((s, p) => s + p[0], 0) / n,
    points.reduce((s, p) => s + p[1], 0) / n,
  ]
}

/** Deterministic pseudo-random, so a failure is reproducible. */
function lcg(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

test('every point is inside its own region', () => {
  const rand = lcg(7)
  for (let trial = 0; trial < 60; trial += 1) {
    const n = 2 + Math.floor(rand() * 25)
    const points: Point[] = Array.from({ length: n }, () => [
      rand() * 800,
      rand() * 600,
    ])
    const polygon = blobPolygon(points, centroid(points), { pad: 12 })
    for (const p of points) {
      assert.ok(
        contains(polygon, p),
        `trial ${trial}: point ${p} fell outside its region`,
      )
    }
  }
})

test('a two-lobed speaker keeps both lobes and the waist between them', () => {
  // Two tight clusters far apart on one axis: the shape an ellipse smooths
  // into a single fat oval spanning ground nobody occupied.
  const left: Point[] = [
    [100, 300],
    [110, 290],
    [95, 312],
  ]
  const right: Point[] = [
    [500, 300],
    [512, 306],
    [495, 292],
  ]
  const points = [...left, ...right]
  const centre = centroid(points)
  const polygon = blobPolygon(points, centre, { pad: 10 })

  for (const p of points) assert.ok(contains(polygon, p))

  // The waist: a point on the axis midway between the lobes is far enough from
  // either cluster that the region should not claim it.
  assert.ok(
    !contains(polygon, [centre[0], centre[1] + 120]),
    'the region reaches well off-axis between two clusters',
  )

  // And it is meaningfully tighter than the bounding oval would be.
  const oval = Math.PI * 210 * 120
  assert.ok(
    polygonArea(polygon) < oval * 0.8,
    'the region is no tighter than an ellipse over the same points',
  )
})

test('a single statement still draws a region', () => {
  const polygon = blobPolygon([[200, 200]], [200, 200], {
    pad: 8,
    minRadius: 14,
  })
  assert.equal(polygon.length, 36)
  assert.ok(contains(polygon, [200, 200]))
  for (const [x, y] of polygon) {
    assert.ok(
      Math.abs(Math.hypot(x - 200, y - 200) - 14) < 0.001,
      'a lone point yields a circle at the floor radius',
    )
  }
})

test('no points at all yields a circle rather than a collapsed shape', () => {
  const polygon = blobPolygon([], [0, 0], { minRadius: 10 })
  assert.equal(polygon.length, 36)
  assert.ok(polygonArea(polygon) > 250)
})

test('non-finite coordinates are skipped, not propagated', () => {
  const points: Point[] = [
    [100, 100],
    [Number.NaN, 40],
    [140, 130],
  ]
  const polygon = blobPolygon(points, [120, 115], { pad: 10 })
  for (const [x, y] of polygon) {
    assert.ok(Number.isFinite(x) && Number.isFinite(y))
  }
  assert.ok(contains(polygon, [100, 100]))
  assert.ok(contains(polygon, [140, 130]))
})

test('the path is closed and starts at the first vertex', () => {
  const polygon = blobPolygon(
    [
      [10, 10],
      [60, 20],
      [30, 70],
    ],
    [33, 33],
  )
  const d = blobPath(polygon)
  assert.match(d, /^M/)
  assert.match(d, /Z$/)
  // One cubic per edge of a closed ring.
  assert.equal(d.match(/C/g)?.length, polygon.length)
  assert.ok(!/NaN|Infinity/.test(d))
})
