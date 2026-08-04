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
  /** Smallest reach around a statement, in screen units. */
  pad?: number
  /** Floor for a speaker whose points nearly coincide. */
  minRadius?: number
}

/**
 * How far the region reaches around each statement.
 *
 * This is what makes the outline a territory instead of a starfish. Taking the
 * furthest point per sector gives every statement a needle of its own: three
 * scattered statements produce three spikes with nothing between them, which
 * looks like a defect and reads as more precision than three points support.
 * A disk around each statement, unioned, gives lobes that merge where
 * statements cluster and part where they genuinely diverge.
 *
 * Two bounds set the size, and the smaller wins:
 *
 * SPREAD — a share of how far this speaker's statements sit from their centre,
 * so the region stays in proportion to the ground they actually covered.
 *
 * NEIGHBOUR — a share of the typical gap between one statement and the next.
 * Above half that gap, adjacent statements merge, which is what makes a
 * territory read as continuous; far above it, two distinct clusters fuse into
 * one shape spanning ground nobody occupied. The spread bound alone cannot see
 * this, because two tight clusters far apart have a large mean radius and a
 * tiny real extent.
 */
const SPREAD_RATIO = 0.62
const NEIGHBOUR_RATIO = 0.6

/**
 * Width of the body joining the lobes, as a share of the reach.
 *
 * Three statements far apart genuinely do leave gaps between them, and the
 * region should show that rather than filling in ground nobody occupied. But
 * pinching the gaps down to the bare floor leaves lobes strung on a thread,
 * which reads as a rendering fault rather than as a finding. This keeps a body
 * between them: still visibly narrower than the lobes, still concave.
 */
const CORE_RATIO = 0.5

const SMOOTH_PASSES = 1

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

  // Polar coordinates of each statement, relative to the speaker's centre.
  const polar: { distance: number; angle: number }[] = []
  for (const [x, y] of points) {
    const dx = x - center[0]
    const dy = y - center[1]
    const distance = Math.hypot(dx, dy)
    if (!Number.isFinite(distance)) continue
    // atan2 returns (-π, π]; shift into [0, τ) to match the sector angles.
    polar.push({ distance, angle: (Math.atan2(dy, dx) + TAU) % TAU })
  }

  const meanDistance =
    polar.length > 0
      ? polar.reduce((sum, p) => sum + p.distance, 0) / polar.length
      : 0
  const reach = Math.max(
    pad,
    Math.min(
      meanDistance * SPREAD_RATIO,
      medianNearestNeighbour(points) * NEIGHBOUR_RATIO,
    ),
  )

  // The outline is the silhouette of the union of those disks, sampled per
  // sector: how far out the boundary sits in this direction is how far the
  // furthest disk reaches along it.
  const radii = new Array<number>(sectors).fill(0)
  for (let k = 0; k < sectors; k += 1) {
    const theta = (k + 0.5) * step
    for (const { distance, angle } of polar) {
      radii[k] = Math.max(radii[k], diskReach(distance, theta - angle, reach))
    }
  }

  let smoothed = radii
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
        // The extra unit makes containment strict rather than tangent.
        distance / Math.cos(Math.min(gap, step)) + 1,
      )
    }
  }

  const core = Math.max(minRadius, reach * CORE_RATIO)
  return smoothed.map((r, k) => {
    const angle = (k + 0.5) * step
    const radius = Math.max(core, r, required[k])
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

/**
 * Median distance from a point to its closest neighbour.
 *
 * The median rather than the mean, so one statement sitting on its own does not
 * decide how wide every lobe is. Infinity when there is nothing to compare, so
 * the caller's other bound takes over.
 */
function medianNearestNeighbour(points: Point[]): number {
  if (points.length < 2) return Infinity
  const nearest: number[] = []
  for (let i = 0; i < points.length; i += 1) {
    let best = Infinity
    for (let j = 0; j < points.length; j += 1) {
      if (i === j) continue
      const d = Math.hypot(points[i][0] - points[j][0], points[i][1] - points[j][1])
      if (Number.isFinite(d)) best = Math.min(best, d)
    }
    if (Number.isFinite(best)) nearest.push(best)
  }
  if (nearest.length === 0) return Infinity
  nearest.sort((a, b) => a - b)
  return nearest[Math.floor(nearest.length / 2)]
}

/**
 * How far a disk of radius `reach`, centred `distance` from the origin, extends
 * along a ray `offset` radians away from it. Zero when the ray misses.
 *
 * This is the far intersection of the ray with the circle: the projection onto
 * the ray plus the half-chord across it.
 */
function diskReach(distance: number, offset: number, reach: number): number {
  const across = distance * Math.sin(offset)
  if (Math.abs(across) >= reach) return 0
  const along = distance * Math.cos(offset)
  return Math.max(0, along + Math.sqrt(reach * reach - across * across))
}

function wrap(i: number, n: number): number {
  return ((i % n) + n) % n
}

function round(v: number): number {
  return Math.round(v * 100) / 100
}
