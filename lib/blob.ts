/**
 * Speaker regions.
 *
 * A covariance ellipse describes a speaker's spread with five numbers, which
 * is honest about the statistics and dishonest about the shape: it draws a
 * smooth oval over a set of points that is almost never oval. Somebody who
 * argued from two separate framings gets one fat ellipse spanning the empty
 * space between them, and the map claims they occupied ground they never
 * touched.
 *
 * This builds the boundary from the points instead. Radii are measured out
 * from the speaker's centroid in fixed angular sectors, so the outline follows
 * the actual distribution and can be concave — a two-lobed argument reads as
 * two lobes. Every input point is inside the result: each one sets the radius
 * of its own sector, and dilating before smoothing keeps a peak from being
 * averaged back below the point that produced it.
 *
 * All coordinates are screen units. The region is a display device, not a
 * statistic, so it is computed where it is drawn rather than travelling
 * through the analysis.
 */

export type Point = [number, number]

export interface BlobOptions {
  /** Angular resolution. */
  sectors?: number
  /** Breathing room outside the outermost point, in screen units. */
  pad?: number
  /** Floor for a speaker whose points nearly coincide. */
  minRadius?: number
}

/** Raises each sector's immediate neighbours, so a lone point still reads as a
 *  lobe rather than as a spike between two empty sectors. */
const DILATE = 1
const SMOOTH_PASSES = 2

const TAU = Math.PI * 2

/**
 * The outline of `points`, as a closed polygon in draw order.
 *
 * Returns a circle around `center` when there is nothing to measure, so a
 * speaker with a single statement still reads as a region rather than
 * vanishing.
 */
export function blobPolygon(
  points: Point[],
  center: Point,
  { sectors = 36, pad = 16, minRadius = 14 }: BlobOptions = {},
): Point[] {
  const step = TAU / sectors
  const radii = new Array<number>(sectors).fill(0)

  for (const [x, y] of points) {
    const dx = x - center[0]
    const dy = y - center[1]
    const distance = Math.hypot(dx, dy)
    if (!Number.isFinite(distance)) continue
    // atan2 returns (-π, π]; shift into [0, τ) so it indexes a sector.
    const angle = (Math.atan2(dy, dx) + TAU) % TAU
    const k = Math.min(sectors - 1, Math.floor(angle / step))
    radii[k] = Math.max(radii[k], distance)
  }

  const dilated = radii.map((_, k) => {
    let max = 0
    for (let d = -DILATE; d <= DILATE; d += 1) {
      max = Math.max(max, radii[wrap(k + d, sectors)])
    }
    return max
  })

  let smoothed = dilated
  for (let pass = 0; pass < SMOOTH_PASSES; pass += 1) {
    const previous = smoothed
    smoothed = previous.map(
      (_, k) =>
        (previous[wrap(k - 1, sectors)] +
          previous[k] * 2 +
          previous[wrap(k + 1, sectors)]) /
        4,
    )
  }

  // Coverage pass, applied after smoothing because smoothing is what breaks it.
  //
  // The outline between two vertices is a curve, not an arc, so a vertex at the
  // radius of the point that set it still leaves that point outside whenever it
  // sits between two vertices. Requiring d/cos(φ) of each neighbouring vertex,
  // where φ is the angle from the point to that vertex, puts both vertices on
  // the line perpendicular to the point at exactly its distance — so the chord
  // touches the point and everything nearer the centre is enclosed. `pad` then
  // makes it strict, and the spline only ever bows further out.
  const required = new Array<number>(sectors).fill(0)
  for (const [x, y] of points) {
    const dx = x - center[0]
    const dy = y - center[1]
    const distance = Math.hypot(dx, dy)
    if (!Number.isFinite(distance) || distance === 0) continue
    const angle = (Math.atan2(dy, dx) + TAU) % TAU
    const low = Math.floor(angle / step - 0.5)
    for (const k of [low, low + 1]) {
      const gap = Math.abs(angle - (k + 0.5) * step)
      required[wrap(k, sectors)] = Math.max(
        required[wrap(k, sectors)],
        distance / Math.cos(Math.min(gap, step)),
      )
    }
  }

  return smoothed.map((r, k) => {
    const angle = (k + 0.5) * step
    const radius = Math.max(minRadius, Math.max(r, required[k]) + pad)
    return [center[0] + Math.cos(angle) * radius, center[1] + Math.sin(angle) * radius]
  })
}

/**
 * An SVG path through `polygon` as a closed Catmull-Rom spline.
 *
 * The curve passes through every vertex and bows outward between them, so
 * smoothing only ever adds coverage.
 */
export function blobPath(polygon: Point[]): string {
  const n = polygon.length
  if (n === 0) return ''
  if (n < 3) {
    return `M${polygon.map((p) => `${round(p[0])},${round(p[1])}`).join('L')}Z`
  }

  const parts: string[] = [`M${round(polygon[0][0])},${round(polygon[0][1])}`]
  for (let i = 0; i < n; i += 1) {
    const p0 = polygon[wrap(i - 1, n)]
    const p1 = polygon[i]
    const p2 = polygon[wrap(i + 1, n)]
    const p3 = polygon[wrap(i + 2, n)]
    // Catmull-Rom to cubic Bézier, tension 0.
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    parts.push(
      `C${round(c1x)},${round(c1y)} ${round(c2x)},${round(c2y)} ${round(p2[0])},${round(p2[1])}`,
    )
  }
  parts.push('Z')
  return parts.join('')
}

/** Signed area doubled; used only to order regions largest-first. */
export function polygonArea(polygon: Point[]): number {
  let sum = 0
  for (let i = 0; i < polygon.length; i += 1) {
    const [x1, y1] = polygon[i]
    const [x2, y2] = polygon[wrap(i + 1, polygon.length)]
    sum += x1 * y2 - x2 * y1
  }
  return Math.abs(sum) / 2
}

/** True when `point` is inside `polygon`. Exported for the coverage tests. */
export function contains(polygon: Point[], point: Point): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    const crosses = yi > point[1] !== yj > point[1]
    if (
      crosses &&
      point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi
    ) {
      inside = !inside
    }
  }
  return inside
}

function wrap(i: number, n: number): number {
  return ((i % n) + n) % n
}

function round(v: number): number {
  return Math.round(v * 100) / 100
}
