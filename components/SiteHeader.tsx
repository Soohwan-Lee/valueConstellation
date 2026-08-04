'use client'

import Link from 'next/link'
import { Wordmark } from '@/components/Chrome'
import { LangSwitch, ThemeSwitch, usePreferences } from '@/components/Preferences'

/**
 * The bar at the top of every page that is not the studio.
 *
 * The studio keeps its own, because there the same row also carries the way
 * back and sits inside a rail rather than across the page.
 */
export function SiteHeader({
  /** Rendered at the right, after the switches. */
  action,
  /** Overview only: the mark is not a link to the page you are on. */
  home = true,
  width = 'max-w-[1240px]',
}: {
  action?: React.ReactNode
  home?: boolean
  width?: string
}) {
  const { lang } = usePreferences()
  const mark = <Wordmark lang={lang} compact />

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[color-mix(in_oklab,var(--tray)_88%,transparent)] backdrop-blur-md">
      <div
        className={`mx-auto flex ${width} items-center justify-between gap-4 px-5 py-3 sm:px-8`}
      >
        {home ? (
          <Link href="/" className="transition-opacity hover:opacity-70">
            {mark}
          </Link>
        ) : (
          mark
        )}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <LangSwitch />
          <ThemeSwitch />
          {action}
        </div>
      </div>
    </header>
  )
}
