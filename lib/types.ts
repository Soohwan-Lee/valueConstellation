import type { AxisLabels } from './axes.ts'
import type { SpeakerNames } from './speakers.ts'
import type { SpeakerSummaries } from './summaries.ts'
import type { Attribution } from './aggregate.ts'

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
  /**
   * Clock time of the turn this came from, as written in the transcript.
   *
   * Absent whenever the source line carried no timestamp, which is most
   * transcripts. Nothing may require it: a paste without times is the normal
   * case, and everything the map says has to hold for that reader too.
   */
  at?: string
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

/**
 * How the map is laid out.
 *
 * `people` fits the plane to the speaker centroids, so it shows the
 * participants apart. `pca` fits it to the statements, so the axes describe
 * what the room talked about. `mds` preserves pairwise distance instead of
 * finding directions at all.
 */
export type ProjectionMethod = 'people' | 'pca' | 'mds'

/**
 * Diagnostics for one projection. `explainedVariance` is why the UI can warn
 * that a 2D view does not represent the original space well — reporting it is
 * cheaper than being wrong about who clusters.
 */
export interface ProjectionMeta {
  method: ProjectionMethod
  /**
   * How much of what the layout was fitted to survived the flattening.
   *
   * For `pca` that is all variation among the statements, which on real
   * transcripts runs 10-25% — most of a sentence embedding is topic and
   * phrasing, and two dimensions cannot hold it. For `people` it is the
   * variation *between the speakers*, which is the thing the map is about and
   * which two dimensions hold almost all of. Null for MDS, which does not fit
   * directions and so has nothing to report a share of.
   */
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
   * How often a statement is nearest the centre of whoever said it, measured
   * leave-one-out in embedding space.
   *
   * The trust figure a reader can hold: if the map handed you a statement with
   * the name torn off, how often would its position give the name back.
   * `chance` is what guessing would score, so the two together say whether the
   * map knows anything at all.
   */
  attribution: Attribution | null
  /**
   * True when the layout's own share is arithmetic rather than evidence.
   *
   * Two axes always hold every statement exactly when there are barely any, and
   * always hold every speaker exactly when there are three or fewer — three
   * points define a plane. In both cases the figure is a property of counting,
   * not of the meeting.
   */
  fitSaturated: boolean
  /**
   * With two speakers there is only one direction between them, so the second
   * axis shows within-speaker variation instead. `people` layout only.
   */
  secondAxisFromResiduals: boolean
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
  /**
   * Each speaker's name written in English, keyed by the name as spoken.
   *
   * The interface switches language on everything else, so leaving names in one
   * script means an English reader gets labels they cannot read on the one
   * thing they have to read. Null when the rendering could not be produced —
   * the original is shown, which is what every earlier map does.
   */
  speakerNames: SpeakerNames | null
  /**
   * What each participant argued, keyed by the name as spoken.
   *
   * Read from the statements rather than from the map, so it says the same
   * thing whichever layout is on screen. Null when the model could not be
   * reached or when nobody said enough for a position to be readable.
   */
  speakerSummaries: SpeakerSummaries | null
}

/** How a speaker is drawn. Which of these is right is an empirical question. */
export type SpeakerRenderMode = 'point' | 'region' | 'both'
