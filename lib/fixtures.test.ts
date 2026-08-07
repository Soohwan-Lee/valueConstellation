import { test } from 'node:test'
import assert from 'node:assert/strict'

import fixtures from '../data/fixtures/precomputed.json' with { type: 'json' }
import { SCENARIOS } from '../data/scenarios.ts'
import { MIN_STATEMENTS_FOR_ATTRIBUTION } from './aggregate.ts'
import { MIN_STATEMENTS_PER_HALF } from './timeline.ts'
import { needsTranslation } from './translate.ts'
import { speakerLabel } from './speakers.ts'
import type { SpeakerSummary } from './summaries.ts'
import type { AnalysisResult } from './types.ts'

/**
 * The committed examples are the first thing anybody sees, on both pages, and
 * they are generated output rather than hand-written data — so the invariants
 * the interface assumes about them are worth pinning here. A rebuild that
 * quietly drops a scenario, loses half the translations, or produces a map too
 * small for its own figures to mean anything should fail the suite rather than
 * ship.
 *
 * No model is called: this reads what is already in the repository.
 */

const MAPS = fixtures as unknown as Record<string, AnalysisResult>

test('every scenario the picker offers has a map behind it', () => {
  // The overview's example tabs and the studio's source menu both list
  // SCENARIOS and index into the fixtures by id. A scenario without a fixture
  // silently falls through to an empty composer.
  for (const scenario of SCENARIOS) {
    const map = MAPS[scenario.id]
    assert.ok(map, `no fixture for scenario "${scenario.id}"`)
    assert.ok(
      map.projections.pca.speakers.length >= 2,
      `"${scenario.id}" has fewer than two placed speakers`,
    )
    assert.ok(map.projections.mds, `"${scenario.id}" is missing the MDS layout`)
  }
})

test('no fixture is left behind by a renamed scenario', () => {
  const known = new Set(SCENARIOS.map((s) => s.id))
  for (const id of Object.keys(MAPS)) {
    assert.ok(known.has(id), `fixture "${id}" has no scenario`)
  }
})

test('every scenario carries the text the interface renders', () => {
  for (const scenario of SCENARIOS) {
    for (const field of ['topic', 'title', 'teaser', 'lookFor'] as const) {
      for (const lang of ['ko', 'en'] as const) {
        assert.ok(
          scenario[field][lang].trim().length > 0,
          `"${scenario.id}" has an empty ${field}.${lang}`,
        )
      }
    }
  }
})

test('every Korean statement has an English translation', () => {
  // Segmentation is unreliable about this on its own — one rebuild returned a
  // whole batch of fourteen with the field null — which is why the pipeline has
  // a repair pass. This is the check that the repair is working.
  for (const [id, map] of Object.entries(MAPS)) {
    for (const u of map.projections.pca.utterances) {
      assert.ok(
        !needsTranslation(u.text, u.textEn),
        `"${id}" statement ${u.id} is untranslated: ${u.text.slice(0, 40)}`,
      )
    }
  }
})

test('every placed speaker has a name in both languages', () => {
  // The language toggle switches everything else on the page. A map whose
  // names stay in one script gives an English reader an interface they can read
  // wrapped around the four labels they cannot.
  for (const [id, map] of Object.entries(MAPS)) {
    const names = map.speakerNames
    assert.ok(names, `"${id}" has no English speaker names`)
    for (const speaker of map.projections.pca.speakers) {
      // Annotated rather than inferred: `assert.ok` narrows `names` for the
      // runtime but the checker still sees the nullable type on the index.
      const en: string | undefined = names[speaker.speaker]
      assert.ok(en?.trim(), `"${id}" has no English name for ${speaker.speaker}`)
      assert.ok(
        !/[가-힣]/.test(en),
        `"${id}" left Hangul in the English name for ${speaker.speaker}: ${en}`,
      )
      assert.equal(
        speakerLabel(speaker.speaker, 'ko', names),
        speaker.speaker,
        'the Korean label is always the name as spoken',
      )
      assert.equal(speakerLabel(speaker.speaker, 'en', names), en)
    }
  }
})

test('a map with no rendered names falls back to the originals', () => {
  // Every fixture built before the field existed is in this state, as is any
  // analysis whose naming call failed.
  assert.equal(speakerLabel('김철수', 'en', null), '김철수')
  assert.equal(speakerLabel('김철수', 'en', {}), '김철수')
  assert.equal(speakerLabel('김철수', 'en', { 김철수: '   ' }), '김철수')
})

test('every example is large enough for its own figures to mean anything', () => {
  for (const [id, map] of Object.entries(MAPS)) {
    const pca = map.projections.pca
    assert.ok(
      !pca.meta.saturated,
      `"${id}" has too few statements for the kept-detail figure to mean anything`,
    )
    assert.ok(
      pca.utterances.length >= 15,
      `"${id}" has only ${pca.utterances.length} statements`,
    )
  }
})

test('the PCA layout names its axes, and MDS does not', () => {
  for (const [id, map] of Object.entries(MAPS)) {
    const axes = map.projections.pca.meta.axes
    assert.ok(axes, `"${id}" has no axis names`)
    for (const axis of [axes.horizontal, axes.vertical]) {
      for (const pole of [axis.low, axis.high]) {
        assert.ok(pole.ko.trim() && pole.en.trim(), `"${id}" has an empty pole`)
        // A pole named after a participant would make the axis a person.
        for (const speaker of map.projections.pca.speakers) {
          assert.ok(
            !pole.ko.includes(speaker.speaker),
            `"${id}" names an axis after ${speaker.speaker}`,
          )
        }
      }
    }
    assert.equal(
      map.projections.mds.meta.axes,
      null,
      `"${id}" named the MDS axes, whose orientation is arbitrary`,
    )
  }
})

test('the examples still demonstrate what they claim to', () => {
  // Three are meant to tell their speakers apart; `mixed` exists to show the
  // failure. If a rebuild flips either way the lesson on the page is wrong.
  //
  // Graded on attribution rather than on separation, and against chance rather
  // than against a fixed cut, because chance moves with the number of people in
  // the room: getting half the statements home is strong with four
  // participants and no better than a coin toss with two.
  const attribution = (id: string) => {
    const a = MAPS[id].projections.people.meta.attribution
    assert.ok(a, `"${id}" reports no attribution`)
    return a
  }

  for (const id of ['release', 'hiring', 'pricing']) {
    const { share, chance } = attribution(id)
    assert.ok(
      share >= chance * 1.5,
      `"${id}" no longer tells its speakers apart: ${(share * 100).toFixed(0)}%` +
        ` of statements find their speaker, against ${(chance * 100).toFixed(0)}% by guessing`,
    )
  }

  const failing = attribution('omnibus')
  assert.ok(
    failing.share <= failing.chance,
    'the "map fails" example now tells its speakers apart, so it teaches nothing',
  )

  // No example may be thin enough that the interface hedges instead of
  // judging. `mixed` in particular has to reach the verdict that names its
  // cause — too many agenda items — rather than the one that says there was
  // not enough material to tell, which would be a different lesson.
  for (const id of Object.keys(MAPS)) {
    assert.ok(
      attribution(id).perSpeaker >= MIN_STATEMENTS_FOR_ATTRIBUTION,
      `"${id}" has only ${attribution(id).perSpeaker} statements per speaker,` +
        ' so the map reports that it cannot judge rather than what it found',
    )
  }
})

test('every example is timed, and its halves can be compared', () => {
  // All four transcripts are timestamped on every line, so a fixture with a
  // statement missing its time means the pipeline dropped it somewhere between
  // the parser and the map — which is silent damage: the map looks the same and
  // simply stops being able to say what changed over the meeting.
  for (const [id, map] of Object.entries(MAPS)) {
    for (const u of map.projections.people.utterances) {
      assert.ok(u.at, `"${id}" statement ${u.id} lost its timestamp`)
    }
    const timeline = map.timeline
    assert.ok(timeline, `"${id}" has no before/after comparison`)
    assert.equal(timeline.timed, timeline.total)

    const placed = new Set(
      map.projections.people.speakers.map((s) => s.speaker),
    )
    for (const move of timeline.moves) {
      assert.ok(
        placed.has(move.speaker),
        `"${id}" reports movement for ${move.speaker}, who is not on the map`,
      )
      assert.ok(
        move.early >= MIN_STATEMENTS_PER_HALF &&
          move.late >= MIN_STATEMENTS_PER_HALF,
        `"${id}" compares halves of ${move.early} and ${move.late} for ${move.speaker}`,
      )
    }
  }
})

test('every placed speaker is summarised, from statements they made', () => {
  for (const [id, map] of Object.entries(MAPS)) {
    const summaries = map.speakerSummaries
    assert.ok(summaries, `"${id}" has no speaker summaries`)

    for (const { speaker } of map.projections.people.speakers) {
      const summary: SpeakerSummary | undefined = summaries[speaker]
      assert.ok(summary, `"${id}" does not summarise ${speaker}`)
      assert.ok(
        summary.stance.ko.trim() && summary.stance.en.trim(),
        `"${id}" has an empty stance for ${speaker}`,
      )
      assert.ok(
        summary.themes.length > 0,
        `"${id}" gives ${speaker} no themes`,
      )

      // The anchors are what makes the summary checkable. One pointing at
      // somebody else's statement would show a reader the wrong evidence.
      const own = new Set(
        map.projections.people.utterances
          .filter((u) => u.speaker === speaker)
          .map((u) => u.id),
      )
      assert.ok(summary.anchors.length > 0, `"${id}": ${speaker} has no anchors`)
      for (const anchor of summary.anchors) {
        assert.ok(
          own.has(anchor),
          `"${id}": ${speaker}'s summary cites ${anchor}, which they did not say`,
        )
      }
    }
  }
})

test('no two speakers in a meeting get the same summary', () => {
  // The failure this guards against is a model writing one plausible paragraph
  // per meeting and varying the wording. A map whose whole claim is that these
  // people differ cannot hand out interchangeable descriptions of them.
  for (const [id, map] of Object.entries(MAPS)) {
    const stances = Object.values(map.speakerSummaries ?? {}).map((s) =>
      s.stance.ko.trim(),
    )
    assert.equal(
      new Set(stances).size,
      stances.length,
      `"${id}" gives two speakers the same stance`,
    )
  }
})

test('every layout of a meeting reports the same trust figures', () => {
  // Attribution and separation are measured in the embedding space the map is
  // built from, never in the picture. A layout fitted to push the speakers
  // apart would otherwise grade its own homework, and `people` is exactly that
  // layout. Identical numbers across all three is what makes the figure a
  // claim about the meeting rather than about the drawing.
  for (const [id, map] of Object.entries(MAPS)) {
    const { people, pca, mds } = map.projections
    for (const other of [pca, mds]) {
      assert.deepEqual(
        other.meta.attribution,
        people.meta.attribution,
        `"${id}" reports different attribution for ${other.meta.method}`,
      )
      assert.equal(
        other.meta.separation,
        people.meta.separation,
        `"${id}" reports different separation for ${other.meta.method}`,
      )
    }
  }
})
