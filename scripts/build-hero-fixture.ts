/**
 * Analyses the English hero transcript and writes `docs/hero-fixture.json`.
 *
 *   npm run hero:data
 *
 * Separate from the app's fixtures because it is not an example anybody can
 * open in the tool — it exists only so the picture at the top of the README is
 * in a language its readers can check against the caption. It goes through
 * `analyzeTranscript` like everything else, so the image still shows real
 * output.
 *
 * Costs an API call. Run it when the transcript or the pipeline changes, then
 * `npm run hero` to redraw.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { requireOpenAiKey } from './env.ts'
import { analyzeTranscript } from '../lib/analyze.ts'
import { HERO_TRANSCRIPT } from '../data/hero.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

requireOpenAiKey(root)

const outcome = await analyzeTranscript(HERO_TRANSCRIPT)
if (!outcome.ok) {
  console.error(`failed (${outcome.status}) ${outcome.error}`)
  process.exit(1)
}

const projection = outcome.result.projections.pca
console.log(
  `statements ${projection.utterances.length}` +
    `  speakers ${projection.speakers.length}` +
    `  kept ${((projection.meta.explainedVariance ?? 0) * 100).toFixed(0)}%` +
    `  separation ${projection.meta.separation?.toFixed(2) ?? '—'}`,
)

const out = resolve(root, 'docs/hero-fixture.json')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, `${JSON.stringify(outcome.result, null, 2)}\n`)
console.log(`wrote ${out}`)
