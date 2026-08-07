import { test } from 'node:test'
import assert from 'node:assert/strict'

import { buildTimeline, clockSeconds, MIN_MOVE_RATIO } from './timeline.ts'
import type { Utterance } from './types.ts'

/**
 * The failure this module exists to avoid is reporting movement in a meeting
 * where nobody moved: split any set of statements in two and the halves differ,
 * so a bare before/after comparison flags everybody. Both directions are pinned
 * — a speaker who changed ground is found, one who alternated between two
 * points all meeting is not.
 */

/** Three directions far apart on the unit sphere. */
const P = [1, 0, 0]
const Q = [0, 1, 0]
const R = [0, 0, 1]

/** A point near `base`, deterministically nudged so no set has zero spread. */
function near(base: number[], k: number): number[] {
  return base.map((x, d) => x + ((k + d) % 3) * 0.04)
}

function pad(n: number): string {
  return `00:${String(n).padStart(2, '0')}`
}

/**
 * Builds a meeting from a per-half description, interleaving the speakers so
 * the median split falls between the halves.
 */
function meeting(
  plan: { speaker: string; early: number[]; late: number[] }[],
  { timeAll = true, per = 4 }: { timeAll?: boolean; per?: number } = {},
): { utterances: Utterance[]; vectors: number[][] } {
  const utterances: Utterance[] = []
  const vectors: number[][] = []
  let clock = 1

  for (const half of ['early', 'late'] as const) {
    for (let k = 0; k < per; k += 1) {
      for (const p of plan) {
        const i = utterances.length
        utterances.push({
          id: `u${i}`,
          speaker: p.speaker,
          text: `${p.speaker} ${half} ${k}`,
          kind: 'claim',
          index: i,
          ...(timeAll || i % 2 === 0 ? { at: pad(clock) } : {}),
        })
        vectors.push(near(p[half], k))
        clock += 1
      }
    }
  }
  return { utterances, vectors }
}

test('no timestamps, no timeline', () => {
  const { utterances, vectors } = meeting(
    [
      { speaker: 'A', early: P, late: Q },
      { speaker: 'B', early: R, late: R },
    ],
    { timeAll: false },
  )
  const untimed = utterances.map(({ at: _at, ...rest }) => rest)
  assert.equal(buildTimeline({ utterances: untimed, vectors }), null)
  // Half of them timed is not enough either: the timed lines are whichever ones
  // a transcription tool was sure about, which is not a sample of the meeting.
  assert.equal(buildTimeline({ utterances, vectors }), null)
})

test('a speaker who changed ground is found; one who alternated is not', () => {
  const { utterances, vectors } = meeting([
    // Argues from P all through the first half, from Q all through the second.
    { speaker: 'Moved', early: P, late: Q },
    // Same two points, but visited in both halves — no drift, just range.
    { speaker: 'Ranged', early: P, late: P },
  ])
  // Give Ranged the alternation its name claims, without changing its counts.
  utterances.forEach((u, i) => {
    if (u.speaker === 'Ranged' && i % 4 === 1) vectors[i] = near(Q, i)
  })

  const timeline = buildTimeline({ utterances, vectors })
  assert.ok(timeline)
  assert.equal(timeline.timed, timeline.total)

  const moved = timeline.moves.find((m) => m.speaker === 'Moved')!
  const ranged = timeline.moves.find((m) => m.speaker === 'Ranged')!
  assert.equal(moved.moved, true)
  assert.equal(ranged.moved, false)
  assert.ok(
    moved.ratio > MIN_MOVE_RATIO && ranged.ratio < MIN_MOVE_RATIO,
    `moved ${moved.ratio.toFixed(2)} vs ranged ${ranged.ratio.toFixed(2)}`,
  )
  // Largest movement first, so the interface can take the head of the list.
  assert.equal(timeline.moves[0].speaker, 'Moved')
})

test('a pair that closed and a pair that did not', () => {
  const { utterances, vectors } = meeting([
    { speaker: 'Fixed', early: P, late: P },
    // Starts on the far side, ends beside Fixed.
    { speaker: 'Approaching', early: Q, late: P },
    { speaker: 'Elsewhere', early: R, late: R },
  ])

  const timeline = buildTimeline({ utterances, vectors })
  assert.ok(timeline)

  const find = (a: string, b: string) =>
    timeline.pairs.find(
      (p) => (p.a === a && p.b === b) || (p.a === b && p.b === a),
    )!

  const closing = find('Fixed', 'Approaching')
  assert.equal(closing.direction, 'closer')
  assert.ok(closing.lateGap < closing.earlyGap)

  // Neither of these two went anywhere, so the gap between them is unchanged —
  // and saying so is the point. A tool that only ever reports movement leaves a
  // reader to assume it found some.
  assert.equal(find('Fixed', 'Elsewhere').direction, 'same')
})

test('a speaker with too few statements in one half is left out', () => {
  const { utterances, vectors } = meeting([
    { speaker: 'A', early: P, late: Q },
    { speaker: 'B', early: R, late: R },
  ])
  // B arrives late: two statements before the split, the rest after.
  const trimmed: Utterance[] = []
  const kept: number[][] = []
  let seenEarlyB = 0
  utterances.forEach((u, i) => {
    if (u.speaker === 'B' && u.text.includes('early') && seenEarlyB++ < 2) return
    trimmed.push(u)
    kept.push(vectors[i])
  })

  const timeline = buildTimeline({ utterances: trimmed, vectors: kept })
  assert.ok(timeline)
  assert.deepEqual(timeline.moves.map((m) => m.speaker), ['A'])
  // No pair either: a comparison needs both halves of both people.
  assert.deepEqual(timeline.pairs, [])
})

test('clock times are read as mm:ss and hh:mm:ss', () => {
  assert.equal(clockSeconds('01:30'), 90)
  assert.equal(clockSeconds('1:02:03'), 3723)
  for (const bad of [undefined, '', 'noon', '12', '1:2:3:4', '-1:00']) {
    assert.equal(clockSeconds(bad), null, String(bad))
  }
})
