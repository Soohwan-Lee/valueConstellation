import { useMemo, useRef, useState } from 'react'
import type { Argument, ProjectionMethod, ColorMode, ClusterMeta } from '../types'
import { PROJECTION_LABELS } from '../types'
import { clusterColor, speakerPalette } from '../utils/valueUtils'

const PROJECTION_METHODS: ProjectionMethod[] = ['pca', 'mds', 'tsne', 'umap']

const W = 640
const H = 500
const PAD = 40

interface ScaledPoint { arg: Argument; sx: number; sy: number }

function scalePoints(args: Argument[], method: ProjectionMethod): ScaledPoint[] {
  if (args.length === 0) return []
  const xs = args.map((a) => a.projections[method].x)
  const ys = args.map((a) => a.projections[method].y)
  const xMin = Math.min(...xs), xMax = Math.max(...xs)
  const yMin = Math.min(...ys), yMax = Math.max(...ys)
  const xSpan = xMax - xMin || 1
  const ySpan = yMax - yMin || 1
  const pad = 0.1
  const toSx = (x: number) =>
    PAD + ((x - xMin + xSpan * pad) / (xSpan * (1 + pad * 2))) * (W - PAD * 2)
  const toSy = (y: number) =>
    H - PAD - ((y - yMin + ySpan * pad) / (ySpan * (1 + pad * 2))) * (H - PAD * 2)
  return args.map((a) => ({
    arg: a,
    sx: toSx(a.projections[method].x),
    sy: toSy(a.projections[method].y),
  }))
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
interface TooltipState { clientX: number; clientY: number; arg: Argument }

function MapTooltip({ state }: { state: TooltipState | null }) {
  if (!state) return null
  const { clientX, clientY, arg } = state
  const cc = clusterColor(arg.cluster_id)
  const sp = speakerPalette(arg.speaker)

  // Figure out top active value for display
  const topEntry = Object.entries(arg.values)
    .map(([k, v]) => ({ k, signed: v.signed }))
    .filter((e) => Math.abs(e.signed) >= 0.02)
    .sort((a, b) => Math.abs(b.signed) - Math.abs(a.signed))[0]

  return (
    <div
      className="tooltip-enter fixed z-50 pointer-events-none"
      style={{ left: clientX + 16, top: clientY - 12 }}
    >
      <div className="bg-slate-900 rounded-xl shadow-tooltip px-3.5 py-3 max-w-[300px]">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: sp.base + '35', color: sp.base }}
          >
            {arg.speaker}
          </span>
          <span className="text-slate-400 text-[10px] font-mono">{arg.time}</span>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-medium ml-auto"
            style={{ background: cc.base + '30', color: cc.base }}
          >
            C{arg.cluster_id}
          </span>
        </div>
        {topEntry && (
          <div className="text-[10px] mb-1.5" style={{ color: topEntry.signed > 0 ? '#5eead4' : '#fca5a5' }}>
            {topEntry.k.replace(/_/g, ' ')} {topEntry.signed > 0 ? '+' : ''}{topEntry.signed.toFixed(2)}
          </div>
        )}
        <p className="text-white text-xs leading-relaxed mb-1.5">
          {arg.korean_text.length > 100 ? arg.korean_text.slice(0, 100) + '…' : arg.korean_text}
        </p>
        <p className="text-slate-400 text-[10px] leading-relaxed italic line-clamp-2">
          {arg.english_text}
        </p>
      </div>
    </div>
  )
}

// ── Cluster legend (footer) ───────────────────────────────────────────────────
interface LegendProps {
  clusters: ClusterMeta[]
  selectedCluster: number | null
  onSelect: (id: number | null) => void
  onUpdateLabel: (id: number, label: string) => void
}

function ClusterLegend({ clusters, selectedCluster, onSelect, onUpdateLabel }: LegendProps) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')

  return (
    <div className="flex flex-wrap gap-1.5 px-4 py-2.5 border-t border-slate-100">
      {clusters.map((c) => {
        const cc = clusterColor(c.cluster_id)
        const active = selectedCluster === c.cluster_id
        const isEditing = editingId === c.cluster_id
        return (
          <button
            key={c.cluster_id}
            onClick={() => !isEditing && onSelect(active ? null : c.cluster_id)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border"
            style={{
              borderColor: cc.base + '55',
              background: active ? cc.base : cc.light,
              color: active ? '#fff' : cc.text,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full flex-none"
              style={{ background: active ? '#fff' : cc.base }} />
            {isEditing ? (
              <input
                autoFocus
                className="bg-transparent outline-none border-b border-current text-[11px] w-28"
                value={editValue}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => { if (editValue.trim()) onUpdateLabel(c.cluster_id, editValue.trim()); setEditingId(null) }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { if (editValue.trim()) onUpdateLabel(c.cluster_id, editValue.trim()); setEditingId(null) }
                  if (e.key === 'Escape') setEditingId(null)
                }}
              />
            ) : (
              <span className="max-w-[130px] truncate">{c.label}</span>
            )}
            <span className="text-[9px] px-1 py-0.5 rounded-full font-mono opacity-70">
              {c.size}
            </span>
            <span
              className="opacity-40 hover:opacity-80 transition-opacity"
              onClick={(e) => { e.stopPropagation(); setEditingId(c.cluster_id); setEditValue(c.label) }}
            >✎</span>
          </button>
        )
      })}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
interface Props {
  arguments: Argument[]
  selectedId: string | null
  selectedCluster: number | null
  projectionMethod: ProjectionMethod
  colorMode: ColorMode
  clusters: ClusterMeta[]
  /** true when all 4 projection methods have real (non-simulated) coordinates */
  hasRealProjections: boolean
  onSelect: (id: string | null) => void
  onProjectionChange: (m: ProjectionMethod) => void
  onColorModeChange: (m: ColorMode) => void
  onSelectCluster: (id: number | null) => void
  onUpdateClusterLabel: (id: number, label: string) => void
}

export function ArgumentMap({
  arguments: args,
  selectedId,
  selectedCluster,
  projectionMethod,
  colorMode,
  clusters,
  hasRealProjections,
  onSelect,
  onProjectionChange,
  onColorModeChange,
  onSelectCluster,
  onUpdateClusterLabel,
}: Props) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const points = useMemo(() => scalePoints(args, projectionMethod), [args, projectionMethod])

  // Cluster centroid labels
  const centroids = useMemo(() => {
    const acc: Record<number, { sx: number; sy: number; n: number }> = {}
    for (const { arg, sx, sy } of points) {
      if (!acc[arg.cluster_id]) acc[arg.cluster_id] = { sx: 0, sy: 0, n: 0 }
      acc[arg.cluster_id].sx += sx
      acc[arg.cluster_id].sy += sy
      acc[arg.cluster_id].n++
    }
    return Object.entries(acc).map(([id, { sx, sy, n }]) => ({
      cluster_id: parseInt(id),
      sx: sx / n,
      sy: sy / n,
      label: clusters.find((c) => c.cluster_id === parseInt(id))?.label ?? `C${id}`,
    }))
  }, [points, clusters])

  function getColor(arg: Argument): string {
    return colorMode === 'speaker'
      ? speakerPalette(arg.speaker).base
      : clusterColor(arg.cluster_id).base
  }

  function getOpacity(arg: Argument): number {
    if (selectedCluster !== null && arg.cluster_id !== selectedCluster) return 0.1
    if (selectedId && arg.unit_id !== selectedId) return 0.4
    return 0.9
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const mx = ((e.clientX - rect.left) / rect.width) * W
    const my = ((e.clientY - rect.top) / rect.height) * H
    let best: ScaledPoint | null = null, minD = 20
    for (const p of points) {
      const d = Math.hypot(p.sx - mx, p.sy - my)
      if (d < minD) { minD = d; best = p }
    }
    setTooltip(best ? { clientX: e.clientX, clientY: e.clientY, arg: best.arg } : null)
  }

  // Only show "simulated" warning if we don't have real projection data yet
  const isSimulated = !hasRealProjections && projectionMethod !== 'pca'

  return (
    <div className="flex flex-col h-full overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-card">

      {/* ── Card header ── */}
      <div className="flex-none flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 bg-slate-50">
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
            Argument Value Space
          </p>
          <div className="flex items-center gap-0.5">
            {PROJECTION_METHODS.map((m) => (
              <button
                key={m}
                onClick={() => onProjectionChange(m)}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                  projectionMethod === m
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
                }`}
              >
                {PROJECTION_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1" />

        {isSimulated && (
          <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1 font-medium">
            ⚠ fixture only — load CSV for real coords
          </span>
        )}

        <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg">
          {(['cluster', 'speaker'] as ColorMode[]).map((m) => (
            <button
              key={m}
              onClick={() => onColorModeChange(m)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all capitalize ${
                colorMode === m
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* ── SVG scatter ── */}
      <div className="flex-1 relative overflow-hidden px-2 pb-1 pt-2">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-full"
          style={{ cursor: 'crosshair' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
          onClick={() => { if (tooltip) onSelect(tooltip.arg.unit_id); else onSelect(null) }}
        >
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Plot area background */}
          <rect x={PAD} y={PAD} width={W - PAD * 2} height={H - PAD * 2}
            fill="#f8fafc" rx={6} />

          {/* Grid crosshairs */}
          <line x1={PAD} y1={(PAD + H - PAD) / 2} x2={W - PAD} y2={(PAD + H - PAD) / 2}
            stroke="#e2e8f0" strokeWidth={1} strokeDasharray="4 4" />
          <line x1={(PAD + W - PAD) / 2} y1={PAD} x2={(PAD + W - PAD) / 2} y2={H - PAD}
            stroke="#e2e8f0" strokeWidth={1} strokeDasharray="4 4" />

          {/* Points (dimmed first, then bright) */}
          {points
            .slice()
            .sort((a, b) => {
              const aActive = a.arg.unit_id === selectedId || (selectedCluster !== null && a.arg.cluster_id === selectedCluster)
              const bActive = b.arg.unit_id === selectedId || (selectedCluster !== null && b.arg.cluster_id === selectedCluster)
              return (aActive ? 1 : 0) - (bActive ? 1 : 0)
            })
            .map(({ arg, sx, sy }) => {
              const isSel = arg.unit_id === selectedId
              const isHov = tooltip?.arg.unit_id === arg.unit_id
              const color = getColor(arg)
              const opacity = getOpacity(arg)
              const r = isSel ? 9 : isHov ? 7.5 : 5.5
              return (
                <g key={arg.unit_id} opacity={opacity} style={{ transition: 'opacity 150ms ease' }}>
                  {isSel && (
                    <>
                      <circle cx={sx} cy={sy} r={22} fill={color} opacity={0.07} />
                      <circle cx={sx} cy={sy} r={14} fill={color} opacity={0.12} />
                      <circle cx={sx} cy={sy} r={r + 4} fill="none" stroke={color}
                        strokeWidth={1.5} strokeDasharray="3 2" opacity={0.6} />
                    </>
                  )}
                  <circle cx={sx} cy={sy} r={r}
                    fill={color} stroke="white" strokeWidth={isSel ? 2 : 1.5}
                    filter={isSel ? 'url(#glow)' : undefined} />
                </g>
              )
            })}

          {/* Cluster centroid labels */}
          {centroids.map(({ cluster_id, sx, sy }) => {
            const isDimmed = selectedCluster !== null && selectedCluster !== cluster_id
            return (
              <text
                key={cluster_id}
                x={sx} y={sy}
                textAnchor="middle" dominantBaseline="central"
                fontSize={11} fontWeight={700}
                fill="#334155"
                stroke="white" strokeWidth={4} paintOrder="stroke"
                opacity={isDimmed ? 0.15 : 0.55}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {`C${cluster_id}`}
              </text>
            )
          })}

          {/* Method watermark */}
          <text x={W - PAD + 2} y={H - PAD + 14} fontSize={9} fill="#cbd5e1"
            textAnchor="end" fontFamily="monospace">
            {projectionMethod.toUpperCase()}{hasRealProjections ? '' : ' (sim)'}
          </text>
        </svg>

        <MapTooltip state={tooltip} />
      </div>

      {/* ── Cluster legend ── */}
      <ClusterLegend
        clusters={clusters}
        selectedCluster={selectedCluster}
        onSelect={onSelectCluster}
        onUpdateLabel={onUpdateClusterLabel}
      />
    </div>
  )
}
