'use client'

import { boldSegments, t, type Lang } from '@/lib/i18n'

/**
 * The permanent one-liner plus a collapsible explainer.
 *
 * Placed under the map rather than in a modal or a first-run tour: this is
 * reference text people consult at the moment they start misreading something,
 * which is not the moment they arrive. A dismissable overlay would be gone by
 * then.
 */
export function HowToRead({ lang }: { lang: Lang }) {
  const bullets = [
    'readMarker',
    'readEllipse',
    'readDot',
    'readDistance',
    'readDashed',
    'readAxes',
  ] as const

  return (
    <div className="space-y-2">
      <p className="text-[12px] leading-[1.55] text-[var(--muted)]">
        <Rich text={t('readDistance', lang)} />
      </p>
      <details className="group">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-[12px] text-[var(--body)] hover:text-[var(--ink)]">
          <span className="inline-block transition-transform group-open:rotate-90">
            ▸
          </span>
          {t('howToRead', lang)}
        </summary>
        <ul className="mt-2.5 space-y-2 border-l border-[var(--hairline)] pl-3">
          {bullets.map((key) => (
            <li
              key={key}
              className="text-[12px] leading-[1.6] text-[var(--body)]"
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
