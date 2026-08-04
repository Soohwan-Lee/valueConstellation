import type { Projection } from './types.ts'

/**
 * The drawing frame.
 *
 * Shared by the interactive map and by the still image generated for the
 * README, so the picture in the documentation is laid out by the same
 * arithmetic as the product rather than by a second implementation that can
 * drift from it.
 */
export const VIEW_W = 900
export const VIEW_H = 620

/**
 * Margin inside the frame. Wide enough to hold a speaker region, which extends
 * past the outermost point by its padding, plus the name above the marker.
 */
export const PADDING = 64

export interface Scales {
  toX: (v: number) => number
  toY: (v: number) => number
}

/** A box to fit the map into. Defaults to the interactive plate's. */
export interface Frame {
  width: number
  height: number
  padding: number
}

const PLATE: Frame = { width: VIEW_W, height: VIEW_H, padding: PADDING }

/**
 * Maps projected coordinates into a box.
 *
 * A single scale factor is used for both axes so that distances are not
 * distorted differently in x and y — stretching one axis to fill the frame
 * would make some pairs look closer than they are.
 *
 * Parameterised over the box because the same fit is needed at three sizes:
 * the plate, the card previews on the overview, and the still image in the
 * README. Three copies of it is three chances for one of them to distort.
 */
export function buildScales(
  projection: Projection,
  { width, height, padding }: Frame = PLATE,
): Scales {
  const xs: number[] = []
  const ys: number[] = []
  for (const u of projection.utterances) {
    xs.push(u.x)
    ys.push(u.y)
  }
  // Only the marks themselves set the extent. Regions are built in screen
  // units after this runs, and the frame padding is sized to hold them.
  for (const s of projection.speakers) {
    xs.push(s.x)
    ys.push(s.y)
  }

  // Math.min() of an empty list is Infinity, and a span of -Infinity is truthy,
  // so `|| 1` would not catch it — the result would be NaN geometry.
  const finite = (v: number, fallback: number) =>
    Number.isFinite(v) ? v : fallback

  const minX = finite(Math.min(...xs), 0)
  const maxX = finite(Math.max(...xs), 1)
  const minY = finite(Math.min(...ys), 0)
  const maxY = finite(Math.max(...ys), 1)

  const rawSpanX = maxX - minX
  const rawSpanY = maxY - minY
  const spanX = Number.isFinite(rawSpanX) && rawSpanX > 0 ? rawSpanX : 1
  const spanY = Number.isFinite(rawSpanY) && rawSpanY > 0 ? rawSpanY : 1
  const usableW = width - padding * 2
  const usableH = height - padding * 2

  const scale = Math.min(usableW / spanX, usableH / spanY)

  // Centre the content in whichever direction has slack.
  const offsetX = (usableW - spanX * scale) / 2
  const offsetY = (usableH - spanY * scale) / 2

  return {
    toX: (v: number) => padding + offsetX + (v - minX) * scale,
    // SVG y grows downward; invert so the map reads like a chart.
    toY: (v: number) => height - padding - offsetY - (v - minY) * scale,
  }
}
