/**
 * Rebuilds `data/fixtures/precomputed.json` from the example transcripts.
 *
 *   npm run fixtures            all scenarios
 *   npm run fixtures -- drift   one of them
 *
 * The examples are the first thing anybody sees, and the claim made about them
 * is that they are real output rather than pictures drawn in advance. That only
 * stays true if they are produced by the same code that serves a paste, which
 * is why this calls `analyzeTranscript` rather than reimplementing it.
 *
 * Costs money: it segments and embeds every transcript through the API. Needs
 * OPENAI_API_KEY, read from `.env` or the environment.
 *
 * It prints the figures that decide whether an example is worth shipping —
 * statement count, how much of the difference survived the flattening, and
 * whether the map separates the speakers at all — because an example that
 * scores badly teaches the reader the wrong thing about the method, unless it
 * is the one included to show exactly that.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { requireOpenAiKey } from './env.ts'
import { attributionVerdict } from '../lib/aggregate.ts'
import { analyzeTranscript, type AnalysisWithDiagnostics } from '../lib/analyze.ts'
import { SCENARIOS } from '../data/scenarios.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

requireOpenAiKey(root)

const only = process.argv.slice(2).filter((a) => !a.startsWith('-'))
const wanted = only.length > 0 ? SCENARIOS.filter((s) => only.includes(s.id)) : SCENARIOS
if (wanted.length === 0) {
  console.error(`No scenario matched ${only.join(', ')}.`)
  process.exit(1)
}

const out = resolve(root, 'data/fixtures/precomputed.json')
const existing: Record<string, AnalysisWithDiagnostics> = (() => {
  try {
    return JSON.parse(readFileSync(out, 'utf8'))
  } catch {
    return {}
  }
})()

for (const scenario of wanted) {
  process.stdout.write(`${scenario.id} … `)
  const started = Date.now()
  const outcome = await analyzeTranscript(scenario.transcript)
  if (!outcome.ok) {
    console.log(`failed (${outcome.status}) ${outcome.error}`)
    process.exitCode = 1
    continue
  }
  existing[scenario.id] = outcome.result
  console.log(`${((Date.now() - started) / 1000).toFixed(1)}s`)
  report(scenario.id, outcome.result)
}

// A scenario that has been renamed or dropped leaves its fixture behind, and a
// stale map nobody can reach is worse than none: it still loads if an old link
// names it, showing output for a transcript that is no longer in the repository.
const known = new Set(SCENARIOS.map((s) => s.id))
for (const id of Object.keys(existing)) {
  if (known.has(id)) continue
  delete existing[id]
  console.log(`dropped ${id} — no scenario with that id`)
}

writeFileSync(out, `${JSON.stringify(existing, null, 2)}\n`)
console.log(`\nwrote ${out}`)

/** Prints what decides whether a map is worth showing. */
function report(id: string, result: AnalysisWithDiagnostics) {
  // Attribution and separation are properties of the meeting rather than of a
  // layout, so they are printed once rather than per method.
  const a = result.projections.people.meta.attribution
  const separation = result.projections.people.meta.separation
  // The same call the interface makes. This used to be a second copy of the
  // rule, which is one place for the printed report to disagree with the card
  // the reader will see.
  const called = attributionVerdict(a)
  const verdict =
    called === null
      ? ''
      : {
          strong: '',
          weak: ' ← weak',
          none: ' ← does not tell them apart',
          thin: ' ← too few statements to judge',
        }[called]
  console.log(
    `  attribution ${a ? `${(a.share * 100).toFixed(0)}%` : '—'}` +
      ` (chance ${a ? `${(a.chance * 100).toFixed(0)}%` : '—'})` +
      `  separation ${separation === null ? '—' : separation.toFixed(2)}${verdict}`,
  )

  for (const method of ['people', 'pca', 'mds'] as const) {
    const p = result.projections[method]
    const kept =
      p.meta.explainedVariance === null
        ? '   —'
        : `${(p.meta.explainedVariance * 100).toFixed(0).padStart(3)}%`
    console.log(
      `  ${method.padEnd(6)} statements ${String(p.utterances.length).padStart(3)}` +
        `  speakers ${p.speakers.length}` +
        `  kept ${kept}${p.meta.fitSaturated ? '*' : ' '}` +
        `${p.meta.secondAxisFromResiduals ? '  (2nd axis from within-speaker)' : ''}`,
    )
  }
  // Printed in full rather than counted. These are the sentences a reader will
  // take as the answer, and whether two of them could be swapped is a judgement
  // nobody can make from a tally.
  const summaries = result.speakerSummaries
  if (!summaries) {
    console.log('        summaries: none')
  } else {
    for (const [speaker, s] of Object.entries(summaries)) {
      console.log(`        ${speaker}: ${s.stance.ko}`)
      console.log(
        `          ${s.themes.map((t) => t.ko).join(' · ')}` +
          `  [${s.anchors.join(' ')}]`,
      )
    }
  }

  // Printed because it is the one figure a rewrite of a transcript can destroy
  // without changing anything else: drop the timestamps, or let one speaker's
  // statements bunch into one half, and the before/after comparison silently
  // stops being produced.
  const timeline = result.timeline
  if (!timeline) {
    console.log('        timeline: none')
  } else {
    console.log(
      `        timeline: split ${timeline.splitAt} of ${timeline.span.join('–')}` +
        `  ${timeline.moves
          .map(
            (m) =>
              `${m.speaker} ${m.ratio.toFixed(2)}${m.moved ? '*' : ''}` +
              ` (${m.early}/${m.late})`,
          )
          .join('  ')}`,
    )
    const changed = timeline.pairs.filter((p) => p.direction !== 'same')
    console.log(
      `        pairs: ${
        changed.length === 0
          ? 'none changed'
          : changed
              .map(
                (p) =>
                  `${p.a}–${p.b} ${p.direction} ${p.ratio.toFixed(2)}`,
              )
              .join('  ')
      }`,
    )
  }

  // The landing point and the exchanges are the two readings a rewritten
  // transcript can quietly empty out: a meeting that stops stating conclusions
  // loses its consensus, and one where people stop answering each other loses
  // its edges. Both look like a working analysis from the outside.
  const consensus = result.consensus
  if (!consensus) {
    console.log('        consensus: none computed')
  } else if (!consensus.reached) {
    console.log(`        consensus: not reached — open: ${consensus.open.ko}`)
  } else {
    console.log(`        consensus: ${consensus.statement.ko}`)
    console.log(`          [${consensus.anchors.join(' ')}]  open: ${consensus.open.ko}`)
  }
  const exchanges = result.exchanges
  const said = result.projections.pca.utterances
  console.log(`        exchanges: ${exchanges.length}`)
  for (const e of exchanges) {
    const from = said.find((u) => u.id === e.from)
    const to = said.find((u) => u.id === e.to)
    console.log(
      `          ${from?.speaker ?? e.from} → ${to?.speaker ?? e.to}` +
        ` ${e.kind.padEnd(10)} ${e.note.ko}`,
    )
  }

  const counts = result.counts
  console.log(
    `        claims ${counts.claim}  questions ${counts.question}` +
      `  assent ${counts.agreement}  procedural ${counts.procedural}` +
      `  dropped ${result.diagnostics.unitsDroppedAsHallucinated}`,
  )

  // The English rendering occasionally keeps a Korean word the model decided
  // was untranslatable. It is rare — one statement in ninety on the last full
  // rebuild — and harmless in the interface, where the original sits beside it.
  // Reported rather than corrected: whoever regenerates should see how often it
  // happens, and rerunning the scenario is the fix.
  const utterances = result.projections.pca.utterances
  const untranslated = utterances.filter(
    (u) => u.textEn && /[가-힣]/.test(u.textEn),
  )
  const missing = utterances.filter((u) => !u.textEn)
  if (untranslated.length > 0 || missing.length > 0) {
    console.log(
      `        translations: ${untranslated.length} with Korean left in, ` +
        `${missing.length} missing, of ${utterances.length}`,
    )
    for (const u of untranslated) {
      console.log(`          ${u.textEn?.match(/[가-힣]+/g)?.join(' ')}`)
    }
  }
  void id
}
