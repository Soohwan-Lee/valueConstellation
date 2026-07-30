// ─── Value Dimension Keys ───────────────────────────────────────────────────
// 19 refined Schwartz values from ValueEval / VictorYeste models

export const VALUE_KEYS = [
  'self_direction_thought',
  'self_direction_action',
  'stimulation',
  'hedonism',
  'achievement',
  'power_dominance',
  'power_resources',
  'face',
  'security_personal',
  'security_societal',
  'tradition',
  'conformity_rules',
  'conformity_interpersonal',
  'humility',
  'benevolence_caring',
  'benevolence_dependability',
  'universalism_concern',
  'universalism_nature',
  'universalism_tolerance',
] as const

export type ValueKey = (typeof VALUE_KEYS)[number]

export const VALUE_DISPLAY: Record<ValueKey, string> = {
  self_direction_thought: 'Self-dir: thought',
  self_direction_action: 'Self-dir: action',
  stimulation: 'Stimulation',
  hedonism: 'Hedonism',
  achievement: 'Achievement',
  power_dominance: 'Power: dominance',
  power_resources: 'Power: resources',
  face: 'Face',
  security_personal: 'Security: personal',
  security_societal: 'Security: societal',
  tradition: 'Tradition',
  conformity_rules: 'Conformity: rules',
  conformity_interpersonal: 'Conformity: interpers.',
  humility: 'Humility',
  benevolence_caring: 'Benevolence: caring',
  benevolence_dependability: 'Benevolence: depend.',
  universalism_concern: 'Universalism: concern',
  universalism_nature: 'Universalism: nature',
  universalism_tolerance: 'Universalism: tolerance',
}

// Schwartz higher-order grouping for color-coding in the chart
export const VALUE_GROUP: Record<ValueKey, string> = {
  self_direction_thought: 'Openness',
  self_direction_action: 'Openness',
  stimulation: 'Openness',
  hedonism: 'Self-Enhancement',
  achievement: 'Self-Enhancement',
  power_dominance: 'Self-Enhancement',
  power_resources: 'Self-Enhancement',
  face: 'Self-Enhancement',
  security_personal: 'Conservation',
  security_societal: 'Conservation',
  tradition: 'Conservation',
  conformity_rules: 'Conservation',
  conformity_interpersonal: 'Conservation',
  humility: 'Self-Transcendence',
  benevolence_caring: 'Self-Transcendence',
  benevolence_dependability: 'Self-Transcendence',
  universalism_concern: 'Self-Transcendence',
  universalism_nature: 'Self-Transcendence',
  universalism_tolerance: 'Self-Transcendence',
}

// ─── Core Data Types ─────────────────────────────────────────────────────────

export interface ValueScore {
  /** P(value present) */
  presence: number
  /** presence × (P(attained) − P(constrained))  ∈ [−1, 1] */
  signed: number
  /** max(0, signed) */
  support: number
  /** max(0, −signed) */
  constraint: number
}

export type ProjectionMethod = 'pca' | 'mds' | 'tsne' | 'umap'

export const PROJECTION_LABELS: Record<ProjectionMethod, string> = {
  pca: 'PCA',
  mds: 'Metric MDS',
  tsne: 't-SNE',
  umap: 'UMAP',
}

export interface Point2D {
  x: number
  y: number
}

export interface Argument {
  unit_id: string
  speaker: string
  /** Timestamp label in the transcript (e.g. "00:50") */
  time: string
  korean_text: string
  english_text: string
  /** 19D value scores */
  values: Record<ValueKey, ValueScore>
  /** 2D projection coordinates for each method */
  projections: Record<ProjectionMethod, Point2D>
  cluster_id: number
}

// ─── Cluster Metadata ─────────────────────────────────────────────────────────

export interface ClusterMeta {
  cluster_id: number
  /** Editable label — starts from LLM suggestion */
  label: string
  size: number
  topValues: Array<{ value: ValueKey; mean_signed: number }>
}

// ─── UI State ────────────────────────────────────────────────────────────────

export type ColorMode = 'cluster' | 'speaker'

export interface UIFilters {
  visibleSpeakers: Set<string>
  activeThreshold: number
}
