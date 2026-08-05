'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Composer } from '@/components/Composer'
import { useBilingual } from '@/components/Preferences'
import { SiteHeader } from '@/components/SiteHeader'
import { stageTranscript } from '@/lib/handoff'
import { NEW_PAGE, WORKS_BEST } from '@/lib/landing'

/**
 * Pasting a transcript, on its own page.
 *
 * It used to be a section at the bottom of the overview, below the reading
 * guide, the region rule, the pipeline and the limits — so the one thing
 * somebody came to do was the last thing on the page, and doing it meant
 * scrolling past five explanations first.
 *
 * A page of its own is also what the step deserves: the editor gets the full
 * width, the format help and the live speaker preview are the only other things
 * on screen, and there is nothing to scroll past.
 *
 * The analysis still happens in the studio. The text is staged and the route
 * changes, so a result is only ever produced in one place.
 */
export default function NewMap() {
  const router = useRouter()
  const { lang, say } = useBilingual()
  const [transcript, setTranscript] = useState('')

  const submit = useCallback(() => {
    if (!transcript.trim()) return
    const staged = stageTranscript(transcript)
    router.push(staged ? '/studio?pending=1' : '/studio?compose=1')
  }, [router, transcript])

  return (
    <div className="min-h-dvh bg-[var(--tray)]">
      <SiteHeader width="max-w-[900px]" />

      <main className="mx-auto max-w-[900px] px-5 py-12 sm:px-8 sm:py-16">
        <Link
          href="/"
          className="text-[12.5px] text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
        >
          {say(NEW_PAGE.back)}
        </Link>

        <p className="eyebrow mt-8">{say(NEW_PAGE.eyebrow)}</p>
        <h1 className="t-headline mt-3">{say(NEW_PAGE.headline)}</h1>
        <p className="t-lead mt-4 max-w-[40rem]">{say(NEW_PAGE.lead)}</p>

        <div className="mt-10 rounded-[18px] border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[var(--shadow-card)] sm:p-7">
          <Composer
            lang={lang}
            transcript={transcript}
            onChange={setTranscript}
            onSubmit={submit}
            error={null}
            loading={false}
            variant="inline"
            autoFocus
          />
        </div>

        <p className="mt-4 text-[12.5px] leading-[1.7] text-[var(--muted)]">
          {say(NEW_PAGE.waitNote)} {say(NEW_PAGE.privacy)}
        </p>

        {/* Before the paste, not after the analysis. The map already says when
            it cannot tell participants apart and why, but it says so half a
            minute and one API call after the reader could have acted on it. */}
        <section className="mt-8 rounded-[14px] border border-[var(--line)] p-6">
          <h2 className="t-title text-[1.05rem]">{say(WORKS_BEST.heading)}</h2>
          <ul className="mt-4 space-y-3.5">
            {WORKS_BEST.items.map((item) => (
              <li key={item.en} className="flex gap-3">
                <span
                  aria-hidden
                  className="mt-[0.6rem] h-px w-4 shrink-0 bg-[var(--line-strong)]"
                />
                <span className="text-[13.5px] leading-[1.7] text-[var(--body)]">
                  {say(item)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}
