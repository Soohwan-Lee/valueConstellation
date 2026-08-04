/**
 * Speaker regions.
 *
 * ## What is drawn
 *
 * Every statement radiates influence that falls off with distance. The region
 * is the outline of the ground where that speaker's statements, taken together,
 * are at least as present as a single statement standing on its own at distance
 * `reach`. Statements close to each other reinforce and merge into one shape;
 * statements far apart keep separate shapes.
 *
 * ## Why not an ellipse
 *
 * A covariance ellipse describes a speaker's spread with five numbers, which is
 * honest about the statistics and dishonest about the shape. It draws a smooth
 * oval over points that are almost never oval, so somebody who argued from two
 * separate framings gets one fat ellipse spanning the empty ground between
 * them, and the map asserts they occupied a position nobody took.
 *
 * ## Where `reach` comes from
 *
 * The typical distance from one statement to the next thing **the same person**
 * said: for every statement, the distance to that speaker's nearest other
 * statement, pooled across all speakers, median. Call it the map's resolution —
 * below it, two of somebody's statements are not distinguishable positions —
 * and each statement claims the ground within one resolution of itself.
 *
 * Every part of that is checkable against the picture. A statement with nothing
 * near it draws a disk of exactly that radius. Two statements up to about 2.6
 * resolutions apart merge into one shape; beyond that they stay separate. So
 * the outline covers the ground a speaker's statements are dense enough to hold
 * together and leaves the rest empty, which is the distinction an ellipse
 * cannot make.
 *
 * Two details of that definition are load-bearing.
 *
 * It measures within a speaker, not across the map. Neighbours from *different*
 * people are usually closer than a person's own consecutive statements — two
 * people can say near-identical things — so a resolution taken over everybody
 * comes out far too small for the question a region asks. On the built-in
 * examples that difference is roughly 2x, and at the smaller figure every
 * speaker's region shattered into four or five fragments.
 *
 * It is pooled into one number rather than kept per speaker. A speaker with
 * three statements has two or three distances to take a median of, which is not
 * an estimate of anything, and a per-speaker scale would draw a wide region and
 * a narrow one at different magnifications — leaving no way to tell which
 * speaker actually ranged further.
 *
 * The median, not the mean, so a handful of statements far from everything
 * cannot inflate the scale for the whole map.
 *
 * There is no tuned constant here. `floor` and `cell` are drawing concerns.
 *
 * ## Guarantee
 *
 * Every statement is inside its own speaker's region: the field at a statement
 * is at least 1, and the outline is drawn at 1/e.
 *
 * All coordinates are screen units. The region is a display device, not a
 * statistic, so it is computed where it is drawn rather than travelling through
 * the analysis.
 */

export type Point = [number, number]

/**
 * Statements needed on the map before a median neighbour distance means
 * anything. Three gives two or three numbers to take a median of.
 */
const MIN_POINTS_FOR_RESOLUTION = 4

/**
 * Contour level, as a share of one statement's influence.
 *
 * exp(-1) is not a tuning choice: with a Gaussian falloff it is the level at
 * which a lone statement's outline sits at exactly `reach`, which is what makes
 * `reach` mean what it says.
 */
const LEVEL = Math.exp(-1)

/** Grid spacing as a share of `reach`. Fine enough to resolve a single disk. */
const CELL_RATIO = 1 / 3.5

export interface Resolution {
  /** Radius one statement claims on its own, in screen units. */
  reach: number
  /** True when there were too few statements to measure one. */
  provisional: boolean
}

/**
 * The map's resolution, from statements grouped by who said them.
 *
 * Exported so the interface can report the number it drew with, rather than
 * asking the reader to take the shape on trust.
 */
export function mapResolution(
  bySpeaker: Point[][],
  floor: number,
): Resolution {
  const gaps: number[] = []
  for (const points of bySpeaker) {
    gaps.push(...nearestNeighbourDistances(points))
  }
  if (gaps.length < MIN_POINTS_FOR_RESOLUTION) {
    return { reach: floor, provisional: true }
  }
  gaps.sort((a, b) => a - b)
  const spacing = gaps[Math.floor(gaps.length / 2)]
  if (!Number.isFinite(spacing) || spacing <= floor) {
    return { reach: floor, provisional: true }
  }
  return { reach: spacing, provisional: false }
}

/**
 * Closed rings outlining the region, in screen units.
 *
 * More than one ring means the speaker's statements fall into groups too far
 * apart to hold together — which is a finding, not a rendering fault, so it is
 * drawn as separate shapes rather than joined by a thread.
 */
export function regionRings(points: Point[], reach: number): Point[][] {
  const usable = points.filter(
    ([x, y]) => Number.isFinite(x) && Number.isFinite(y),
  )
  if (usable.length === 0 || !(reach > 0)) return []

  const cell = Math.max(1, reach * CELL_RATIO)
  // Influence beyond three reaches is under 1e-4 and is skipped below, so the
  // contour cannot exist past that distance from the outermost statement.
  // Sampling that far out is what keeps every ring closed: a contour clipped by
  // the edge of the grid becomes an open chain, and an open chain closed by the
  // spline can cut across the very statements the region exists to contain.
  // One reach of margin is not enough — statements reinforce each other, so a
  // cluster's outline reaches further than any one of them does alone.
  const cutoff = reach * 3
  const margin = cutoff + cell
  const minX = Math.min(...usable.map((p) => p[0])) - margin
  const maxX = Math.max(...usable.map((p) => p[0])) + margin
  const minY = Math.min(...usable.map((p) => p[1])) - margin
  const maxY = Math.max(...usable.map((p) => p[1])) + margin

  const cols = Math.ceil((maxX - minX) / cell) + 1
  const rows = Math.ceil((maxY - minY) / cell) + 1

  const field = new Float64Array(cols * rows)
  for (let j = 0; j < rows; j += 1) {
    const y = minY + j * cell
    for (let i = 0; i < cols; i += 1) {
      const x = minX + i * cell
      let sum = 0
      for (const [px, py] of usable) {
        const dx = x - px
        const dy = y - py
        if (Math.abs(dx) > cutoff || Math.abs(dy) > cutoff) continue
        sum += Math.exp(-(dx * dx + dy * dy) / (reach * reach))
      }
      field[j * cols + i] = sum
    }
  }

  const at = (i: number, j: number) => field[j * cols + i]
  const px = (i: number) => minX + i * cell
  const py = (j: number) => minY + j * cell

  /** Where the level crosses between two samples, by linear interpolation. */
  const lerp = (a: number, b: number, va: number, vb: number) =>
    va === vb ? a : a + ((LEVEL - va) / (vb - va)) * (b - a)

  const segments: [Point, Point][] = []
  for (let j = 0; j < rows - 1; j += 1) {
    for (let i = 0; i < cols - 1; i += 1) {
      const v0 = at(i, j) // top-left
      const v1 = at(i + 1, j) // top-right
      const v2 = at(i + 1, j + 1) // bottom-right
      const v3 = at(i, j + 1) // bottom-left

      let code = 0
      if (v0 >= LEVEL) code |= 8
      if (v1 >= LEVEL) code |= 4
      if (v2 >= LEVEL) code |= 2
      if (v3 >= LEVEL) code |= 1
      if (code === 0 || code === 15) continue

      const top: Point = [lerp(px(i), px(i + 1), v0, v1), py(j)]
      const right: Point = [px(i + 1), lerp(py(j), py(j + 1), v1, v2)]
      const bottom: Point = [lerp(px(i), px(i + 1), v3, v2), py(j + 1)]
      const left: Point = [px(i), lerp(py(j), py(j + 1), v0, v3)]

      switch (code) {
        case 1:
        case 14:
          segments.push([left, bottom])
          break
        case 2:
        case 13:
          segments.push([bottom, right])
          break
        case 3:
        case 12:
          segments.push([left, right])
          break
        case 4:
        case 11:
          segments.push([top, right])
          break
        case 6:
        case 9:
          segments.push([top, bottom])
          break
        case 7:
        case 8:
          segments.push([left, top])
          break
        // Saddles: two crossings in one cell, and which pair connects depends
        // on the centre. Guessing produces rings that cross each other.
        case 5:
        case 10: {
          const centre = (v0 + v1 + v2 + v3) / 4
          const joinTopLeft = code === 5 ? centre >= LEVEL : centre < LEVEL
          if (joinTopLeft) {
            segments.push([left, top], [bottom, right])
          } else {
            segments.push([left, bottom], [top, right])
          }
          break
        }
      }
    }
  }

  return stitch(segments, cell)
}

/**
 * Joins marching-squares segments into closed rings.
 *
 * The walk is undirected. Orienting every case of the lookup table so that the
 * inside stays on one side is the usual way to make segments chain head to
 * tail, and getting a single case backwards silently splits one ring into two —
 * which is exactly the kind of defect that looks like a rendering glitch and
 * gets fixed by tweaking something unrelated. Following the graph from either
 * end instead removes the possibility.
 *
 * Segments meet exactly at shared cell edges, so endpoints are matched on a key
 * quantised well below the grid spacing rather than by floating-point equality.
 */
function stitch(segments: [Point, Point][], cell: number): Point[][] {
  if (segments.length === 0) return []

  const quantum = cell / 1000
  const key = (p: Point) =>
    `${Math.round(p[0] / quantum)},${Math.round(p[1] / quantum)}`

  /** Segment indices touching each endpoint. A clean contour has two. */
  const touching = new Map<string, number[]>()
  segments.forEach((seg, index) => {
    for (const end of seg) {
      const k = key(end)
      const list = touching.get(k)
      if (list) list.push(index)
      else touching.set(k, [index])
    }
  })

  const used = new Array<boolean>(segments.length).fill(false)
  const rings: Point[][] = []

  for (let start = 0; start < segments.length; start += 1) {
    if (used[start]) continue

    used[start] = true
    const ring: Point[] = [segments[start][0], segments[start][1]]
    let head = segments[start][1]

    // Every step consumes a segment, so the walk cannot outlast the supply.
    for (let guard = 0; guard < segments.length; guard += 1) {
      const next = (touching.get(key(head)) ?? []).find((i) => !used[i])
      if (next === undefined) break
      used[next] = true
      const [a, b] = segments[next]
      head = key(a) === key(head) ? b : a
      ring.push(head)
      if (key(head) === key(ring[0])) break
    }

    // A ring needs three distinct corners to enclose anything; anything shorter
    // is a stray segment left on the sampled boundary.
    if (ring.length > 3) rings.push(ring)
  }

  return rings
}

/**
 * An SVG path for the rings, each as a closed Catmull-Rom spline.
 *
 * The field is already smooth, so this only softens the grid's own stair-step;
 * the curve passes through every vertex, so it cannot pull the outline inside a
 * statement it was drawn to contain.
 */
export function regionPath(rings: Point[][]): string {
  return rings
    .map((ring) => splinePath(dedupe(ring)))
    .filter(Boolean)
    .join('')
}

function splinePath(ring: Point[]): string {
  const n = ring.length
  if (n < 3) return ''

  const parts: string[] = [`M${round(ring[0][0])},${round(ring[0][1])}`]
  for (let i = 0; i < n; i += 1) {
    const p0 = ring[wrap(i - 1, n)]
    const p1 = ring[i]
    const p2 = ring[wrap(i + 1, n)]
    const p3 = ring[wrap(i + 2, n)]
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

/** Drops the repeated closing vertex and any coincident neighbours. */
function dedupe(ring: Point[]): Point[] {
  const out: Point[] = []
  for (const p of ring) {
    const last = out[out.length - 1]
    if (last && Math.hypot(p[0] - last[0], p[1] - last[1]) < 1e-6) continue
    out.push(p)
  }
  const first = out[0]
  const last = out[out.length - 1]
  if (out.length > 1 && first && last && Math.hypot(first[0] - last[0], first[1] - last[1]) < 1e-6) {
    out.pop()
  }
  return out
}

/** Area enclosed by a ring; used to order regions largest-first. */
export function polygonArea(polygon: Point[]): number {
  let sum = 0
  for (let i = 0; i < polygon.length; i += 1) {
    const [x1, y1] = polygon[i]
    const [x2, y2] = polygon[wrap(i + 1, polygon.length)]
    sum += x1 * y2 - x2 * y1
  }
  return Math.abs(sum) / 2
}

/** Total area of a region's rings. */
export function ringsArea(rings: Point[][]): number {
  return rings.reduce((sum, ring) => sum + polygonArea(ring), 0)
}

/** True when `point` is inside `polygon`. Exported for the coverage tests. */
export function contains(polygon: Point[], point: Point): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    const crosses = yi > point[1] !== yj > point[1]
    if (crosses && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

/** True when `point` is inside any of the rings. */
export function containsAny(rings: Point[][], point: Point): boolean {
  return rings.some((ring) => contains(ring, point))
}

/** Distance from each point to its closest neighbour within the same group. */
function nearestNeighbourDistances(points: Point[]): number[] {
  if (points.length < 2) return []
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
  return nearest
}

function wrap(i: number, n: number): number {
  return ((i % n) + n) % n
}

function round(v: number): number {
  return Math.round(v * 100) / 100
}
