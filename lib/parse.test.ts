import { test } from 'node:test'
import assert from 'node:assert/strict'

import { canonicalizeSpeaker, isModerator, parseTranscript } from './parse.ts'

/**
 * Every case here is a transcript format or failure mode observed in real data.
 * The timestamp, moderator, and speaker-header cases each shipped as a bug that
 * corrupted speaker attribution, so they are regression guards rather than
 * illustrations.
 */

test('parses the five labelled formats', () => {
  const cases: [string, string, string[]][] = [
    ['colon', '김철수: 안녕하세요 논의를 시작합니다.\n이영희: 좋습니다.', ['김철수', '이영희']],
    ['bracket', '[김철수 00:12] 첫 의견입니다.\n[이영희] 두 번째입니다.', ['김철수', '이영희']],
    [
      'official minutes',
      '◯ 김철수 위원  신중히 봐야 합니다.\n◯ 이영희 의원  동의합니다.',
      ['김철수', '이영희'],
    ],
    ['english', 'Alice: I disagree with that.\nBob: I think it works.', ['Alice', 'Bob']],
    [
      'paren time, aliases merge',
      '박민수 (01:05): 저는 반대합니다.\n박민수님: 이유는 규제입니다.',
      ['박민수'],
    ],
  ]
  for (const [label, input, expected] of cases) {
    assert.deepEqual(parseTranscript(input).speakers, expected, label)
  }
})

test('speaker header on its own line, speech following', () => {
  // Transcription-tool exports (Clova, Otter, Daglo). Read as "이름 HH:MM" the
  // timestamp colon became the label separator, producing one phantom speaker
  // per minute mark: 정의당 00, 정의당 02, ...
  const r = parseTranscript(
    '사회자 00:00\n시작하겠습니다.\n정의당 00:50\n지역 소멸이 문제입니다.\n정의당 02:03\n주민 투표가 필요합니다.',
  )
  assert.deepEqual(r.speakers, ['사회자', '정의당'])
  assert.equal(r.turns[1].time, '00:50')
})

test('standalone timestamps are not speakers', () => {
  const r = parseTranscript(
    '00:50\n김철수: 재정 부담이 큽니다.\n01:20\n이영희: 반대합니다.\n08:36',
  )
  assert.deepEqual(r.speakers, ['김철수', '이영희'])
  // The timestamp attaches to the turn that follows it.
  assert.equal(r.turns[0].time, '00:50')
  assert.equal(r.turns[1].time, '01:20')
})

test('recording metadata is not a speaker', () => {
  const r = parseTranscript(
    '2026.05.21 Thu AM 11:37 ・ 56Minutes\n김철수: 시작합니다.',
  )
  assert.deepEqual(r.speakers, ['김철수'])
})

test('minutes header fields are not speakers', () => {
  const r = parseTranscript(
    '제2차 정책 심의회 회의록\n장소: 시청 3층\n김철수: 시작하겠습니다.',
  )
  assert.deepEqual(r.speakers, ['김철수'])
  // Discarded pre-speaker lines are counted rather than vanishing.
  assert.ok(r.preambleLines >= 2)
})

test('prose containing a colon or a time is not a speaker', () => {
  assert.deepEqual(
    parseTranscript('김철수: 제 생각은 이렇습니다: 규제는 필요합니다.\n이영희: 네.')
      .speakers,
    ['김철수', '이영희'],
  )
  assert.deepEqual(
    parseTranscript('김철수: 예산은 12:30 까지 확정해야 합니다.\n이영희: 알겠습니다.')
      .speakers,
    ['김철수', '이영희'],
  )
  assert.deepEqual(
    parseTranscript('김철수: 좋습니다.\n결론적으로 말하면: 재검토가 필요합니다.').speakers,
    ['김철수'],
  )
})

test('isModerator matches roles exactly, not by prefix', () => {
  // An unanchored prefix test classified 사회복지사 (social worker) as a
  // facilitator. Since moderators are excluded by default, that silently
  // deleted a real stakeholder from the map.
  for (const name of ['사회자', '사회자님', '진행자', '위원장', 'chair']) {
    assert.equal(isModerator(name), true, name)
  }
  for (const name of ['사회복지사', '사회학과 교수', '진행상황', 'chairperson', '김철수']) {
    assert.equal(isModerator(name), false, name)
  }
})

test('honorifics collapse to one speaker', () => {
  for (const [input, expected] of [
    ['김철수 위원', '김철수'],
    ['김 철수', '김철수'],
    ['박민수님', '박민수'],
    ['이영희 의원', '이영희'],
    ['김철수 부위원장', '김철수'],
    ['Alice', 'Alice'],
  ] as [string, string][]) {
    assert.equal(canonicalizeSpeaker(input), expected, input)
  }
})

test('CRLF and unlabelled continuation lines', () => {
  const r = parseTranscript(
    '김철수: 첫 문장입니다.\r\n이어지는 설명입니다.\r\n이영희: 동의합니다.',
  )
  assert.deepEqual(r.speakers, ['김철수', '이영희'])
  assert.equal(r.continuationLines, 1)
  assert.match(r.turns[0].text, /이어지는 설명입니다/)
})
