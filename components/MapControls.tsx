'use client'

import type {
  ProjectionMethod,
  SpeakerProfile,
  SpeakerRenderMode,
} from '@/lib/types'
import { shapePath, speakerColor, speakerShape } from '@/lib/colors'

export function SpeakerChips({
  speakers,
  active,
  onToggle,
  onClear,
  showAllLabel = 'show all',
}: {
  speakers: SpeakerProfile[]
  active: Set<string>
  onToggle: (speaker: string) => void
  onClear: () => void
  showAllLabel?: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {speakers.map((s) => {
        const on = active.size === 0 || active.has(s.speaker)
        return (
          <button
            key={s.speaker}
            type="button"
            onClick={() => onToggle(s.speaker)}
            aria-pressed={active.has(s.speaker)}
            className="group flex items-center gap-2 rounded-full border px-2.5 py-1 text-[13px] transition-colors"
            style={{
              borderColor: on ? 'var(--hairline-strong)' : 'var(--hairline)',
              background: on ? 'var(--surface-2)' : 'transparent',
              opacity: on ? 1 : 0.5,
            }}
          >
            <svg width={11} height={11} viewBox="-6 -6 12 12" className="shrink-0">
              <path
                d={shapePath(speakerShape(s.colorIndex), 4.5)}
                fill={speakerColor(s.colorIndex)}
              />
            </svg>
            <span className="text-[var(--ink)]">{s.speaker}</span>
            {/* Utterance count is not decoration: a position inferred from two
                utterances must not look like one inferred from forty. */}
            <span className="tnum text-[var(--muted)]">{s.n}</span>
            {s.underdetermined && (
              <span
                className="text-[var(--muted)]"
                title={`Only ${s.n} substantive utterance(s) — position is not well determined`}
              >
                ?
              </span>
            )}
          </button>
        )
      })}
      {active.size > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="ml-1 text-[12px] text-[var(--muted)] underline decoration-[var(--hairline-strong)] underline-offset-2 hover:text-[var(--ink)]"
        >
          {showAllLabel}
        </button>
      )}
    </div>
  )
}

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string; title?: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[12px] text-[var(--muted)]">{label}</span>
      <div className="flex rounded-[6px] border border-[var(--hairline)] p-0.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            title={o.title}
            onClick={() => onChange(o.value)}
            aria-pressed={value === o.value}
            className="rounded-[4px] px-2.5 py-1 text-[12px] transition-colors"
            style={{
              background: value === o.value ? 'var(--surface-2)' : 'transparent',
              color: value === o.value ? 'var(--ink)' : 'var(--muted)',
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export const RENDER_MODE_OPTIONS: {
  value: SpeakerRenderMode
  label: string
  title: string
}[] = [
  {
    value: 'point',
    label: 'Point',
    title: 'One marker per speaker at their centroid',
  },
  {
    value: 'region',
    label: 'Region',
    title: 'A 1-SD ellipse over each speaker’s utterances',
  },
  { value: 'both', label: 'Both', title: 'Centroid marker and spread ellipse' },
]

export const METHOD_OPTIONS: {
  value: ProjectionMethod
  label: string
  title: string
}[] = [
  {
    value: 'pca',
    label: 'PCA',
    title: 'Linear projection; reports how much variance the 2D view captures',
  },
  {
    value: 'mds',
    label: 'MDS',
    title: 'Metric MDS on cosine distance; preserves pairwise distance',
  },
]
