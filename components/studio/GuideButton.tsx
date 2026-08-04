'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { boldSegments, t, type Lang } from '@/lib/i18n'

/**
 * The reading guide, behind one button.
 *
 * It used to be a permanent rail section: a paragraph, a disclosure, and six
 * bullets, sitting below four other blocks of controls. That is reference text
 * — needed at the moment somebody starts misreading something, and in the way
 * every other moment — so it belongs one click from the map rather than
 * underneath everything else.
 */
const BULLETS = [
  'readDot',
  'readMarker',
  'readRegion',
  'readAxes',
  'readMeasure',
  'readDashed',
] as const

export function GuideButton({ lang }: { lang: Lang }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onAway = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onAway)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onAway)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full border border-[var(--line)] px-3 py-1.5 text-[12.5px] text-[var(--muted)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--ink)]"
      >
        <span aria-hidden className="readout text-[11px]">
          ?
        </span>
        {t('howToRead', lang)}
      </button>

      {open && (
        <div className="animate-rise absolute right-0 top-[calc(100%+6px)] z-30 w-[min(26rem,86vw)] rounded-[12px] border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[0_24px_48px_-24px_rgba(0,0,0,0.45)]">
          <p className="text-[12.5px] leading-[1.7] text-[var(--body)]">
            <Rich text={t('readDistance', lang)} />
          </p>
          <ul className="mt-4 space-y-2.5 border-t border-[var(--line)] pt-4">
            {BULLETS.map((key) => (
              <li
                key={key}
                className="text-[12px] leading-[1.7] text-[var(--muted)]"
              >
                <Rich text={t(key, lang)} />
              </li>
            ))}
          </ul>
          <Link
            href="/how-it-works"
            className="mt-4 inline-block text-[12px] text-[var(--body)] underline decoration-[var(--line-strong)] underline-offset-[3px] transition-colors hover:text-[var(--ink)]"
          >
            {t('howLink', lang)}
          </Link>
        </div>
      )}
    </div>
  )
}

/** Renders **bold** markers without pulling in a markdown dependency. */
function Rich({ text }: { text: string }) {
  return (
    <>
      {boldSegments(text).map((seg, i) =>
        seg.bold ? (
          <strong key={i} className="font-medium text-[var(--ink)]">
            {seg.text}
          </strong>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  )
}
