'use client'

import { t, type Lang } from '@/lib/i18n'

/**
 * The mark.
 *
 * Two points and the line measured between them — the same gesture the map
 * makes when a participant is selected, at wordmark size. The name is set in
 * the mono face because everything else that names a measurement on this page
 * is too.
 */
export function Wordmark({
  lang,
  compact = false,
}: {
  lang: Lang
  /** Drops the tagline, for the top bar where the page states it anyway. */
  compact?: boolean
}) {
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
        <h1 className="readout text-[12px] font-medium uppercase leading-[1.5] tracking-[0.22em] text-[var(--ink)]">
          Value
          <br />
          Constellation
        </h1>
      </div>
      {!compact && (
        <p className="mt-3 text-[13px] leading-[1.65] text-[var(--muted)]">
          {t('tagline', lang)}
        </p>
      )}
    </div>
  )
}

/**
 * The rail's one primary block.
 *
 * Everything else in the console is an eyebrow: a small uppercase label that
 * names a region without claiming importance. That is right for a list of
 * preferences and wrong for the participants, which is not one block among
 * several but the thing the console is for — and when it wore the same label
 * as "표시 설정", choosing a person and choosing how dots are drawn read as
 * two decisions of equal size.
 *
 * So this one gets a heading in ink at reading size, a count beside it, and
 * a line saying what to do with the rows. No border above it either: it opens
 * the rail rather than continuing a stack.
 */
export function PrimarySection({
  title,
  count,
  hint,
  children,
}: {
  title: string
  /** Sits beside the heading — how many people are in this room. */
  count?: React.ReactNode
  /** One line naming the action the rows support. Hidden once one is open. */
  hint?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="border-t border-[var(--line)] px-5 pb-4 pt-4">
      <header className="mb-1">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[14.5px] font-medium leading-[1.4] text-[var(--ink)]">
            {title}
          </h2>
          {count && (
            <span className="shrink-0 text-[12px] text-[var(--muted)]">
              {count}
            </span>
          )}
        </div>
        {hint && (
          <p className="mt-1.5 text-[12px] leading-[1.55] text-[var(--muted)]">
            {hint}
          </p>
        )}
      </header>
      <div className="mt-2.5">{children}</div>
    </section>
  )
}

/**
 * A rail block that stays shut until asked.
 *
 * The open/closed state is the difference between a console somebody can read
 * and one they have to survey. Anything in here should be a question that only
 * arises after the map has been understood.
 */
export function Disclosure({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <details className="group border-t border-[var(--line)]">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3.5 transition-colors hover:bg-[var(--panel-2)]">
        <span
          aria-hidden
          className="readout text-[9px] text-[var(--faint)] transition-transform group-open:rotate-90"
        >
          ▶
        </span>
        <span className="eyebrow">{title}</span>
      </summary>
      <div className="px-5 pb-4">{children}</div>
    </details>
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
