'use client'

import { useCallback, useEffect, useState } from 'react'
import { SCENARIOS } from '@/data/scenarios'
import { t, type Lang } from '@/lib/i18n'

/**
 * The mark.
 *
 * Two points and the line measured between them — the same gesture the map
 * makes when a participant is selected, at wordmark size. The name is set in
 * the mono face because everything else that names a measurement on this page
 * is too.
 */
export function Wordmark({ lang }: { lang: Lang }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <svg width={28} height={22} viewBox="0 0 28 22" aria-hidden>
          <line
            x1={5}
            y1={16}
            x2={23}
            y2={6}
            stroke="var(--line-strong)"
            strokeWidth={1}
          />
          <circle cx={5} cy={16} r={3.2} fill="var(--ink)" />
          <circle
            cx={23}
            cy={6}
            r={3.2}
            fill="var(--plate)"
            stroke="var(--ink)"
            strokeWidth={1.4}
          />
        </svg>
        <h1 className="readout text-[11px] font-medium uppercase leading-[1.5] tracking-[0.22em] text-[var(--ink)]">
          Value
          <br />
          Constellation
        </h1>
      </div>
      <p className="mt-3 text-[13px] leading-[1.65] text-[var(--muted)]">
        {t('tagline', lang)}
      </p>
    </div>
  )
}

/** A titled block in the console rail. */
export function Section({
  title,
  aside,
  children,
}: {
  title: string
  aside?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="border-t border-[var(--line)] px-5 py-4">
      <header className="mb-2.5 flex items-center justify-between gap-2">
        <h2 className="eyebrow">{title}</h2>
        {aside}
      </header>
      {children}
    </section>
  )
}

/**
 * Source picker.
 *
 * Examples are listed rather than hidden in a dropdown: each one produces a
 * visibly different map, so the list is the fastest way to learn what the tool
 * can and cannot show. Each label names the shape of the result, not the topic.
 */
export function SourcePicker({
  activeId,
  pasting,
  lang,
  onPick,
  onPaste,
  disabled,
}: {
  activeId: string | null
  pasting: boolean
  lang: Lang
  onPick: (id: string) => void
  onPaste: () => void
  disabled?: boolean
}) {
  return (
    <ul className="-mx-1.5 space-y-px">
      {SCENARIOS.map((s) => {
        const active = !pasting && activeId === s.id
        return (
          <li key={s.id}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPick(s.id)}
              aria-pressed={active}
              className="w-full rounded-[6px] px-1.5 py-1.5 text-left transition-colors disabled:opacity-50"
              style={{ background: active ? 'var(--panel-2)' : 'transparent' }}
            >
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-[3px] w-[3px] shrink-0 rounded-full"
                  style={{
                    background: active ? 'var(--ink)' : 'var(--faint)',
                  }}
                />
                <span
                  className="text-[13.5px]"
                  style={{ color: active ? 'var(--ink)' : 'var(--body)' }}
                >
                  {s.title[lang]}
                </span>
              </span>
              <span className="mt-0.5 block pl-[11px] text-[11.5px] leading-[1.5] text-[var(--muted)]">
                {s.teaser[lang]}
              </span>
            </button>
          </li>
        )
      })}
      <li className="pt-1">
        <button
          type="button"
          disabled={disabled}
          onClick={onPaste}
          aria-pressed={pasting}
          className="flex w-full items-center gap-2 rounded-[6px] px-1.5 py-1.5 text-left text-[13.5px] transition-colors disabled:opacity-50"
          style={{
            background: pasting ? 'var(--panel-2)' : 'transparent',
            color: pasting ? 'var(--ink)' : 'var(--body)',
          }}
        >
          <span
            aria-hidden
            className="readout w-[11px] shrink-0 text-center text-[13px] leading-none text-[var(--faint)]"
          >
            +
          </span>
          {t('orPasteOwn', lang)}
        </button>
      </li>
    </ul>
  )
}

/** Stage of the analysis pipeline, for the loading display. */
export type Stage = 'parse' | 'segment' | 'embed' | 'project'

const STAGE_ORDER: Stage[] = ['parse', 'segment', 'embed', 'project']
const STAGE_KEYS = {
  parse: 'stageParse',
  segment: 'stageSegment',
  embed: 'stageEmbed',
  project: 'stageProject',
} as const

/**
 * Staged progress.
 *
 * The pipeline takes about eight seconds, which is the band where a looped
 * indicator with step labels is appropriate and a percentage would be a
 * fabrication — the server does not report progress, so any bar would be
 * animation pretending to be measurement.
 */
export function StageList({ current, lang }: { current: Stage; lang: Lang }) {
  const currentIdx = STAGE_ORDER.indexOf(current)
  return (
    <ol className="space-y-2.5">
      {STAGE_ORDER.map((stage, i) => {
        const done = i < currentIdx
        const active = i === currentIdx
        return (
          <li key={stage} className="flex items-center gap-3">
            <span
              aria-hidden
              className="h-px shrink-0 transition-all duration-500"
              style={{
                width: done || active ? '28px' : '12px',
                background: done
                  ? 'var(--line-strong)'
                  : active
                    ? 'var(--ink)'
                    : 'var(--line)',
              }}
            />
            <span
              className="text-[13px] transition-colors"
              style={{
                color: active
                  ? 'var(--ink)'
                  : done
                    ? 'var(--muted)'
                    : 'var(--faint)',
              }}
            >
              {t(STAGE_KEYS[stage], lang)}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/**
 * Language switch.
 *
 * A `KOR · ENG` text pair rather than a globe icon (which reads as region or
 * currency) or `한/A` (asymmetric, and 한 is a character not a language name).
 * This switches interface chrome only — transcript content stays in the language
 * it was spoken in, because a participant's words are the evidence behind their
 * position.
 */
export function LangToggle({
  lang,
  onChange,
}: {
  lang: Lang
  onChange: (l: Lang) => void
}) {
  return (
    <div className="readout flex items-center gap-1 text-[10.5px] tracking-[0.1em]">
      {(['ko', 'en'] as const).map((l, i) => (
        <span key={l} className="flex items-center gap-1">
          {i > 0 && <span className="text-[var(--faint)]">·</span>}
          <button
            type="button"
            onClick={() => onChange(l)}
            aria-pressed={lang === l}
            className="px-0.5 transition-colors"
            style={{
              color: lang === l ? 'var(--ink)' : 'var(--muted)',
              fontWeight: lang === l ? 500 : 400,
            }}
          >
            {l === 'ko' ? 'KOR' : 'ENG'}
          </button>
        </span>
      ))}
    </div>
  )
}

/**
 * Theme switch.
 *
 * Persisted, because which theme is comfortable depends on the room rather
 * than on the visit. The initial value is applied before first paint by a
 * script in the document head; this only has to keep up afterwards.
 */
export function ThemeToggle({ lang }: { lang: Lang }) {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  const toggle = useCallback(() => {
    const next = !document.documentElement.classList.contains('dark')
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem('vc-theme', next ? 'dark' : 'light')
    } catch {
      // A blocked storage API is not a reason to refuse the switch.
    }
    setDark(next)
  }, [])

  return (
    <button
      type="button"
      onClick={toggle}
      title={dark ? t('toLight', lang) : t('toDark', lang)}
      aria-label={dark ? t('toLight', lang) : t('toDark', lang)}
      className="rounded-[5px] p-1 text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
    >
      <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden>
        <circle
          cx={7}
          cy={7}
          r={4}
          fill="currentColor"
          fillOpacity={dark ? 0 : 1}
          stroke="currentColor"
          strokeWidth={1.2}
        />
        {/* Half-filled disc: the same mark in both states, so the control does
            not appear to change identity when pressed. */}
        {dark && <path d="M7 3a4 4 0 0 0 0 8Z" fill="currentColor" />}
      </svg>
    </button>
  )
}
