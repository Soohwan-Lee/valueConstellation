import { test } from 'node:test'
import assert from 'node:assert/strict'

import { measureGaps, verifyConsensus } from './consensus.ts'
import { verifyExchanges, type Exchange } from './exchanges.ts'
import type { Utterance } from './types.ts'

/**
 * Both readings here are written by a model and both are placed on the map, so
 * the only thing standing between a plausible sentence and a coordinate nobody
 * can check is verification. These pin what it refuses.
 */

const say = (id: string, speaker: string, index: number): Utterance => ({
  id,
  speaker,
  text: `${speaker} ${id}`,
  kind: 'claim',
  index,
})

const meeting = [
  say('u0', 'Dave', 0),
  say('u1', 'Rosa', 1),
  say('u2', 'Dave', 2),
  say('u3', 'Rosa', 3),
]

const read = (over: Partial<Parameters<typeof verifyConsensus>[0]> = {}) => ({
  reached: true,
  statement: { ko: '목요일 출시는 보류한다.', en: 'Thursday is held.' },
  open: { ko: '새 날짜', en: 'The new date' },
  anchors: ['u0', 'u1'],
  ...over,
})

test('a landing point needs statements from two people behind it', () => {
  assert.equal(verifyConsensus(read(), meeting).reached, true)

  // One speaker's statements are that speaker's position with a different
  // label on it, however agreed the sentence sounds.
  assert.equal(verifyConsensus(read({ anchors: ['u0', 'u2'] }), meeting).reached, false)
  assert.equal(verifyConsensus(read({ anchors: [] }), meeting).reached, false)
})

test('anchors that point nowhere are dropped, and take the claim with them', () => {
  // A model naming a statement id that does not exist is the failure this is
  // built against: the sentence still reads well and nothing can be checked.
  const ghost = verifyConsensus(read({ anchors: ['u0', 'u99'] }), meeting)
  assert.equal(ghost.reached, false)
  assert.deepEqual(ghost.anchors, [])

  const deduped = verifyConsensus(read({ anchors: ['u0', 'u0', 'u1'] }), meeting)
  assert.deepEqual(deduped.anchors, ['u0', 'u1'])
})

test('no agreement means no anchors, whatever was returned', () => {
  const none = verifyConsensus(read({ reached: false }), meeting)
  assert.equal(none.reached, false)
  assert.deepEqual(none.anchors, [])

  // An empty sentence is not a landing point either, however true `reached` is.
  assert.equal(
    verifyConsensus(read({ statement: { ko: '  ', en: '' } }), meeting).reached,
    false,
  )
})

test('gaps come back as shares of the furthest statement', () => {
  const basis = [1, 0, 0]
  const gap = measureGaps(
    [
      { id: 'near', vector: [1, 0.1, 0] },
      { id: 'far', vector: [1, 1, 0] },
      { id: 'ragged', vector: [1, 1] },
    ],
    basis,
  )
  assert.equal(gap.far, 1)
  assert.ok(gap.near > 0 && gap.near < 1)
  // A vector of the wrong length is skipped rather than averaged into nonsense.
  assert.equal('ragged' in gap, false)
})

test('every statement at the landing point yields no gaps at all', () => {
  // Dividing by the widest gap is division by zero when there is no gap. The
  // view has to receive nothing rather than NaN dressed as a distance.
  assert.deepEqual(
    measureGaps([{ id: 'a', vector: [1, 0] }, { id: 'b', vector: [1, 0] }], [1, 0]),
    {},
  )
})

const edge = (from: string, to: string): Exchange => ({
  from,
  to,
  kind: 'challenges',
  note: { ko: '반박', en: 'disputes it' },
})

test('an exchange must run backwards in time, between two people', () => {
  const { kept, dropped } = verifyExchanges(
    [
      edge('u2', 'u1'), // Dave answering Rosa: kept
      edge('u1', 'u3'), // forwards in time: a reply to something not yet said
      edge('u2', 'u0'), // Dave answering Dave: a person arguing with themselves
      edge('u3', 'u9'), // a statement nobody made
      edge('u2', 'u1'), // the same edge twice, thickening one line for nothing
    ],
    meeting,
  )
  assert.deepEqual(
    kept.map((e) => `${e.from}->${e.to}`),
    ['u2->u1'],
  )
  assert.equal(dropped, 4)
})
