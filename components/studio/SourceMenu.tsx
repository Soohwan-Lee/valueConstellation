'use client'

import { useEffect, useRef, useState } from 'react'
import { SCENARIOS } from '@/data/scenarios'
import { t, type Lang } from '@/lib/i18n'

/**
 * Which meeting is on the plate, and how to change it.
 *
 * This used to be six rows in the rail — four examples, a paste button, and a
 * heading — permanently occupying the space above the controls somebody
 * actually uses while reading. Switching source is something you do once and
 * then not again, so it belongs behind one line that also answers "what am I
 * looking at", which is the question it shares an answer with.
 */
export function SourceMenu({
  activeId,
  pasting,
  lang,
  onPick,
  onPaste,
  disabled,
}: {
  activeId: string | null
  pasting: boolean
  lang: Lang
  onPick: (id: string) => void
  onPaste: () => void
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

  const current = pasting
    ? t('pasteTitle', lang)
    : (SCENARIOS.find((s) => s.id === activeId)?.title[lang] ??
      t('customSource', lang))

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-left transition-colors hover:border-[var(--line-strong)] disabled:opacity-50"
      >
        <span className="eyebrow">{t('sourceLabel', lang)}</span>
        <span className="max-w-[16rem] truncate text-[13.5px] font-medium text-[var(--ink)]">
          {current}
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
          className="animate-rise absolute left-0 top-[calc(100%+6px)] z-30 w-[min(22rem,80vw)] overflow-hidden rounded-[12px] border border-[var(--line)] bg-[var(--panel)] shadow-[var(--shadow-lift)]"
        >
          <ul className="p-1.5">
            {SCENARIOS.map((s) => {
              const active = !pasting && activeId === s.id
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onPick(s.id)
                      setOpen(false)
                    }}
                    className="w-full rounded-[8px] px-3 py-2 text-left transition-colors hover:bg-[var(--panel-2)]"
                    style={{ background: active ? 'var(--panel-2)' : undefined }}
                  >
                    <span
                      className="block text-[13.5px]"
                      style={{ color: active ? 'var(--ink)' : 'var(--body)' }}
                    >
                      {s.title[lang]}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] leading-[1.5] text-[var(--muted)]">
                      {s.teaser[lang]}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="border-t border-[var(--line)] p-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onPaste()
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-left text-[13.5px] font-medium text-[var(--ink)] transition-colors hover:bg-[var(--panel-2)]"
            >
              <span aria-hidden className="readout text-[14px] leading-none">
                +
              </span>
              {t('orPasteOwn', lang)}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
