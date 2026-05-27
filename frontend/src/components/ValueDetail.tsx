import type { Argument } from '../types'
import { VALUE_DISPLAY } from '../types'
import {
  clusterColor,
  speakerPalette,
  SCHWARTZ_GROUPS,
  formatSigned,
  pct,
} from '../utils/valueUtils'

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 px-8 select-none">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl text-slate-300">
        ◉
      </div>
      <div className="text-center">
        <div className="text-sm font-medium text-slate-400 mb-1">
          No argument selected
        </div>
        <div className="text-xs text-slate-300 leading-relaxed">
          Click any point on the map to inspect its 19-dimension value profile
        </div>
      </div>
    </div>
  )
}

// ── Value bar row ─────────────────────────────────────────────────────────────
function ValueRow({
  label,
  signed,
  support,
  constraint,
  maxVal,
  isActive,
}: {
  label: string
  signed: number
  support: number
  constraint: number
  maxVal: number
  isActive: boolean
}) {
  const supportPct = pct(support, maxVal)
  const constraintPct = pct(constraint, maxVal)
  const hasSupport = support > 0.001
  const hasConstraint = constraint > 0.001

  return (
    <div
      className="flex items-center gap-2 py-[3px] group"
      style={{ opacity: isActive ? 1 : 0.2 }}
    >
      {/* Label */}
      <div className="w-[120px] text-right text-[11px] text-slate-500 truncate shrink-0 group-hover:text-slate-700 transition-colors">
        {label}
      </div>

      {/* Bar area */}
      <div className="flex-1 flex items-center min-w-0">
        {/* Constraint side (left, rose) */}
        <div className="flex-1 flex justify-end min-w-0 pr-[1px]">
          {hasConstraint && (
            <div
              className="h-[7px] rounded-l-sm"
              style={{
                width: `${constraintPct}%`,
                background: 'linear-gradient(to left, #f43f5e, #e11d48)',
              }}
            />
          )}
        </div>

        {/* Zero line */}
        <div className="w-px h-4 bg-slate-200 shrink-0" />

        {/* Support side (right, teal) */}
        <div className="flex-1 flex justify-start min-w-0 pl-[1px]">
          {hasSupport && (
            <div
              className="h-[7px] rounded-r-sm"
              style={{
                width: `${supportPct}%`,
                background: 'linear-gradient(to right, #14b8a6, #0d9488)',
              }}
            />
          )}
        </div>
      </div>

      {/* Score */}
      <div
        className="w-10 text-right font-mono text-[10px] shrink-0"
        style={{
          color:
            Math.abs(signed) < 0.001
              ? '#cbd5e1'
              : signed > 0
              ? '#0d9488'
              : '#e11d48',
        }}
      >
        {Math.abs(signed) >= 0.001 ? formatSigned(signed) : ''}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
interface Props {
  argument: Argument | null
  clusterLabel: string
  threshold: number
  onThresholdChange: (v: number) => void
}

export function ValueDetail({ argument, clusterLabel, threshold, onThresholdChange }: Props) {
  if (!argument) {
    return (
      <div className="h-full rounded-2xl bg-white border border-slate-200 shadow-card overflow-hidden">
        <EmptyState />
      </div>
    )
  }

  const cc = clusterColor(argument.cluster_id)
  const sp = speakerPalette(argument.speaker)

  // Max absolute signed value for scaling bars
  let maxVal = 0.01
  for (const group of SCHWARTZ_GROUPS) {
    for (const key of group.keys) {
      const v = Math.abs(argument.values[key].signed)
      if (v > maxVal) maxVal = v
    }
  }

  return (
    <div className="h-full rounded-2xl bg-white border border-slate-200 shadow-card overflow-hidden flex flex-col">
      {/* ── Argument header ── */}
      <div className="flex-none px-5 pt-4 pb-4 border-b border-slate-100">
        {/* Meta chips */}
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: sp.base + '20', color: sp.base }}
          >
            {argument.speaker}
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            {argument.time}
          </span>
          <span className="text-slate-300 text-xs select-none">·</span>
          <span
            className="text-[11px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: cc.light, color: cc.text }}
          >
            {clusterLabel}
          </span>
        </div>

        {/* Korean text */}
        <p className="text-sm font-medium text-slate-800 leading-relaxed mb-2">
          {argument.korean_text}
        </p>

        {/* English text */}
        <p className="text-xs text-slate-500 leading-relaxed italic">
          {argument.english_text}
        </p>

        <div className="mt-2 font-mono text-[10px] text-slate-300">
          {argument.unit_id}
        </div>
      </div>

      {/* ── Value profile ── */}
      <div className="flex-none px-5 pt-3 pb-2 flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          19-Dimension Value Profile
        </div>
        <label className="flex items-center gap-2 text-[10px] text-slate-400">
          <span>threshold</span>
          <input
            type="range"
            min={0}
            max={0.1}
            step={0.005}
            value={threshold}
            onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
            className="w-20 accent-teal-600 cursor-pointer"
          />
          <span className="font-mono w-8 text-right">{threshold.toFixed(2)}</span>
        </label>
      </div>

      {/* Bar chart legend */}
      <div className="flex-none px-5 pb-2 flex items-center gap-4 text-[10px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-[6px] rounded-sm"
            style={{ background: 'linear-gradient(to left, #f43f5e, #e11d48)' }} />
          constraint
        </span>
        <span className="text-slate-200">|</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-[6px] rounded-sm"
            style={{ background: 'linear-gradient(to right, #14b8a6, #0d9488)' }} />
          support
        </span>
      </div>

      {/* ── Scrollable chart ── */}
      <div className="flex-1 overflow-y-auto px-5 pb-4">
        {SCHWARTZ_GROUPS.map((group) => {
          const groupHasActive = group.keys.some(
            (k) => Math.abs(argument.values[k].signed) >= threshold,
          )
          return (
            <div key={group.label} className="mb-4">
              {/* Group header */}
              <div className="flex items-center gap-2 mb-1.5">
                <div
                  className="w-1.5 h-1.5 rounded-full flex-none"
                  style={{ background: group.color }}
                />
                <div
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: group.color + 'cc' }}
                >
                  {group.label}
                </div>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              {/* Rows */}
              {group.keys.map((key) => {
                const v = argument.values[key]
                const isActive = Math.abs(v.signed) >= threshold
                return (
                  <ValueRow
                    key={key}
                    label={VALUE_DISPLAY[key]}
                    signed={v.signed}
                    support={v.support}
                    constraint={v.constraint}
                    maxVal={maxVal}
                    isActive={isActive || !groupHasActive}
                  />
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
