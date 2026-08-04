import type { AxisLabels } from './axes.ts'

/** What kind of contribution an utterance makes to the discussion. */
export type UtteranceKind =
  /** A substantive position, usually with reasons or implications. */
  | 'claim'
  /** Asking rather than asserting. */
  | 'question'
  /** Pure assent with no added content ("네", "맞아요"). */
  | 'agreement'
  /** Process talk: agenda, turn-taking, logistics. */
  | 'procedural'

/** One unit of speech, at argument granularity rather than turn or sentence. */
export interface Utterance {
  id: string
  speaker: string
  /** Original text, as spoken. */
  text: string
  /** English rendering, when the source is not English. Display only. */
  textEn?: string
  kind: UtteranceKind
  /** Position in the transcript, used for ordering and trajectories. */
  index: number
}

/**
 * A speaker's position, aggregated from their utterances.
 *
 * `spread` and `n` are as load-bearing as `x`/`y`: a centroid drawn from two
 * utterances is not the same claim as one drawn from forty, and the interface
 * must not render them identically.
 */
export interface SpeakerProfile {
  speaker: string
  /** Colour slot index, assigned in order of first appearance. */
  colorIndex: number
  /** Utterances that contributed to the centroid. */
  n: number
  /** Utterances excluded as agreement/procedural, kept for false-consensus analysis. */
  nExcluded: number
  x: number
  y: number
  /** 1-SD ellipse of the speaker's utterance positions. */
  ellipse: Ellipse | null
  /**
   * True when `n` is too small for the centroid to mean anything. The UI must
   * mark these rather than drawing a confident point.
   */
  underdetermined: boolean
}

/** A 1-SD covariance ellipse in projected space. */
export interface Ellipse {
  cx: number
  cy: number
  /** Semi-major axis. */
  rx: number
  /** Semi-minor axis. */
  ry: number
  /** Rotation in degrees, counter-clockwise from the x-axis. */
  angle: number
}

/** An utterance with its projected coordinates. */
export interface ProjectedUtterance extends Utterance {
  x: number
  y: number
}

export type ProjectionMethod = 'pca' | 'mds'

/**
 * Diagnostics for one projection. `explainedVariance` is why the UI can warn
 * that a 2D view does not represent the original space well — reporting it is
 * cheaper than being wrong about who clusters.
 */
export interface ProjectionMeta {
  method: ProjectionMethod
  /** Fraction of total variance captured by the two components (PCA only). */
  explainedVariance: number | null
  /** Per-axis share, when meaningful. */
  componentVariance: [number, number] | null
  /** Utterances the projection was fitted on. */
  fittedOn: number
  /**
   * True when there are too few points for explained variance to mean anything:
   * n points always fit an (n-1)-dimensional space exactly, so three utterances
   * yield 100% by arithmetic rather than by capturing real structure. Without
   * this, the weakest possible input displays as maximum confidence.
   */
  saturated: boolean
  /**
   * Mean between-speaker distance over mean within-speaker spread.
   *
   * Below 1, each speaker's own statements scatter further than the speakers sit
   * apart, so the centroids are not distinguishing anybody and the layout is
   * driven by topic rather than by who is talking.
   */
  separation: number | null
  /**
   * Names for the two axes, from the statements at each end.
   *
   * Only ever present for PCA, whose axes are by construction the directions
   * the statements differ on most. MDS orientation is arbitrary — rotate the
   * picture and nothing is lost — so naming those directions would be inventing
   * meaning. Null also when there were too few statements for the ends to be
   * different from each other.
   */
  axes: AxisLabels | null
}

export interface Projection {
  utterances: ProjectedUtterance[]
  speakers: SpeakerProfile[]
  meta: ProjectionMeta
}

/** Everything the map needs, for both projection methods. */
export interface AnalysisResult {
  projections: Record<ProjectionMethod, Projection>
  /** Utterance count by kind, including the kinds excluded from the map. */
  counts: Record<UtteranceKind, number>
  /** Speakers dropped for having no mappable utterances. */
  droppedSpeakers: string[]
}

/** How a speaker is drawn. Which of these is right is an empirical question. */
export type SpeakerRenderMode = 'point' | 'region' | 'both'
