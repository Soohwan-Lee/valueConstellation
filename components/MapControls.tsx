'use client'

import type {
  ProjectionMethod,
  SpeakerProfile,
  SpeakerRenderMode,
} from '@/lib/types'
import { shapePath, speakerColor, speakerShape } from '@/lib/colors'
import { t, tf, type Lang } from '@/lib/i18n'

export function SpeakerChips({
  speakers,
  active,
  onToggle,
  onClear,
  lang,
}: {
  speakers: SpeakerProfile[]
  active: Set<string>
  onToggle: (speaker: string) => void
  onClear: () => void
  lang: Lang
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
                title={tf('underdeterminedHint', lang, {
                  n: s.n,
                  s: s.n === 1 ? '' : 's',
                })}
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
          {t('showAll', lang)}
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

export function renderModeOptions(
  lang: Lang,
): { value: SpeakerRenderMode; label: string; title: string }[] {
  return [
    { value: 'point', label: t('modePoint', lang), title: t('modePointHint', lang) },
    { value: 'region', label: t('modeRegion', lang), title: t('modeRegionHint', lang) },
    { value: 'both', label: t('modeBoth', lang), title: t('modeBothHint', lang) },
  ]
}

export function methodOptions(
  lang: Lang,
): { value: ProjectionMethod; label: string; title: string }[] {
  return [
    // Method names stay as-is: PCA and MDS are the terms a reader would look up.
    { value: 'pca', label: 'PCA', title: t('methodPcaHint', lang) },
    { value: 'mds', label: 'MDS', title: t('methodMdsHint', lang) },
  ]
}
