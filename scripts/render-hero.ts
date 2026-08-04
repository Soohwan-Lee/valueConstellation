/**
 * Renders the README's hero image.
 *
 * The picture is generated from a committed fixture through the same frame and
 * region maths the interactive map uses, so it cannot drift into showing
 * something the tool does not produce. A screenshot would go stale silently;
 * this one fails loudly when the geometry changes under it.
 *
 *   npm run hero
 *
 * The palette is inlined from the light theme rather than read from CSS: this
 * file is served by GitHub as a plain image with no stylesheet, and it carries
 * its own background so it stays legible against a dark README.
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import fixtures from '../data/fixtures/precomputed.json' with { type: 'json' }
import { mapResolution, regionPath, regionRings, ringsArea, type Point } from '../lib/blob.ts'
import { buildScales, VIEW_H, VIEW_W } from '../lib/frame.ts'
import { shapePath, speakerShape } from '../lib/colors.ts'
import { speakerPairs, pairsWith } from '../lib/pairs.ts'
import type { AnalysisResult } from '../lib/types.ts'

/** The example with four distinct positions; the one worth showing. */
const SCENARIO = 'siting'
/** Whose measure lines are drawn, i.e. who the image shows as selected. */
const SELECTED = '김철수'

const INK = '#0f1416'
const BODY = '#475156'
const MUTED = '#6b777d'
const LINE = '#d5dadd'
const PLATE = '#fcfdfd'

/** Light-theme speaker slots, mirroring globals.css. */
const SPEAKER_COLORS = [
  '#2f6ecc',
  '#c06000',
  '#1c8a5a',
  '#b32d86',
  '#0d7382',
  '#8d5524',
  '#a33529',
  '#616b78',
]

const analysis = (fixtures as unknown as Record<string, AnalysisResult>)[SCENARIO]
if (!analysis) throw new Error(`No fixture for "${SCENARIO}".`)

const projection = analysis.projections.pca
const { toX, toY } = buildScales(projection)
const color = (i: number) => SPEAKER_COLORS[i % SPEAKER_COLORS.length]

const parts: string[] = [
  `<rect width="${VIEW_W}" height="${VIEW_H}" rx="14" fill="${PLATE}"/>`,
  `<rect x="0.5" y="0.5" width="${VIEW_W - 1}" height="${VIEW_H - 1}" rx="13.5" fill="none" stroke="${LINE}"/>`,
  `<pattern id="field" width="30" height="30" patternUnits="userSpaceOnUse">` +
    `<circle cx="1" cy="1" r="0.85" fill="${LINE}"/></pattern>`,
  `<rect width="${VIEW_W}" height="${VIEW_H}" fill="url(#field)" opacity="0.55"/>`,
]

// One resolution for the whole map, so every region is drawn at one scale.
const { reach } = mapResolution(
  projection.utterances.map((u) => [toX(u.x), toY(u.y)] as Point),
  30,
)

// Regions, widest first so a tight one is never buried under a wide one.
const regions = projection.speakers
  .map((s) => {
    const points: Point[] = projection.utterances
      .filter((u) => u.speaker === s.speaker)
      .map((u) => [toX(u.x), toY(u.y)])
    const rings = regionRings(points, reach)
    return { s, d: regionPath(rings), area: ringsArea(rings) }
  })
  .sort((a, b) => b.area - a.area)

for (const { s, d } of regions) {
  if (!d) continue
  parts.push(
    `<path d="${d}" fill-rule="evenodd" fill="${color(s.colorIndex)}" fill-opacity="0.1" ` +
      `stroke="${color(s.colorIndex)}" stroke-opacity="0.34" stroke-width="1" ` +
      `stroke-linejoin="round"/>`,
  )
}

for (const u of projection.utterances) {
  const s = projection.speakers.find((x) => x.speaker === u.speaker)
  parts.push(
    `<circle cx="${round(toX(u.x))}" cy="${round(toY(u.y))}" r="3.4" ` +
      `fill="${color(s?.colorIndex ?? 0)}" fill-opacity="0.62" stroke="${PLATE}" stroke-width="0.9"/>`,
  )
}

// Measure lines from the selected speaker: the map's one hidden action, shown.
const selected = projection.speakers.find((s) => s.speaker === SELECTED)
if (!selected) throw new Error(`"${SELECTED}" is not in the ${SCENARIO} fixture.`)

for (const pair of pairsWith(speakerPairs(projection.speakers), SELECTED)) {
  const [x1, y1] = [toX(pair.a.x), toY(pair.a.y)]
  const [x2, y2] = [toX(pair.b.x), toY(pair.b.y)]
  parts.push(
    `<line x1="${round(x1)}" y1="${round(y1)}" x2="${round(x2)}" y2="${round(y2)}" ` +
      `stroke="${INK}" stroke-opacity="0.3" stroke-width="1"/>`,
    `<text x="${round((x1 + x2) / 2)}" y="${round((y1 + y2) / 2 - 4)}" text-anchor="middle" ` +
      `font-family="ui-monospace, monospace" font-size="12" fill="${BODY}" ` +
      `stroke="${PLATE}" stroke-width="3.5" stroke-linejoin="round" paint-order="stroke">` +
      `${pair.relative.toFixed(2)}</text>`,
  )
}

for (const s of projection.speakers) {
  const r = 7 + Math.min(5, Math.log2(Math.max(1, s.n)) * 1.6)
  const marker =
    `<path d="${shapePath(speakerShape(s.colorIndex), r)}" ` +
    `fill="${s.underdetermined ? PLATE : color(s.colorIndex)}" ` +
    `stroke="${color(s.colorIndex)}" stroke-width="${s.underdetermined ? 1.75 : 1.25}"` +
    `${s.underdetermined ? ' stroke-dasharray="3 2.5"' : ''}/>`
  const ring =
    s.speaker === SELECTED
      ? `<circle r="${round(r + 7)}" fill="none" stroke="${INK}" stroke-opacity="0.5" ` +
        `stroke-width="1" stroke-dasharray="2 3"/>`
      : ''
  const name =
    `<text y="${round(-r - 9)}" text-anchor="middle" font-family="system-ui, sans-serif" ` +
    `font-size="13" font-weight="500" fill="${INK}" stroke="${PLATE}" stroke-width="3.5" ` +
    `stroke-linejoin="round" paint-order="stroke">${escapeText(s.speaker)}` +
    (s.underdetermined
      ? `<tspan fill="${MUTED}" font-size="11"> n=${s.n}</tspan>`
      : '') +
    `</text>`
  parts.push(
    `<g transform="translate(${round(toX(s.x))} ${round(toY(s.y))})">${ring}${marker}${name}</g>`,
  )
}

const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW_W} ${VIEW_H}" ` +
  `width="${VIEW_W}" height="${VIEW_H}" role="img" ` +
  `aria-label="Four participants mapped from a transcript, with the distance from ${SELECTED} to each of the others">` +
  parts.join('') +
  `</svg>\n`

const out = resolve(dirname(fileURLToPath(import.meta.url)), '../docs/hero.svg')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, svg)
console.log(
  `${out} — ${projection.speakers.length} speakers, ${projection.utterances.length} statements`,
)

function round(v: number): number {
  return Math.round(v * 100) / 100
}

function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
