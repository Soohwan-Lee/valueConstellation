import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  asShare,
  counterpart,
  meanRadius,
  pairsWith,
  speakerPairs,
  widestGap,
} from './pairs.ts'
import type { SpeakerProfile } from './types.ts'

function speaker(name: string, x: number, y: number, n = 5): SpeakerProfile {
  return {
    speaker: name,
    colorIndex: 0,
    n,
    nExcluded: 0,
    x,
    y,
    ellipse: null,
    underdetermined: n < 3,
  }
}

test('pairs come back widest first, scaled against the widest', () => {
  const pairs = speakerPairs([
    speaker('A', 0, 0),
    speaker('B', 3, 4), // 5 from A
    speaker('C', 0, 10), // 10 from A, and √(9+36)≈6.7 from B
  ])

  assert.equal(pairs.length, 3)
  assert.deepEqual(
    pairs.map((p) => [p.a.speaker, p.b.speaker]),
    [
      ['A', 'C'],
      ['B', 'C'],
      ['A', 'B'],
    ],
  )
  assert.equal(pairs[0].relative, 1)
  assert.equal(pairs[2].relative, 0.5)
})

test('a lone speaker produces no pairs and therefore no unit', () => {
  const pairs = speakerPairs([speaker('A', 1, 1)])
  assert.deepEqual(pairs, [])
  assert.equal(widestGap(pairs), 0)
  // Callers must report nothing rather than divide by it.
  assert.equal(asShare(4, 0), null)
})

test('coincident speakers do not divide by zero', () => {
  const pairs = speakerPairs([speaker('A', 2, 2), speaker('B', 2, 2)])
  assert.equal(pairs[0].distance, 0)
  assert.equal(pairs[0].relative, 0)
  assert.equal(asShare(0, widestGap(pairs)), null)
})

test('pairsWith selects only that speaker, and counterpart returns the other', () => {
  const all = speakerPairs([
    speaker('A', 0, 0),
    speaker('B', 3, 4),
    speaker('C', 0, 10),
  ])
  const mine = pairsWith(all, 'B')
  assert.equal(mine.length, 2)
  assert.deepEqual(
    mine.map((p) => counterpart(p, 'B').speaker).sort(),
    ['A', 'C'],
  )
  assert.deepEqual(pairsWith(all, null), [])
})

test('mean radius is the average distance from the centre', () => {
  const points = [
    { x: 3, y: 0 },
    { x: -3, y: 0 },
    { x: 0, y: 5 },
  ]
  assert.equal(meanRadius(points, { x: 0, y: 0 }), (3 + 3 + 5) / 3)
  assert.equal(meanRadius([], { x: 0, y: 0 }), 0)
})

test('a share is the distance over the unit, and rejects non-finite input', () => {
  assert.equal(asShare(5, 10), 0.5)
  assert.equal(asShare(Number.NaN, 10), null)
})
