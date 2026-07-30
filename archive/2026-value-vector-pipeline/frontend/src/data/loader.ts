/**
 * Loads real data from ../results/policy_discussion/ via the Vite /data/ route.
 *
 * Files used:
 *   /data/policy_discussion/full_argument_vectors.csv
 *   /data/policy_discussion/full_argument_projection_compare.csv
 *   /data/policy_discussion/full_argument_projection_compare_metadata.json
 */

import Papa from 'papaparse'
import type { Argument, ClusterMeta, ValueKey, ProjectionMethod } from '../types'
import { VALUE_KEYS } from '../types'

const BASE = '/data/policy_discussion'

// ─── CSV row shapes ───────────────────────────────────────────────────────────

interface VectorRow {
  unit_id: string
  speaker: string
  time: string
  korean_text: string
  english_text: string
  [col: string]: string // presence__*, signed__*, support__*, constraint__*
}

interface ProjectionRow {
  unit_id: string
  speaker: string
  time: string
  korean_text: string
  english_text: string
  projection_method: string
  x: string
  y: string
  cluster_id: string
}

// ─── Metadata JSON shape ──────────────────────────────────────────────────────

interface MetadataJson {
  methods: Record<
    string,
    {
      clusters: Array<{
        cluster_id: number
        size: number
        top_signed_values: Array<{ value: string; mean_signed: number }>
      }>
    }
  >
  llm_labels: {
    clusters: Array<{ cluster_id: number; label: string }>
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseCsv<T>(text: string): T[] {
  const result = Papa.parse<T>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.replace(/^﻿/, ''), // strip BOM
  })
  return result.data
}

async function fetchText(url: string): Promise<string> {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`)
  return r.text()
}

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`)
  return r.json() as Promise<T>
}

// ─── Main loader ──────────────────────────────────────────────────────────────

export interface LoadResult {
  arguments: Argument[]
  clusters: ClusterMeta[]
  source: string
}

export async function loadFromCsv(): Promise<LoadResult> {
  const [vectorText, projText, meta] = await Promise.all([
    fetchText(`${BASE}/full_argument_vectors.csv`),
    fetchText(`${BASE}/full_argument_projection_compare.csv`),
    fetchJson<MetadataJson>(`${BASE}/full_argument_projection_compare_metadata.json`),
  ])

  const vectorRows = parseCsv<VectorRow>(vectorText)
  const projRows = parseCsv<ProjectionRow>(projText)

  // ── Build 19D value map keyed by unit_id ──────────────────────────────────
  const valueMap = new Map<string, Argument['values']>()

  for (const row of vectorRows) {
    const values = {} as Argument['values']
    for (const key of VALUE_KEYS) {
      const presence  = parseFloat(row[`presence__${key}`])  || 0
      const signed    = parseFloat(row[`signed__${key}`])    || 0
      const support   = parseFloat(row[`support__${key}`])   || 0
      const constraint = parseFloat(row[`constraint__${key}`]) || 0
      values[key] = { presence, signed, support, constraint }
    }
    valueMap.set(row.unit_id, values)
  }

  // ── Build projection map: unit_id → method → {x, y} ─────────────────────
  type ProjEntry = {
    info: ProjectionRow
    methods: Partial<Record<ProjectionMethod, { x: number; y: number }>>
  }
  const projMap = new Map<string, ProjEntry>()

  for (const row of projRows) {
    if (!projMap.has(row.unit_id)) {
      projMap.set(row.unit_id, { info: row, methods: {} })
    }
    const entry = projMap.get(row.unit_id)!
    const method = row.projection_method as ProjectionMethod
    entry.methods[method] = { x: parseFloat(row.x) || 0, y: parseFloat(row.y) || 0 }
  }

  // ── Join into Argument objects ────────────────────────────────────────────
  const args: Argument[] = []
  const FALLBACK: { x: number; y: number } = { x: 0, y: 0 }

  for (const [unitId, { info, methods }] of projMap) {
    const values = valueMap.get(unitId)
    if (!values) continue

    args.push({
      unit_id: unitId,
      speaker: info.speaker,
      time: info.time,
      korean_text: info.korean_text,
      english_text: info.english_text,
      values,
      projections: {
        pca:  methods['pca']  ?? FALLBACK,
        mds:  methods['mds']  ?? FALLBACK,
        tsne: methods['tsne'] ?? FALLBACK,
        umap: methods['umap'] ?? FALLBACK,
      },
      cluster_id: parseInt(info.cluster_id) || 0,
    })
  }

  // ── Build cluster metadata ────────────────────────────────────────────────
  const labelMap = new Map(
    meta.llm_labels.clusters.map((c) => [c.cluster_id, c.label]),
  )

  const pcaClusters = meta.methods['pca']?.clusters ?? []

  const clusters: ClusterMeta[] = pcaClusters.map((c) => ({
    cluster_id: c.cluster_id,
    label: labelMap.get(c.cluster_id) ?? `Cluster ${c.cluster_id}`,
    size: c.size,
    topValues: c.top_signed_values
      .filter((v) => VALUE_KEYS.includes(v.value as ValueKey))
      .map((v) => ({ value: v.value as ValueKey, mean_signed: v.mean_signed })),
  }))

  return {
    arguments: args,
    clusters,
    source: `full_argument_vectors.csv · ${args.length} args`,
  }
}
