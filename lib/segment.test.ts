import { test } from 'node:test'
import assert from 'node:assert/strict'

import { filterHallucinated } from './segment.ts'

/**
 * Verification is the only thing standing between a paraphrasing model and a
 * map of statements nobody made, so both of its jobs are pinned here: rejecting
 * text that is not in the transcript, and reporting which turn the text that is
 * came from.
 */

const unit = (speaker: string, text: string) => ({
  speaker,
  text,
  textEn: null,
  kind: 'claim' as const,
})

test('a unit is verified against its own speaker, not the transcript', () => {
  const turns = [
    { speaker: 'Dave', text: '저는 예정대로 가야 한다고 봅니다.' },
    { speaker: 'Rosa', text: '저는 미루자는 쪽입니다. 버그가 두 개 남았습니다.' },
  ]
  // The words exist in the transcript, but Dave did not say them. Falling back
  // to the whole transcript would credit Rosa's position to Dave and move his
  // centroid onto it.
  const { kept, dropped } = filterHallucinated(
    [unit('Dave', '저는 미루자는 쪽입니다.'), unit('Rosa', '버그가 두 개 남았습니다.')],
    turns,
  )
  assert.deepEqual(kept.map((u) => u.speaker), ['Rosa'])
  assert.equal(dropped.length, 1)
})

test('a unit carries the time of the turn it was copied from', () => {
  const turns = [
    { speaker: 'Dave', text: '저는 예정대로 가야 한다고 봅니다.', time: '00:03' },
    { speaker: 'Rosa', text: '저는 미루자는 쪽입니다.', time: '01:12' },
    { speaker: 'Dave', text: '날짜를 한 번 미루면 다음 날짜도 협상 대상이 됩니다.', time: '04:20' },
  ]
  // Order in, order out is not the claim: segmentation returns units in
  // transcript order but splits and drops as it goes, so a unit's time has to
  // come from the turn whose words it holds.
  const { kept } = filterHallucinated(
    [
      unit('Dave', '날짜를 한 번 미루면 다음 날짜도 협상 대상이 됩니다.'),
      unit('Dave', '저는 예정대로 가야 한다고 봅니다.'),
    ],
    turns,
  )
  assert.deepEqual(kept.map((u) => u.at), ['04:20', '00:03'])
})

test('no timestamps in, no timestamps out', () => {
  const { kept } = filterHallucinated(
    [unit('Dave', '저는 예정대로 가야 한다고 봅니다.')],
    [{ speaker: 'Dave', text: '저는 예정대로 가야 한다고 봅니다.' }],
  )
  assert.equal('at' in kept[0], false)
})

test('a fragment too short to verify is dropped', () => {
  // Two or three characters occur somewhere in almost any Korean transcript, so
  // a short match is coincidence rather than provenance.
  const { kept, dropped } = filterHallucinated(
    [unit('Dave', '그렇죠')],
    [{ speaker: 'Dave', text: '저는 그렇죠 라고 답했습니다.' }],
  )
  assert.equal(kept.length, 0)
  assert.equal(dropped.length, 1)
})
