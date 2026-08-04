'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LangSwitch, ThemeSwitch, usePreferences } from '@/components/Preferences'
import { Reveal } from '@/components/Reveal'
import { Wordmark } from '@/components/Chrome'
import { LiveDemo } from '@/components/landing/LiveDemo'
import { MarkFigure } from '@/components/landing/MarkFigure'
import { RegionSteps } from '@/components/landing/RegionSteps'
import { Composer } from '@/components/Composer'
import { stageTranscript } from '@/lib/handoff'
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
  TRY_SECTION,
  type Bilingual,
} from '@/lib/landing'
import type { AnalysisResult } from '@/lib/types'

const FIXTURES = precomputed as unknown as Record<string, AnalysisResult>

export default function Overview() {
  const router = useRouter()
  const { lang } = usePreferences()
  const say = (b: Bilingual) => b[lang]

  /** Opens on the example with four grounds; the picker changes it. */
  const [demoId, setDemoId] = useState(SCENARIOS[0].id)
  const demo = FIXTURES[demoId]
  const demoScenario = SCENARIOS.find((s) => s.id === demoId)

  const [transcript, setTranscript] = useState('')

  // The overview hands the text over rather than analysing it here, so a result
  // is only ever produced in one place. On the way it goes through session
  // storage, not the URL — a transcript is other people's words.
  const handOff = useCallback(() => {
    if (!transcript.trim()) return
    const staged = stageTranscript(transcript)
    router.push(staged ? '/studio?pending=1' : '/studio?compose=1')
  }, [router, transcript])

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
              <a
                href="#try"
                className="rounded-full bg-[var(--signal)] px-6 py-3 text-[14px] font-medium text-[var(--on-signal)] transition-opacity hover:opacity-88"
              >
                {say(HERO.primary)}
              </a>
              <a
                href="#marks"
                className="rounded-full border border-[var(--line-strong)] px-6 py-3 text-[14px] text-[var(--body)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)]"
              >
                {say(HERO.secondary)}
              </a>
            </div>
          </div>

          {demo && (
            <div className="mt-14">
              {/* The example picker sits on the demo rather than only in the
                  gallery further down: the four maps are the fastest way to
                  learn what this can and cannot show, and somebody who never
                  scrolls should still meet more than one of them. */}
              <div
                role="tablist"
                aria-label={say(EXAMPLES_SECTION.eyebrow)}
                className="mb-3 flex flex-wrap gap-1.5"
              >
                {SCENARIOS.map((scenario) => {
                  const on = scenario.id === demoId
                  return (
                    <button
                      key={scenario.id}
                      role="tab"
                      aria-selected={on}
                      type="button"
                      onClick={() => setDemoId(scenario.id)}
                      className="rounded-full border px-3.5 py-1.5 text-[12.5px] transition-colors"
                      style={{
                        borderColor: on ? 'transparent' : 'var(--line)',
                        background: on ? 'var(--signal)' : 'var(--panel)',
                        color: on ? 'var(--on-signal)' : 'var(--muted)',
                      }}
                    >
                      {scenario.title[lang]}
                    </button>
                  )
                })}
              </div>

              <div className="relative h-[clamp(340px,52vh,600px)] overflow-hidden rounded-[18px] border border-[var(--line)] bg-[var(--plate)] shadow-[0_40px_80px_-60px_rgba(0,0,0,0.5)]">
                <LiveDemo key={demoId} analysis={demo} lang={lang} />
              </div>

              <div className="mt-3 flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
                <div className="max-w-[46rem]">
                  {demoScenario && (
                    <p className="text-[13px] leading-[1.7] text-[var(--body)]">
                      {demoScenario.lookFor[lang]}
                    </p>
                  )}
                  <p className="mt-1 text-[12.5px] text-[var(--muted)]">
                    {say(HERO.demoCaption)}
                  </p>
                </div>
                <Link
                  href={`/studio?example=${demoId}`}
                  className="group shrink-0 text-[13px] text-[var(--body)] transition-colors hover:text-[var(--ink)]"
                >
                  {say(HERO.demoOpen)}{' '}
                  <span
                    aria-hidden
                    className="readout inline-block transition-transform group-hover:translate-x-0.5"
                  >
                    →
                  </span>
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* ── Reading guide ────────────────────────────────────────────────
            Every mark, once, with the figure drawn the way the map draws it. */}
        <Band id="marks">
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
        <Band id="region">
          <SectionHead
            eyebrow={say(REGION_RULE.eyebrow)}
            headline={say(REGION_RULE.headline)}
            lead={say(REGION_RULE.body)}
          />

          <Reveal delay={60}>
            <div className="mt-12">
              <RegionSteps
                captions={[
                  say(REGION_RULE.steps[0]),
                  say(REGION_RULE.steps[1]),
                  say(REGION_RULE.steps[2]),
                ]}
              />
              <p className="mt-3 text-[12px] text-[var(--muted)]">
                {say(REGION_RULE.stepsNote)}
              </p>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:gap-16">
              <div>
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
              <p className="t-body text-[var(--muted)]">
                {say(REGION_RULE.rejected)}
              </p>
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

        {/* ── Try it ───────────────────────────────────────────────────────
            A working composer, not a link to one. Somebody who has read this
            far should be able to act without first landing in an unfamiliar
            interface and looking for the box. */}
        <Band id="try">
          <SectionHead
            eyebrow={say(TRY_SECTION.eyebrow)}
            headline={say(TRY_SECTION.headline)}
            lead={say(TRY_SECTION.lead)}
          />
          <Reveal delay={60}>
            <div className="mt-10 rounded-[16px] border border-[var(--line)] bg-[var(--panel)] p-6 sm:p-8">
              <Composer
                lang={lang}
                transcript={transcript}
                onChange={setTranscript}
                onSubmit={handOff}
                error={null}
                loading={false}
                variant="inline"
              />
              <p className="mt-4 border-t border-[var(--line)] pt-4 text-[12.5px] leading-[1.7] text-[var(--muted)]">
                {say(TRY_SECTION.privacy)}
              </p>
            </div>
          </Reveal>
        </Band>
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
function Band({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mx-auto max-w-[1240px] scroll-mt-20 px-5 py-20 sm:px-8 sm:py-28">
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
