'use client'

import Link from 'next/link'
import { LangSwitch, ThemeSwitch, usePreferences } from '@/components/Preferences'
import { Reveal } from '@/components/Reveal'
import { Wordmark } from '@/components/Chrome'
import { LiveDemo } from '@/components/landing/LiveDemo'
import { MarkFigure } from '@/components/landing/MarkFigure'
import { SCENARIOS } from '@/data/scenarios'
import precomputed from '@/data/fixtures/precomputed.json'
import {
  EXAMPLES_SECTION,
  FOOTER,
  HERO,
  LIMITS,
  LIMITS_SECTION,
  MARKS,
  MARKS_SECTION,
  PIPELINE,
  PIPELINE_SECTION,
  REGION_RULE,
  type Bilingual,
} from '@/lib/landing'
import type { AnalysisResult } from '@/lib/types'

const FIXTURES = precomputed as unknown as Record<string, AnalysisResult>

/** The example the hero runs on: four people who split on different grounds. */
const DEMO_ID = 'siting'

export default function Overview() {
  const { lang } = usePreferences()
  const say = (b: Bilingual) => b[lang]
  const demo = FIXTURES[DEMO_ID]

  return (
    <div className="min-h-dvh bg-[var(--tray)]">
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[color-mix(in_oklab,var(--tray)_86%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <Wordmark lang={lang} compact />
          <div className="flex shrink-0 items-center gap-2">
            <LangSwitch />
            <ThemeSwitch />
          </div>
        </div>
      </header>

      <main>
        {/* ── Hero ─────────────────────────────────────────────────────────
            The map, running, before a word of explanation. The gesture that
            makes it useful plays itself, so the headline lands on somebody who
            has already seen what it is talking about. */}
        <section className="mx-auto max-w-[1240px] px-5 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-20">
          <div className="max-w-[52rem]">
            <p className="eyebrow">{say(HERO.eyebrow)}</p>
            <h2 className="t-display mt-5 whitespace-pre-line">
              {say(HERO.headline)}
            </h2>
            <p className="t-lead mt-7 max-w-[40rem]">{say(HERO.lead)}</p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/studio?compose=1"
                className="rounded-full bg-[var(--signal)] px-6 py-3 text-[14px] font-medium text-[var(--on-signal)] transition-opacity hover:opacity-88"
              >
                {say(HERO.primary)}
              </Link>
              <Link
                href="/studio"
                className="rounded-full border border-[var(--line-strong)] px-6 py-3 text-[14px] text-[var(--body)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)]"
              >
                {say(HERO.secondary)}
              </Link>
            </div>
          </div>

          {demo && (
            <div className="mt-14">
              <div className="relative h-[clamp(340px,52vh,600px)] overflow-hidden rounded-[18px] border border-[var(--line)] bg-[var(--plate)] shadow-[0_40px_80px_-60px_rgba(0,0,0,0.5)]">
                <LiveDemo analysis={demo} lang={lang} />
              </div>
              <p className="mt-3 text-[12.5px] text-[var(--muted)]">
                {say(HERO.demoCaption)}
              </p>
            </div>
          )}
        </section>

        {/* ── Reading guide ────────────────────────────────────────────────
            Every mark, once, with the figure drawn the way the map draws it. */}
        <Band>
          <SectionHead
            eyebrow={say(MARKS_SECTION.eyebrow)}
            headline={say(MARKS_SECTION.headline)}
            lead={say(MARKS_SECTION.lead)}
          />
          <ul className="mt-14 grid gap-px overflow-hidden rounded-[16px] border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2">
            {MARKS.map((mark, i) => (
              <li key={mark.figure} className="bg-[var(--panel)]">
                <Reveal delay={i * 60} className="h-full">
                  <article className="flex h-full flex-col gap-5 p-6 sm:p-7">
                    <div className="h-[104px] w-full overflow-hidden rounded-[10px] border border-[var(--line)] bg-[var(--plate)]">
                      <MarkFigure figure={mark.figure} />
                    </div>
                    <div>
                      <h4 className="t-title">{say(mark.title)}</h4>
                      <p className="t-body mt-2.5 text-[var(--muted)]">
                        {say(mark.body)}
                      </p>
                    </div>
                  </article>
                </Reveal>
              </li>
            ))}
          </ul>
        </Band>

        {/* ── The one rule worth stating in full ───────────────────────────
            The region is the only mark whose shape comes from a decision
            rather than from the data directly, so the decision is published. */}
        <Band>
          <Reveal>
            <div className="grid gap-10 rounded-[16px] border border-[var(--line)] bg-[var(--panel)] p-7 sm:p-11 lg:grid-cols-[1fr_0.9fr] lg:gap-16">
              <div>
                <p className="eyebrow">{say(REGION_RULE.eyebrow)}</p>
                <h3 className="t-headline mt-4">{say(REGION_RULE.headline)}</h3>
                <p className="t-body mt-5">{say(REGION_RULE.body)}</p>
                <p className="t-body mt-4 text-[var(--muted)]">
                  {say(REGION_RULE.rejected)}
                </p>
              </div>
              <div className="lg:pt-[3.2rem]">
                <ul className="space-y-4">
                  {REGION_RULE.consequences.map((line) => (
                    <li key={line.en} className="flex gap-3">
                      <span
                        aria-hidden
                        className="mt-[0.62rem] h-px w-4 shrink-0 bg-[var(--line-strong)]"
                      />
                      <span className="text-[13.5px] leading-[1.7] text-[var(--body)]">
                        {say(line)}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-7 border-l-2 border-[var(--ink)] pl-4 text-[13px] leading-[1.7] text-[var(--ink)]">
                  {say(REGION_RULE.note)}
                </p>
              </div>
            </div>
          </Reveal>
        </Band>

        {/* ── Pipeline ─────────────────────────────────────────────────────
            Numbered, because this genuinely is a sequence: each step consumes
            what the one before it produced. */}
        <Band>
          <SectionHead
            eyebrow={say(PIPELINE_SECTION.eyebrow)}
            headline={say(PIPELINE_SECTION.headline)}
          />
          <ol className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {PIPELINE.map((step, i) => (
              <li key={step.title.en}>
                <Reveal delay={i * 70}>
                  <div className="rule mb-5" />
                  <span className="readout text-[11px] text-[var(--muted)]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h4 className="t-title mt-3">{say(step.title)}</h4>
                  <p className="t-body mt-2.5 text-[var(--muted)]">
                    {say(step.body)}
                  </p>
                </Reveal>
              </li>
            ))}
          </ol>
        </Band>

        {/* ── Examples ─────────────────────────────────────────────────────*/}
        <Band>
          <SectionHead
            eyebrow={say(EXAMPLES_SECTION.eyebrow)}
            headline={say(EXAMPLES_SECTION.headline)}
            lead={say(EXAMPLES_SECTION.lead)}
          />
          <ul className="mt-14 grid gap-5 md:grid-cols-3">
            {SCENARIOS.map((scenario, i) => {
              const fixture = FIXTURES[scenario.id]
              return (
                <li key={scenario.id}>
                  <Reveal delay={i * 70} className="h-full">
                    <Link
                      href={`/studio?example=${scenario.id}`}
                      className="group flex h-full flex-col overflow-hidden rounded-[14px] border border-[var(--line)] bg-[var(--panel)] transition-colors hover:border-[var(--line-strong)]"
                    >
                      <div className="h-[176px] border-b border-[var(--line)] bg-[var(--plate)]">
                        {fixture && (
                          <MiniMap
                            analysis={fixture}
                            label={scenario.title[lang]}
                          />
                        )}
                      </div>
                      <div className="flex flex-1 flex-col p-5">
                        <h4 className="t-title">{scenario.title[lang]}</h4>
                        <p className="t-body mt-2 flex-1 text-[13.5px] text-[var(--muted)]">
                          {scenario.teaser[lang]}
                        </p>
                        <span className="mt-5 inline-flex items-center gap-1.5 text-[13px] text-[var(--body)] transition-colors group-hover:text-[var(--ink)]">
                          {say(EXAMPLES_SECTION.open)}
                          <span
                            aria-hidden
                            className="readout transition-transform group-hover:translate-x-0.5"
                          >
                            →
                          </span>
                        </span>
                      </div>
                    </Link>
                  </Reveal>
                </li>
              )
            })}
          </ul>
        </Band>

        {/* ── Limits ───────────────────────────────────────────────────────
            Placed before the closing call to action rather than in a footnote:
            a tool that draws conclusions about named people should say what it
            cannot do while somebody is still deciding whether to use it. */}
        <Band>
          <SectionHead
            eyebrow={say(LIMITS_SECTION.eyebrow)}
            headline={say(LIMITS_SECTION.headline)}
          />
          <ul className="mt-12 space-y-px overflow-hidden rounded-[16px] border border-[var(--line)] bg-[var(--line)]">
            {LIMITS.map((limit, i) => (
              <li key={limit.title.en} className="bg-[var(--panel)]">
                <Reveal delay={i * 60}>
                  <div className="grid gap-3 p-6 sm:grid-cols-[16rem_1fr] sm:gap-10 sm:p-8">
                    <h4 className="t-title">{say(limit.title)}</h4>
                    <p className="t-body text-[var(--muted)]">{say(limit.body)}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </Band>

        <section className="mx-auto max-w-[1240px] px-5 pb-24 pt-8 sm:px-8">
          <Reveal>
            <div className="flex flex-col items-start gap-6 rounded-[16px] border border-[var(--line)] bg-[var(--panel)] p-8 sm:flex-row sm:items-center sm:justify-between sm:p-11">
              <h3 className="t-headline max-w-[26rem]">
                {say(HERO.headline).replace('\n', ' ')}
              </h3>
              <Link
                href="/studio?compose=1"
                className="shrink-0 rounded-full bg-[var(--signal)] px-6 py-3 text-[14px] font-medium text-[var(--on-signal)] transition-opacity hover:opacity-88"
              >
                {say(HERO.primary)}
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-[var(--line)]">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 px-5 py-8 sm:px-8">
          <p className="max-w-[34rem] text-[12.5px] leading-[1.7] text-[var(--muted)]">
            {say(FOOTER.builtWith)}
          </p>
          <a
            href="https://github.com/Soohwan-Lee/valueConstellation"
            className="readout text-[11px] uppercase tracking-[0.16em] text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
          >
            {say(FOOTER.repo)}
          </a>
        </div>
      </footer>
    </div>
  )
}

/** A page section with the shared vertical rhythm and a top rule. */
function Band({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 sm:py-28">
      {children}
    </section>
  )
}

function SectionHead({
  eyebrow,
  headline,
  lead,
}: {
  eyebrow: string
  headline: string
  lead?: string
}) {
  return (
    <Reveal>
      <div className="max-w-[44rem]">
        <p className="eyebrow">{eyebrow}</p>
        <h3 className="t-headline mt-4">{headline}</h3>
        {lead && <p className="t-lead mt-5">{lead}</p>}
      </div>
    </Reveal>
  )
}

/**
 * A still of one example, drawn from its committed analysis.
 *
 * Only the marks, at card size: labels and measure lines would be unreadable
 * here, and a card that promises detail it cannot render is worse than one that
 * shows the shape of the result and lets the reader open it.
 */
function MiniMap({
  analysis,
  label,
}: {
  analysis: AnalysisResult
  label: string
}) {
  const projection = analysis.projections.pca
  const xs = projection.utterances.map((u) => u.x)
  const ys = projection.utterances.map((u) => u.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const spanX = maxX - minX || 1
  const spanY = maxY - minY || 1
  const scale = Math.min(180 / spanX, 108 / spanY)
  const toX = (v: number) => 30 + (v - minX) * scale + (180 - spanX * scale) / 2
  const toY = (v: number) =>
    138 - (v - minY) * scale - (108 - spanY * scale) / 2

  return (
    <svg
      viewBox="0 0 240 168"
      className="h-full w-full"
      role="img"
      aria-label={label}
      preserveAspectRatio="xMidYMid meet"
    >
      {projection.utterances.map((u) => {
        const speaker = projection.speakers.find((s) => s.speaker === u.speaker)
        return (
          <circle
            key={u.id}
            cx={toX(u.x)}
            cy={toY(u.y)}
            r={2.6}
            fill={`var(--s${((speaker?.colorIndex ?? 0) % 8) + 1})`}
            fillOpacity={0.5}
          />
        )
      })}
      {projection.speakers.map((s) => (
        <circle
          key={s.speaker}
          cx={toX(s.x)}
          cy={toY(s.y)}
          r={6}
          fill={`var(--s${(s.colorIndex % 8) + 1})`}
          fillOpacity={s.underdetermined ? 0 : 1}
          stroke={`var(--s${(s.colorIndex % 8) + 1})`}
          strokeWidth={1.4}
          strokeDasharray={s.underdetermined ? '3 2.5' : undefined}
        />
      ))}
    </svg>
  )
}
