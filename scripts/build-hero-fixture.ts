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

import { analyzeTranscript } from '../lib/analyze.ts'
import { HERO_TRANSCRIPT } from '../data/hero.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

loadDotEnv(resolve(root, '.env'))
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is not set. Put it in .env or the environment.')
  process.exit(1)
}

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

/** Existing environment variables win, as in the fixture builder. */
function loadDotEnv(path: string) {
  let contents: string
  try {
    contents = readFileSync(path, 'utf8')
  } catch {
    return
  }
  for (const line of contents.split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line)
    if (!match) continue
    const value = match[2].trim().replace(/^["']|["']$/g, '')
    if (!process.env[match[1]]) process.env[match[1]] = value
  }
}
