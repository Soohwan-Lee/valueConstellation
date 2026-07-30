import type { ValueKey } from '../types'
import { VALUE_KEYS } from '../types'

// ─── Cluster Palette ──────────────────────────────────────────────────────────

export const CLUSTER_COLORS: Record<number, { base: string; light: string; text: string }> = {
  0: { base: '#ef4444', light: '#fef2f2', text: '#b91c1c' },
  1: { base: '#f97316', light: '#fff7ed', text: '#c2410c' },
  2: { base: '#14b8a6', light: '#f0fdfa', text: '#0f766e' },
  3: { base: '#8b5cf6', light: '#f5f3ff', text: '#6d28d9' },
  4: { base: '#64748b', light: '#f8fafc', text: '#334155' },
  5: { base: '#eab308', light: '#fefce8', text: '#a16207' },
}

export function clusterColor(id: number) {
  return CLUSTER_COLORS[id] ?? { base: '#94a3b8', light: '#f8fafc', text: '#475569' }
}

// ─── Speaker Palette (colors match the backend HTML reference) ────────────────

export const SPEAKER_PALETTE: Record<string, { base: string; light: string }> = {
  정의당:   { base: '#eab308', light: '#fefce8' }, // yellow  (matches HTML)
  민주당:   { base: '#2563eb', light: '#eff6ff' }, // blue    (matches HTML)
  개혁신당:  { base: '#f97316', light: '#fff7ed' }, // orange  (matches HTML)
  국민의힘:  { base: '#dc2626', light: '#fef2f2' }, // red     (matches HTML)
  조국혁신당: { base: '#7c3aed', light: '#f5f3ff' }, // purple  (matches HTML)
}

export function speakerPalette(speaker: string) {
  return SPEAKER_PALETTE[speaker] ?? { base: '#94a3b8', light: '#f8fafc' }
}

// ─── Value Sorting ────────────────────────────────────────────────────────────

export function sortValuesByMagnitude(
  values: Record<ValueKey, { signed: number }>,
): ValueKey[] {
  return [...VALUE_KEYS].sort(
    (a, b) => Math.abs(values[b].signed) - Math.abs(values[a].signed),
  )
}

export function activeValueKeys(
  values: Record<ValueKey, { signed: number }>,
  threshold: number,
): ValueKey[] {
  return sortValuesByMagnitude(values).filter(
    (k) => Math.abs(values[k].signed) >= threshold,
  )
}

// ─── Schwartz Groups ──────────────────────────────────────────────────────────

export const SCHWARTZ_GROUPS: Array<{
  label: string
  color: string
  keys: ValueKey[]
}> = [
  {
    label: 'Openness to Change',
    color: '#6366f1',
    keys: ['self_direction_thought', 'self_direction_action', 'stimulation'],
  },
  {
    label: 'Self-Enhancement',
    color: '#f59e0b',
    keys: ['hedonism', 'achievement', 'power_dominance', 'power_resources', 'face'],
  },
  {
    label: 'Conservation',
    color: '#64748b',
    keys: [
      'security_personal', 'security_societal', 'tradition',
      'conformity_rules', 'conformity_interpersonal', 'humility',
    ],
  },
  {
    label: 'Self-Transcendence',
    color: '#14b8a6',
    keys: [
      'benevolence_caring', 'benevolence_dependability',
      'universalism_concern', 'universalism_nature', 'universalism_tolerance',
    ],
  },
]

// ─── Format Helpers ───────────────────────────────────────────────────────────

export function formatSigned(v: number): string {
  if (Math.abs(v) < 0.0005) return '0.00'
  const prefix = v > 0 ? '+' : '−'
  return `${prefix}${Math.abs(v).toFixed(2)}`
}

export function pct(v: number, max: number): number {
  if (max === 0) return 0
  return Math.min((Math.abs(v) / max) * 100, 100)
}
