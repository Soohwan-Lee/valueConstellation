/**
 * Renders the README's hero image.
 *
 *   npm run hero:data   analyse the English transcript (costs an API call)
 *   npm run hero        redraw docs/hero.svg from that analysis
 *
 * The picture goes through the same frame and region maths the interactive map
 * uses, so it cannot drift into showing something the tool does not produce. A
 * screenshot goes stale silently; this one fails loudly when the geometry
 * changes under it.
 *
 * It carries a legend and its own light background because a README image is
 * read with no interface around it, by somebody who has not been told what a
 * dot means, on a page that may be in dark mode. The palette is inlined from
 * the light theme for the same reason: GitHub serves this as a plain image with
 * no stylesheet.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  mapResolution,
  regionPath,
  regionRings,
  ringsArea,
  type Point,
} from '../lib/blob.ts'
import { buildScales, VIEW_H, VIEW_W } from '../lib/frame.ts'
import { shapePath, speakerShape } from '../lib/colors.ts'
import { speakerPairs, pairsWith } from '../lib/pairs.ts'
import type { AnalysisResult } from '../lib/types.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Whose measure lines are drawn, i.e. who the image shows as selected. */
const SELECTED = 'Dana'

/** Room under the plate for the legend. */
const LEGEND_H = 84
const OUT_H = VIEW_H + LEGEND_H

const SANS = 'ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif'
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'

const INK = '#0f1416'
const BODY = '#475156'
const MUTED = '#6b777d'
const LINE = '#d5dadd'
const PLATE = '#fcfdfd'
const TRAY = '#e7eaec'

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

const analysis: AnalysisResult = JSON.parse(
  readFileSync(resolve(root, 'docs/hero-fixture.json'), 'utf8'),
)

const projection = analysis.projections.pca
const { toX, toY } = buildScales(projection)
const color = (i: number) => SPEAKER_COLORS[i % SPEAKER_COLORS.length]

const parts: string[] = [
  `<rect width="${VIEW_W}" height="${OUT_H}" rx="16" fill="${TRAY}"/>`,
  `<rect x="10" y="10" width="${VIEW_W - 20}" height="${VIEW_H - 20}" rx="12" fill="${PLATE}" stroke="${LINE}"/>`,
  `<pattern id="field" width="30" height="30" patternUnits="userSpaceOnUse">` +
    `<circle cx="1" cy="1" r="0.85" fill="${LINE}"/></pattern>`,
  `<rect x="10" y="10" width="${VIEW_W - 20}" height="${VIEW_H - 20}" rx="12" fill="url(#field)" opacity="0.5"/>`,
]

// One resolution for the whole map, so every region is drawn at one scale.
const { reach } = mapResolution(
  projection.speakers.map((s) =>
    projection.utterances
      .filter((u) => u.speaker === s.speaker)
      .map((u) => [toX(u.x), toY(u.y)] as Point),
  ),
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
    `<circle cx="${round(toX(u.x))}" cy="${round(toY(u.y))}" r="4" ` +
      `fill="${color(s?.colorIndex ?? 0)}" fill-opacity="0.62" stroke="${PLATE}" stroke-width="1"/>`,
  )
}

// Measure lines from the selected speaker: the map's one hidden action, shown.
if (!projection.speakers.some((s) => s.speaker === SELECTED)) {
  throw new Error(`"${SELECTED}" is not in the hero fixture.`)
}

for (const pair of pairsWith(speakerPairs(projection.speakers), SELECTED)) {
  const [x1, y1] = [toX(pair.a.x), toY(pair.a.y)]
  const [x2, y2] = [toX(pair.b.x), toY(pair.b.y)]
  parts.push(
    `<line x1="${round(x1)}" y1="${round(y1)}" x2="${round(x2)}" y2="${round(y2)}" ` +
      `stroke="${INK}" stroke-opacity="0.32" stroke-width="1.25"/>`,
    label(round((x1 + x2) / 2), round((y1 + y2) / 2 - 5), pair.relative.toFixed(2), {
      size: 14,
      family: MONO,
      fill: BODY,
    }),
  )
}

for (const s of projection.speakers) {
  const r = 8 + Math.min(6, Math.log2(Math.max(1, s.n)) * 1.8)
  const marker =
    `<path d="${shapePath(speakerShape(s.colorIndex), r)}" ` +
    `fill="${s.underdetermined ? PLATE : color(s.colorIndex)}" ` +
    `stroke="${color(s.colorIndex)}" stroke-width="${s.underdetermined ? 1.75 : 1.25}"` +
    `${s.underdetermined ? ' stroke-dasharray="3 2.5"' : ''}/>`
  const ring =
    s.speaker === SELECTED
      ? `<circle r="${round(r + 8)}" fill="none" stroke="${INK}" stroke-opacity="0.5" ` +
        `stroke-width="1" stroke-dasharray="2 3"/>`
      : ''
  const name = label(0, round(-r - 12), escapeText(s.speaker), {
    size: 17,
    weight: 600,
    fill: INK,
  })
  parts.push(
    `<g transform="translate(${round(toX(s.x))} ${round(toY(s.y))})">${ring}${marker}${name}</g>`,
  )
}

// ── Legend ──────────────────────────────────────────────────────────────────
// A README image is read with no interface around it. Without this a reader has
// no way to know which mark is a person and which is a sentence.
const legendY = VIEW_H + 26
const items: { glyph: string; text: string }[] = [
  {
    glyph: `<circle cx="0" cy="-4" r="4" fill="${SPEAKER_COLORS[0]}" fill-opacity="0.62"/>`,
    text: 'one statement',
  },
  {
    glyph: `<circle cx="0" cy="-4" r="8" fill="${SPEAKER_COLORS[0]}"/>`,
    text: 'a participant, at the average of everything they said',
  },
  {
    glyph:
      `<path d="M-9,-12 C-9,-18 1,-19 6,-14 C11,-9 8,-1 1,0 C-6,1 -9,-6 -9,-12Z" ` +
      `fill="${SPEAKER_COLORS[0]}" fill-opacity="0.12" stroke="${SPEAKER_COLORS[0]}" ` +
      `stroke-opacity="0.4" stroke-width="1"/>`,
    text: 'the ground their statements cover',
  },
]

let cursor = 26
for (const item of items) {
  parts.push(
    `<g transform="translate(${round(cursor)} ${legendY})">${item.glyph}` +
      `<text x="16" y="0" font-family="${SANS}" font-size="13.5" fill="${MUTED}">${item.text}</text></g>`,
  )
  // Rough advance: glyph, gap, and the label at about 6.6px per character.
  cursor += 16 + item.text.length * 6.6 + 28
}

parts.push(
  `<g transform="translate(26 ${VIEW_H + 60})">` +
    `<line x1="0" y1="-4" x2="18" y2="-12" stroke="${INK}" stroke-opacity="0.4" stroke-width="1.25"/>` +
    `<circle cx="0" cy="-4" r="2.4" fill="${INK}" fill-opacity="0.5"/>` +
    `<circle cx="18" cy="-12" r="2.4" fill="${INK}" fill-opacity="0.5"/>` +
    `<text x="28" y="-4" font-family="${SANS}" font-size="13.5" fill="${MUTED}">` +
    `the gap between two people, where 1.00 is the widest gap on this map` +
    `</text></g>`,
  `<text x="${VIEW_W - 26}" y="${VIEW_H + 60}" text-anchor="end" font-family="${SANS}" ` +
    `font-size="12.5" fill="${MUTED}">` +
    `${projection.utterances.length} statements · ${projection.speakers.length} participants · axes carry no meaning` +
    `</text>`,
)

const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW_W} ${OUT_H}" ` +
  `width="${VIEW_W}" height="${OUT_H}" role="img" ` +
  `aria-label="Four participants in a depot siting meeting, mapped from what they said, with the measured gap from ${SELECTED} to each of the others">` +
  parts.join('') +
  `</svg>\n`

const out = resolve(root, 'docs/hero.svg')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, svg)
console.log(
  `${out} — ${projection.speakers.length} speakers, ${projection.utterances.length} statements`,
)

/** A text run with a plate-coloured halo, so it stays readable over any mark. */
function label(
  x: number,
  y: number,
  text: string,
  {
    size,
    weight,
    fill,
    family = SANS,
  }: { size: number; weight?: number; fill: string; family?: string },
): string {
  return (
    `<text x="${x}" y="${y}" text-anchor="middle" font-family="${family}" ` +
    `font-size="${size}"${weight ? ` font-weight="${weight}"` : ''} fill="${fill}" ` +
    `stroke="${PLATE}" stroke-width="4" stroke-linejoin="round" paint-order="stroke">${text}</text>`
  )
}

function round(v: number): number {
  return Math.round(v * 100) / 100
}

function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
