'use client'

import { SCENARIOS } from '@/data/scenarios'
import type { Lang } from '@/lib/i18n'
import { t } from '@/lib/i18n'

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
    <div className="flex items-center gap-1 font-mono text-[11px]">
      {(['ko', 'en'] as const).map((l, i) => (
        <span key={l} className="flex items-center gap-1">
          {i > 0 && <span className="text-[var(--faint)]">·</span>}
          <button
            type="button"
            onClick={() => onChange(l)}
            aria-pressed={lang === l}
            className="px-0.5 transition-colors"
            style={{
              color: lang === l ? 'var(--ink)' : 'var(--faint)',
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
 * Example picker.
 *
 * Always visible as a single row rather than a dropdown, so that "there are
 * several scenarios" is legible without navigating. Each label names the *shape
 * of the result* rather than the topic — that is what lets someone choose
 * immediately, and it teaches the map's vocabulary as a side effect.
 */
export function ScenarioChips({
  activeId,
  lang,
  onPick,
  disabled,
}: {
  activeId: string | null
  lang: Lang
  onPick: (id: string) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {SCENARIOS.map((s) => {
        const active = activeId === s.id
        return (
          <button
            key={s.id}
            type="button"
            disabled={disabled}
            onClick={() => onPick(s.id)}
            aria-pressed={active}
            className="max-w-[260px] rounded-[8px] border px-3 py-2 text-left transition-colors disabled:opacity-50"
            style={{
              borderColor: active
                ? 'var(--accent)'
                : 'var(--hairline)',
              background: active ? 'var(--surface-2)' : 'var(--surface)',
            }}
          >
            <span className="block text-[13px] font-medium text-[var(--ink)]">
              {s.title[lang]}
            </span>
            <span className="mt-0.5 block text-[11px] leading-[1.45] text-[var(--muted)]">
              {s.teaser[lang]}
            </span>
          </button>
        )
      })}
    </div>
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
export function StageList({
  current,
  lang,
}: {
  current: Stage
  lang: Lang
}) {
  const currentIdx = STAGE_ORDER.indexOf(current)
  return (
    <ul className="space-y-1.5">
      {STAGE_ORDER.map((stage, i) => {
        const done = i < currentIdx
        const active = i === currentIdx
        return (
          <li
            key={stage}
            className="flex items-center gap-2 text-[12px]"
            style={{
              color: done
                ? 'var(--muted)'
                : active
                  ? 'var(--ink)'
                  : 'var(--faint)',
            }}
          >
            <span
              className="w-3 text-center"
              style={{ color: done ? 'var(--accent)' : 'inherit' }}
            >
              {done ? '✓' : active ? '◐' : '○'}
            </span>
            {t(STAGE_KEYS[stage], lang)}
          </li>
        )
      })}
    </ul>
  )
}
