'use client'

import Link from 'next/link'
import { LangSwitch, ThemeSwitch, usePreferences } from '@/components/Preferences'
import { Reveal } from '@/components/Reveal'
import { Wordmark } from '@/components/Chrome'
import { GROUPS, HOW_FOOT, HOW_HEAD } from '@/lib/how'
import type { Bilingual } from '@/lib/landing'

/**
 * The reference page.
 *
 * Deliberately not linked from anywhere prominent. Nobody needs it to read a
 * map, and putting model names in front of somebody trying to understand a
 * meeting is how a tool starts explaining itself instead of its subject. It
 * exists for the moment somebody has to defend a result — and for that moment
 * it has to be complete, so every threshold the tool judges on is here with
 * the value it actually uses.
 */
export default function HowItWorks() {
  const { lang } = usePreferences()
  const say = (b: Bilingual) => b[lang]

  return (
    <div className="min-h-dvh bg-[var(--tray)]">
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[color-mix(in_oklab,var(--tray)_86%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex max-w-[960px] items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <Link href="/" className="transition-opacity hover:opacity-70">
            <Wordmark lang={lang} compact />
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <LangSwitch />
            <ThemeSwitch />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[960px] px-5 py-16 sm:px-8 sm:py-24">
        <Link
          href="/"
          className="text-[12.5px] text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
        >
          {say(HOW_HEAD.back)}
        </Link>

        <p className="eyebrow mt-8">{say(HOW_HEAD.eyebrow)}</p>
        <h2 className="t-headline mt-4">{say(HOW_HEAD.headline)}</h2>
        <p className="t-lead mt-5 max-w-[42rem]">{say(HOW_HEAD.lead)}</p>

        <div className="mt-16 space-y-16">
          {GROUPS.map((group, i) => (
            <Reveal key={group.title.en} delay={i * 40}>
              <section>
                <div className="rule mb-5" />
                <h3 className="t-title">{say(group.title)}</h3>
                {group.intro && (
                  <p className="mt-2 max-w-[42rem] text-[13.5px] leading-[1.7] text-[var(--muted)]">
                    {say(group.intro)}
                  </p>
                )}

                <dl className="mt-7 space-y-px overflow-hidden rounded-[12px] border border-[var(--line)] bg-[var(--line)] shadow-[var(--shadow-card)]">
                  {group.entries.map((entry) => (
                    <div
                      key={entry.term.en}
                      className="grid gap-x-8 gap-y-2 bg-[var(--panel)] p-5 sm:grid-cols-[15rem_1fr] sm:p-6"
                    >
                      <div>
                        <dt className="text-[13.5px] font-medium text-[var(--ink)]">
                          {say(entry.term)}
                        </dt>
                        {entry.value && (
                          <p className="readout mt-1 text-[12px] text-[var(--muted)]">
                            {entry.value}
                          </p>
                        )}
                      </div>
                      <dd className="text-[13.5px] leading-[1.75] text-[var(--body)]">
                        {say(entry.body)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            </Reveal>
          ))}
        </div>

        <p className="mt-16 border-l-2 border-[var(--ink)] pl-4 text-[13px] leading-[1.75] text-[var(--body)]">
          {say(HOW_FOOT)}
        </p>
      </main>
    </div>
  )
}
