/**
 * Projection from embedding space to 2D.
 *
 * PCA is the default because it is linear, and linearity is what makes speaker
 * centroids well defined here: project(mean(v)) === mean(project(v)) only for a
 * linear map. Under UMAP or t-SNE, averaging projected coordinates is
 * meaningless, so a speaker's position would depend on which operation came
 * first. See `aggregate.ts`.
 *
 * Implemented directly rather than pulled from a library: the operations needed
 * are a covariance power iteration and a classical MDS eigendecomposition, both
 * short, and this keeps the server bundle small.
 */

export type Vector = number[]

/** Subtracts the column-wise mean, returning the centred copy and the mean. */
export function center(vectors: Vector[]): { centered: Vector[]; mean: Vector } {
  const n = vectors.length
  if (n === 0) return { centered: [], mean: [] }
  const dim = vectors[0].length
  const mean = new Array<number>(dim).fill(0)

  for (const v of vectors) {
    for (let d = 0; d < dim; d++) mean[d] += v[d]
  }
  for (let d = 0; d < dim; d++) mean[d] /= n

  const centered = vectors.map((v) => v.map((x, d) => x - mean[d]))
  return { centered, mean }
}

function dot(a: Vector, b: Vector): number {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * b[i]
  return s
}

function norm(v: Vector): number {
  return Math.sqrt(dot(v, v))
}

function scale(v: Vector, k: number): Vector {
  return v.map((x) => x * k)
}

/** Deterministic pseudo-random unit vector; seeded so results are reproducible. */
function seededVector(dim: number, seed: number): Vector {
  let state = seed >>> 0
  const v = new Array<number>(dim)
  for (let i = 0; i < dim; i++) {
    // xorshift32
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    state >>>= 0
    v[i] = (state / 0xffffffff) * 2 - 1
  }
  const len = norm(v) || 1
  return scale(v, 1 / len)
}

/**
 * Leading eigenvector of X^T X by power iteration, without materialising the
 * covariance matrix (which would be dim x dim — 1536^2 for these embeddings).
 */
function leadingEigenvector(
  centered: Vector[],
  dim: number,
  seed: number,
  iterations = 128,
): { vector: Vector; eigenvalue: number } {
  let v = seededVector(dim, seed)

  for (let iter = 0; iter < iterations; iter++) {
    const next = new Array<number>(dim).fill(0)
    // next = X^T (X v)
    for (const row of centered) {
      const proj = dot(row, v)
      if (proj === 0) continue
      for (let d = 0; d < dim; d++) next[d] += proj * row[d]
    }
    const len = norm(next)
    if (len < 1e-12) break
    const normalized = scale(next, 1 / len)

    // Stop once the direction is stable.
    const delta = 1 - Math.abs(dot(normalized, v))
    v = normalized
    if (delta < 1e-10) break
  }

  // Rayleigh quotient gives the eigenvalue (total squared projection).
  let eigenvalue = 0
  for (const row of centered) {
    const proj = dot(row, v)
    eigenvalue += proj * proj
  }

  return { vector: v, eigenvalue }
}

/** Removes the component along `direction` from every row, in place. */
function deflate(centered: Vector[], direction: Vector): void {
  for (const row of centered) {
    const proj = dot(row, direction)
    if (proj === 0) continue
    for (let d = 0; d < row.length; d++) row[d] -= proj * direction[d]
  }
}

export interface PcaModel {
  mean: Vector
  /** The two leading principal directions. */
  components: [Vector, Vector]
  /** Variance captured per component, as a fraction of the total. */
  componentVariance: [number, number]
  /** Combined fraction of variance captured by both components. */
  explainedVariance: number
}

/**
 * Fits a 2-component PCA.
 *
 * Fit on the utterance vectors only, then apply to both utterances and speaker
 * centroids, so the two live in the same space by construction.
 */
export function fitPca(vectors: Vector[]): PcaModel | null {
  if (vectors.length < 2) return null
  const dim = vectors[0].length
  const { centered, mean } = center(vectors)

  // Total variance, for the explained-variance ratio.
  let total = 0
  for (const row of centered) total += dot(row, row)
  if (total < 1e-12) return null

  // Work on a copy: deflation is destructive.
  const work = centered.map((row) => [...row])

  const first = leadingEigenvector(work, dim, 0x9e3779b9)
  deflate(work, first.vector)
  const second = leadingEigenvector(work, dim, 0x85ebca6b)

  return {
    mean,
    components: [first.vector, second.vector],
    componentVariance: [first.eigenvalue / total, second.eigenvalue / total],
    explainedVariance: (first.eigenvalue + second.eigenvalue) / total,
  }
}

/** Projects a vector through a fitted PCA model. */
export function applyPca(model: PcaModel, v: Vector): [number, number] {
  const d = v.map((x, i) => x - model.mean[i])
  return [dot(d, model.components[0]), dot(d, model.components[1])]
}

/**
 * Classical metric MDS on cosine distances, via the same power iteration.
 *
 * Unlike PCA this has no out-of-sample projection, so speaker centroids must be
 * included in the input matrix rather than projected afterwards.
 */
export function classicalMds(vectors: Vector[]): [number, number][] | null {
  const n = vectors.length
  if (n < 2) return null

  // Cosine distance matrix.
  const norms = vectors.map((v) => norm(v) || 1)
  const d2: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0))
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const cos = dot(vectors[i], vectors[j]) / (norms[i] * norms[j])
      const dist = Math.max(0, 1 - cos)
      const sq = dist * dist
      d2[i][j] = sq
      d2[j][i] = sq
    }
  }

  // Double centring: B = -1/2 J D^2 J
  const rowMean = d2.map((row) => row.reduce((a, b) => a + b, 0) / n)
  const grandMean = rowMean.reduce((a, b) => a + b, 0) / n
  const b: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0))
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      b[i][j] = -0.5 * (d2[i][j] - rowMean[i] - rowMean[j] + grandMean)
    }
  }

  // Two leading eigenpairs of B by power iteration.
  const eig = (matrix: number[][], seed: number) => {
    let v = seededVector(n, seed)
    let lambda = 0
    for (let iter = 0; iter < 256; iter++) {
      const next = new Array<number>(n).fill(0)
      for (let i = 0; i < n; i++) {
        let s = 0
        for (let j = 0; j < n; j++) s += matrix[i][j] * v[j]
        next[i] = s
      }
      const len = norm(next)
      if (len < 1e-12) return { vector: v, lambda: 0 }
      const normalized = scale(next, 1 / len)
      const delta = 1 - Math.abs(dot(normalized, v))
      v = normalized
      lambda = len
      if (delta < 1e-12) break
    }
    return { vector: v, lambda }
  }

  const e1 = eig(b, 0xc2b2ae35)
  // Deflate: B' = B - lambda * v v^T
  const b2 = b.map((row, i) => row.map((x, j) => x - e1.lambda * e1.vector[i] * e1.vector[j]))
  const e2 = eig(b2, 0x27d4eb2f)

  const s1 = Math.sqrt(Math.max(0, e1.lambda))
  const s2 = Math.sqrt(Math.max(0, e2.lambda))

  return vectors.map((_, i) => [e1.vector[i] * s1, e2.vector[i] * s2] as [number, number])
}
