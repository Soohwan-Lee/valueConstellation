'use client'

import Link from 'next/link'
import { useBilingual } from '@/components/Preferences'
import { SiteHeader } from '@/components/SiteHeader'
import { Reveal } from '@/components/Reveal'
import { MarkFigure } from '@/components/landing/MarkFigure'
import { RegionSteps } from '@/components/landing/RegionSteps'
import { ScenarioCard } from '@/components/landing/ScenarioCard'
import { SCENARIOS } from '@/data/scenarios'
import precomputed from '@/data/fixtures/precomputed.json'
import {
  EXAMPLES_LEAD,
  FOOTER,
  HERO,
  LIMITS,
  LIMITS_SECTION,
  MARKS,
  MARKS_SECTION,
  OWN_TRANSCRIPT,
  PIPELINE,
  PIPELINE_SECTION,
  REGION_RULE,
} from '@/lib/landing'
import type { AnalysisResult } from '@/lib/types'

const FIXTURES = precomputed as unknown as Record<string, AnalysisResult>

/**
 * The overview.
 *
 * Structured as a template gallery rather than as a pitch: the four examples
 * are the first thing under the headline, each showing its own map, each one
 * click from being open. Picking one is the first thing somebody does, not the
 * thing they do after reading five explanations — which is what the page asked
 * for when the only action at the top was a link and the composer was at the
 * bottom.
 *
 * Everything below the fold explains, in the order a reader needs it: what each
 * mark means, how the one mark with a decision behind it decides, how the
 * analysis is built, and what it cannot do.
 */
export default function Overview() {
  const { lang, say } = useBilingual()

  return (
    <div className="min-h-dvh bg-[var(--tray)]">
      <SiteHeader
        action={
          <Link
            href="/new"
            className="hidden rounded-full bg-[var(--signal)] px-4 py-2 text-[13px] font-medium text-[var(--on-signal)] transition-opacity hover:opacity-88 sm:inline-block"
          >
            {say(OWN_TRANSCRIPT.cta)}
          </Link>
        }
        home={false}
      />

      <main>
        {/* ── Hero ─────────────────────────────────────────────────────────
            Typographic and short. The examples below it are the demonstration,
            and four maps say more than one map plus a paragraph. */}
        <section className="mx-auto max-w-[1240px] px-5 pb-10 pt-16 sm:px-8 sm:pb-14 sm:pt-24">
          <div className="max-w-[54rem]">
            <p className="eyebrow">{say(HERO.eyebrow)}</p>
            <h2 className="t-display mt-5 whitespace-pre-line">
              {say(HERO.headline)}
            </h2>
            <p className="t-lead mt-7 max-w-[42rem]">{say(HERO.lead)}</p>
          </div>
        </section>

        {/* ── The gallery ──────────────────────────────────────────────────*/}
        <section id="examples" className="mx-auto max-w-[1240px] scroll-mt-20 px-5 pb-6 sm:px-8">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-t border-[var(--line)] pt-8">
              <div className="max-w-[40rem]">
                <p className="eyebrow">{say(EXAMPLES_LEAD.eyebrow)}</p>
                <h3 className="t-headline mt-3">{say(EXAMPLES_LEAD.headline)}</h3>
              </div>
              <p className="max-w-[22rem] text-[13px] leading-[1.7] text-[var(--muted)]">
                {say(EXAMPLES_LEAD.lead)}
              </p>
            </div>
          </Reveal>

          <ul className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {SCENARIOS.map((scenario, i) => {
              const analysis = FIXTURES[scenario.id]
              if (!analysis) return null
              return (
                <li key={scenario.id}>
                  <Reveal delay={i * 70} className="h-full">
                    <ScenarioCard
                      scenario={scenario}
                      analysis={analysis}
                      lang={lang}
                      cta={say(EXAMPLES_LEAD.open)}
                      index={i}
                    />
                  </Reveal>
                </li>
              )
            })}
          </ul>
        </section>

        {/* ── Or bring your own ────────────────────────────────────────────
            Directly under the gallery rather than at the foot of the page:
            somebody who did not want an example wanted this, and should not
            have to scroll through the explanations to find it. */}
        <section className="mx-auto max-w-[1240px] px-5 py-14 sm:px-8 sm:py-20">
          <Reveal>
            <div className="flex flex-col items-start gap-6 rounded-[18px] border border-dashed border-[var(--line-strong)] p-7 sm:flex-row sm:items-center sm:justify-between sm:p-10">
              <div>
                <p className="eyebrow">{say(OWN_TRANSCRIPT.or)}</p>
                <h3 className="t-title mt-2 text-[1.15rem]">
                  {say(OWN_TRANSCRIPT.headline)}
                </h3>
                <p className="mt-1.5 text-[13.5px] text-[var(--muted)]">
                  {say(OWN_TRANSCRIPT.lead)}
                </p>
              </div>
              <Link
                href="/new"
                className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-[var(--signal)] px-6 py-3 text-[14px] font-medium text-[var(--on-signal)] transition-opacity hover:opacity-88"
              >
                {say(OWN_TRANSCRIPT.cta)}
                <span
                  aria-hidden
                  className="readout transition-transform group-hover:translate-x-1"
                >
                  →
                </span>
              </Link>
            </div>
          </Reveal>
        </section>

        {/* ── Reading guide ────────────────────────────────────────────────*/}
        <Band id="marks">
          <SectionHead
            eyebrow={say(MARKS_SECTION.eyebrow)}
            headline={say(MARKS_SECTION.headline)}
            lead={say(MARKS_SECTION.lead)}
          />
          <ul className="mt-12 grid gap-px overflow-hidden rounded-[16px] border border-[var(--line)] bg-[var(--line)] shadow-[var(--shadow-card)] sm:grid-cols-2 xl:grid-cols-3">
            {MARKS.map((mark, i) => (
              <li key={mark.figure} className="bg-[var(--panel)]">
                <Reveal delay={i * 50} className="h-full">
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

        {/* ── The one rule worth stating in full ───────────────────────────*/}
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

        {/* ── Pipeline ─────────────────────────────────────────────────────*/}
        <Band>
          <SectionHead
            eyebrow={say(PIPELINE_SECTION.eyebrow)}
            headline={say(PIPELINE_SECTION.headline)}
          />
          <ol className="mt-12 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
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

        {/* ── Limits ───────────────────────────────────────────────────────
            Before the closing call to action rather than in a footnote: a tool
            that draws conclusions about named people should say what it cannot
            do while somebody is still deciding whether to use it.

            Inverted, because it is the one section that asks the reader to
            stop, and a long page needs one change of gravity. */}
        <section className="band-invert mt-8">
          <div className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 sm:py-28">
            <SectionHead
              eyebrow={say(LIMITS_SECTION.eyebrow)}
              headline={say(LIMITS_SECTION.headline)}
            />
            <ul className="mt-12 space-y-px overflow-hidden rounded-[16px] border border-[var(--line)] bg-[var(--line)]">
              {LIMITS.map((limit, i) => (
                <li key={limit.title.en} className="bg-[var(--panel)]">
                  <Reveal delay={i * 50}>
                    <div className="grid gap-3 p-6 sm:grid-cols-[17rem_1fr] sm:gap-10 sm:p-8">
                      <h4 className="t-title">{say(limit.title)}</h4>
                      <p className="t-body text-[var(--muted)]">{say(limit.body)}</p>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--line)]">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 px-5 py-8 sm:px-8">
          <p className="max-w-[34rem] text-[12.5px] leading-[1.7] text-[var(--muted)]">
            {say(FOOTER.builtWith)}
          </p>
          <div className="flex items-center gap-5">
            <Link
              href="/how-it-works"
              className="text-[12.5px] text-[var(--body)] underline decoration-[var(--line-strong)] underline-offset-[3px] transition-colors hover:text-[var(--ink)]"
            >
              {say(FOOTER.how)}
            </Link>
            <a
              href="https://github.com/Soohwan-Lee/valueConstellation"
              className="readout text-[11px] uppercase tracking-[0.16em] text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
            >
              {say(FOOTER.repo)}
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

/** A page section with the shared vertical rhythm. */
function Band({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <section
      id={id}
      className="mx-auto max-w-[1240px] scroll-mt-20 border-t border-[var(--line)] px-5 py-16 sm:px-8 sm:py-24"
    >
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
      <div className="max-w-[46rem]">
        <p className="eyebrow">{eyebrow}</p>
        <h3 className="t-headline mt-3">{headline}</h3>
        {lead && <p className="t-lead mt-5">{lead}</p>}
      </div>
    </Reveal>
  )
}
