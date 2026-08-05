'use client'

import { useEffect, useRef, useState } from 'react'
import { methodOptions } from '@/components/MapControls'
import { t, type Lang } from '@/lib/i18n'
import type { ProjectionMethod } from '@/lib/types'

/**
 * Which way the same result is laid out, on the toolbar rather than in the rail.
 *
 * This was an open rail section directly under the participant list: three
 * radio options, each with two lines of explanation, plus a closing paragraph.
 * By area it outweighed the list it sat beneath, which put "how should this be
 * drawn" at the same level as "who is in this room" — and only one of those is
 * what somebody opened the tool to ask.
 *
 * A layout is an angle on the map, so it belongs to the map. Here it sits
 * beside the source and the reading guide, shut, showing the current choice by
 * name. The reasons are unchanged and one click away: the option was made
 * usable by explaining it, and hiding the explanations again would undo that.
 */
export function LayoutMenu({
  value,
  onChange,
  lang,
  disabled,
}: {
  value: ProjectionMethod
  onChange: (v: ProjectionMethod) => void
  lang: Lang
  disabled?: boolean
}) {
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

  const options = methodOptions(lang)
  const current = options.find((o) => o.value === value)

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full border border-[var(--line)] px-3 py-1.5 text-left transition-colors hover:border-[var(--line-strong)] disabled:opacity-50"
      >
        <span className="eyebrow">{t('layoutLabel', lang)}</span>
        <span className="max-w-[11rem] truncate text-[12.5px] text-[var(--body)]">
          {current?.label}
        </span>
        <span
          aria-hidden
          className="readout text-[9px] text-[var(--muted)] transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : undefined }}
        >
          ▼
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="animate-rise absolute right-0 top-[calc(100%+6px)] z-30 w-[min(24rem,86vw)] rounded-[12px] border border-[var(--line)] bg-[var(--panel)] p-1.5 shadow-[var(--shadow-lift)]"
        >
          {options.map((o) => {
            const on = o.value === value
            return (
              <button
                key={o.value}
                type="button"
                role="menuitemradio"
                aria-checked={on}
                onClick={() => {
                  onChange(o.value)
                  setOpen(false)
                }}
                className="flex w-full items-start gap-2.5 rounded-[8px] px-3 py-2.5 text-left transition-colors hover:bg-[var(--panel-2)]"
                style={{ background: on ? 'var(--panel-2)' : undefined }}
              >
                <span
                  aria-hidden
                  className="mt-[3px] grid size-[13px] shrink-0 place-items-center rounded-full border transition-colors"
                  style={{
                    borderColor: on ? 'var(--signal)' : 'var(--line-strong)',
                    borderWidth: on ? 4 : 1,
                  }}
                />
                <span className="min-w-0">
                  <span
                    className="block text-[13px] leading-[1.4]"
                    style={{ color: on ? 'var(--ink)' : 'var(--body)' }}
                  >
                    {o.label}
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-[1.5] text-[var(--muted)]">
                    {o.description}
                  </span>
                </span>
              </button>
            )
          })}
          <p className="border-t border-[var(--line)] px-3 pb-1 pt-3 text-[12px] leading-[1.6] text-[var(--muted)]">
            {t('methodNote', lang)}
          </p>
        </div>
      )}
    </div>
  )
}
