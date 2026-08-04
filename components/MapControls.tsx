'use client'

import type {
  ProjectionMethod,
  SpeakerProfile,
  SpeakerRenderMode,
} from '@/lib/types'
import type { SpeakerPair } from '@/lib/pairs'
import { counterpart } from '@/lib/pairs'
import { shapePath, speakerColor, speakerShape } from '@/lib/colors'
import { t, tf, type Lang } from '@/lib/i18n'

/**
 * The participant list.
 *
 * Two things happen per row, and they are given separate targets because they
 * answer separate questions: the row itself asks "where does this person stand
 * relative to everyone else", and the trailing toggle asks "take their points
 * off the map while I look at someone else".
 *
 * The utterance count is not decoration. A position inferred from two
 * statements must not look like one inferred from forty, so the number sits in
 * the row rather than in a tooltip.
 */
export function ParticipantList({
  speakers,
  hidden,
  selected,
  onSelect,
  onToggleVisible,
  onShowAll,
  lang,
}: {
  speakers: SpeakerProfile[]
  hidden: Set<string>
  selected: string | null
  onSelect: (speaker: string) => void
  onToggleVisible: (speaker: string) => void
  onShowAll: () => void
  lang: Lang
}) {
  return (
    <div>
      <ul className="-mx-1.5 space-y-px">
        {speakers.map((s) => {
          const visible = !hidden.has(s.speaker)
          const isSelected = selected === s.speaker
          return (
            <li
              key={s.speaker}
              className="group flex items-center rounded-[6px] transition-colors"
              style={{
                background: isSelected ? 'var(--panel-2)' : 'transparent',
              }}
            >
              <button
                type="button"
                onClick={() => onSelect(s.speaker)}
                aria-pressed={isSelected}
                className="flex min-w-0 flex-1 items-center gap-2.5 px-1.5 py-1.5 text-left"
                style={{ opacity: visible ? 1 : 0.4 }}
              >
                <svg
                  width={11}
                  height={11}
                  viewBox="-6 -6 12 12"
                  className="shrink-0"
                >
                  <path
                    d={shapePath(speakerShape(s.colorIndex), 4.6)}
                    fill={
                      s.underdetermined ? 'var(--panel)' : speakerColor(s.colorIndex)
                    }
                    stroke={speakerColor(s.colorIndex)}
                    strokeWidth={s.underdetermined ? 1.6 : 0}
                  />
                </svg>
                <span className="truncate text-[13.5px] text-[var(--ink)]">
                  {s.speaker}
                </span>
                {s.underdetermined && (
                  <span
                    className="readout shrink-0 text-[10px] text-[var(--muted)]"
                    title={tf('underdeterminedHint', lang, {
                      n: s.n,
                      s: s.n === 1 ? '' : 's',
                    })}
                  >
                    ?
                  </span>
                )}
                <span className="readout ml-auto shrink-0 pl-2 text-[11.5px] text-[var(--muted)]">
                  {s.n}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onToggleVisible(s.speaker)}
                aria-pressed={!visible}
                title={visible ? t('hideOnMap', lang) : t('showOnMap', lang)}
                className="mr-0.5 rounded-[4px] px-1.5 py-1.5 text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
              >
                <svg width={12} height={12} viewBox="0 0 12 12" aria-hidden>
                  <circle
                    cx={6}
                    cy={6}
                    r={4}
                    fill={visible ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeWidth={1.2}
                  />
                </svg>
              </button>
            </li>
          )
        })}
      </ul>
      {hidden.size > 0 && (
        <button
          type="button"
          onClick={onShowAll}
          className="mt-2 text-[12px] text-[var(--muted)] underline decoration-[var(--line-strong)] underline-offset-[3px] transition-colors hover:text-[var(--ink)]"
        >
          {t('showAll', lang)}
        </button>
      )}
    </div>
  )
}

/**
 * The measured gaps.
 *
 * With nobody selected this is the map's headline in two rows — who is
 * furthest apart, who is closest — because that is the question a facilitator
 * opens the tool with. Selecting somebody turns it into their own distance
 * table, nearest first.
 */
export function DistanceList({
  pairs,
  selected,
  onHover,
  lang,
}: {
  pairs: SpeakerPair[]
  selected: string | null
  onHover: (pair: SpeakerPair | null) => void
  lang: Lang
}) {
  if (pairs.length === 0) return null

  const rows: { pair: SpeakerPair; label: string; caption?: string }[] = selected
    ? [...pairs]
        .sort((a, b) => a.distance - b.distance)
        .map((p) => ({ pair: p, label: counterpart(p, selected).speaker }))
    : [
        {
          pair: pairs[0],
          label: `${pairs[0].a.speaker} ↔ ${pairs[0].b.speaker}`,
          caption: t('widestGap', lang),
        },
        ...(pairs.length > 1
          ? [
              {
                pair: pairs[pairs.length - 1],
                label: `${pairs[pairs.length - 1].a.speaker} ↔ ${pairs[pairs.length - 1].b.speaker}`,
                caption: t('closestGap', lang),
              },
            ]
          : []),
      ]

  return (
    <div onMouseLeave={() => onHover(null)}>
      <ul className="-mx-1.5">
        {rows.map(({ pair, label, caption }) => (
          <li key={`${pair.a.speaker}-${pair.b.speaker}`}>
            <div
              onMouseEnter={() => onHover(pair)}
              className="flex items-baseline gap-2 rounded-[6px] px-1.5 py-1.5 transition-colors hover:bg-[var(--panel-2)]"
            >
              {caption && (
                <span className="eyebrow w-[52px] shrink-0">{caption}</span>
              )}
              <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--body)]">
                {label}
              </span>
              {/* A bar, so the column can be scanned without reading every
                  number. Its width is the ratio the number states. */}
              <span
                aria-hidden
                className="h-px shrink-0 bg-[var(--line-strong)]"
                style={{ width: `${Math.max(3, pair.relative * 44)}px` }}
              />
              <span className="readout w-[34px] shrink-0 text-right text-[11.5px] text-[var(--ink)]">
                {pair.relative.toFixed(2)}
              </span>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-2 px-0.5 text-[11.5px] leading-[1.55] text-[var(--muted)]">
        {selected
          ? tf('distanceFrom', lang, { name: selected })
          : t('distanceNote', lang)}
      </p>
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
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12.5px] text-[var(--muted)]">{label}</span>
      <div className="flex rounded-[6px] bg-[var(--panel-2)] p-0.5">
        {options.map((o) => {
          const on = value === o.value
          return (
            <button
              key={o.value}
              type="button"
              title={o.title}
              onClick={() => onChange(o.value)}
              aria-pressed={on}
              className="rounded-[4px] px-2 py-1 text-[11.5px] transition-colors"
              style={{
                background: on ? 'var(--signal)' : 'transparent',
                color: on ? 'var(--on-signal)' : 'var(--muted)',
              }}
            >
              {o.label}
            </button>
          )
        })}
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
