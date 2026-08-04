'use client'

import { boldSegments, t, type Lang } from '@/lib/i18n'

/**
 * Reference for reading the map.
 *
 * Kept in the rail as a collapsed list rather than as a first-run tour: this is
 * text people consult at the moment they start misreading something, which is
 * not the moment they arrive. A dismissable overlay would be gone by then.
 *
 * One line stays open — the one that corrects the mistake everyone makes, which
 * is treating proximity as agreement.
 */
export function HowToRead({ lang }: { lang: Lang }) {
  const bullets = [
    'readMarker',
    'readRegion',
    'readDot',
    'readMeasure',
    'readDashed',
    'readAxes',
  ] as const

  return (
    <div>
      <p className="mb-2.5 text-[12.5px] leading-[1.65] text-[var(--body)]">
        <Rich text={t('readDistance', lang)} />
      </p>
      <details className="group">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-[12px] text-[var(--muted)] transition-colors hover:text-[var(--ink)]">
          <span
            aria-hidden
            className="readout inline-block text-[9px] transition-transform group-open:rotate-90"
          >
            ▶
          </span>
          {t('markLegend', lang)}
        </summary>
        <ul className="mt-3 space-y-2.5 border-l border-[var(--line)] pl-3">
          {bullets.map((key) => (
            <li
              key={key}
              className="text-[12px] leading-[1.7] text-[var(--muted)]"
            >
              <Rich text={t(key, lang)} />
            </li>
          ))}
        </ul>
      </details>
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
