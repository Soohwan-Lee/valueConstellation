'use client'

import type {
  ProjectedUtterance,
  Projection,
  SpeakerProfile,
} from '@/lib/types'
import { speakerColor } from '@/lib/colors'
import { MIN_UTTERANCES_FOR_POSITION } from '@/lib/aggregate'
import { t, tf, type Lang } from '@/lib/i18n'

/**
 * Right-hand panel. Its purpose is to make every coordinate traceable back to
 * the words that produced it — a position with no route back to the transcript
 * is not something a facilitator should be asked to trust.
 */
export function DetailPanel({
  projection,
  selectedUtterance,
  selectedSpeaker,
  lang,
  onSelectUtterance,
}: {
  projection: Projection
  selectedUtterance: ProjectedUtterance | null
  selectedSpeaker: string | null
  lang: Lang
  onSelectUtterance: (u: ProjectedUtterance) => void
}) {
  if (selectedUtterance) {
    const speaker = projection.speakers.find(
      (s) => s.speaker === selectedUtterance.speaker,
    )
    return (
      <div className="space-y-3">
        <Header
          color={speakerColor(speaker?.colorIndex ?? 0)}
          title={selectedUtterance.speaker}
          subtitle={selectedUtterance.kind}
        />
        {/* Original and translation appear together, never one replacing the
            other: the words as spoken are the evidence behind the position. */}
        <div>
          <div className="mb-1 text-[11px] tracking-wide text-[var(--muted)]">
            {t('original', lang).toUpperCase()}
          </div>
          <p className="text-[14px] leading-[1.6] text-[var(--ink)]">
            {selectedUtterance.text}
          </p>
        </div>
        {selectedUtterance.textEn && (
          <div className="border-t border-[var(--hairline)] pt-3">
            <div className="mb-1 text-[11px] tracking-wide text-[var(--muted)]">
              {t('translation', lang).toUpperCase()}
            </div>
            <p className="text-[13px] leading-[1.6] text-[var(--body)]">
              {selectedUtterance.textEn}
            </p>
          </div>
        )}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-[var(--hairline)] pt-3 text-[12px]">
          <dt className="text-[var(--muted)]">{t('position', lang)}</dt>
          <dd className="tnum text-[var(--body)]">
            {selectedUtterance.x.toFixed(3)}, {selectedUtterance.y.toFixed(3)}
          </dd>
          <dt className="text-[var(--muted)]">{t('order', lang)}</dt>
          <dd className="tnum text-[var(--body)]">#{selectedUtterance.index + 1}</dd>
        </dl>
      </div>
    )
  }

  if (selectedSpeaker) {
    const speaker = projection.speakers.find((s) => s.speaker === selectedSpeaker)
    if (!speaker) return <Empty lang={lang} />
    const own = projection.utterances.filter((u) => u.speaker === selectedSpeaker)
    return (
      <div className="space-y-3">
        <Header
          color={speakerColor(speaker.colorIndex)}
          title={speaker.speaker}
          subtitle={`${speaker.n} · ${speaker.nExcluded} ${t('excluded', lang)}`}
        />

        {speaker.underdetermined && (
          <p className="rounded-[6px] border border-[var(--hairline-strong)] bg-[var(--surface-2)] px-3 py-2 text-[12px] leading-[1.5] text-[var(--body)]">
            {t('provisional', lang)} ({speaker.n} &lt;{' '}
            {MIN_UTTERANCES_FOR_POSITION})
          </p>
        )}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
          <dt className="text-[var(--muted)]">{t('centroid', lang)}</dt>
          <dd className="tnum text-[var(--body)]">
            {speaker.x.toFixed(3)}, {speaker.y.toFixed(3)}
          </dd>
          <dt className="text-[var(--muted)]">{t('spreadLabel', lang)}</dt>
          <dd className="tnum text-[var(--body)]">
            {speaker.ellipse
              ? `${speaker.ellipse.rx.toFixed(3)} × ${speaker.ellipse.ry.toFixed(3)}`
              : '—'}
          </dd>
        </dl>

        <div className="border-t border-[var(--hairline)] pt-3">
          <div className="mb-2 text-[11px] tracking-wide text-[var(--muted)]">
            {t('utterances', lang).toUpperCase()}
          </div>
          <ul className="space-y-1.5">
            {own.map((u) => {
              const body = lang === 'en' && u.textEn ? u.textEn : u.text
              return (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => onSelectUtterance(u)}
                    className="w-full rounded-[6px] border border-[var(--hairline)] px-2.5 py-2 text-left text-[13px] leading-[1.5] text-[var(--body)] transition-colors hover:border-[var(--hairline-strong)] hover:bg-[var(--surface-2)]"
                  >
                    {body.length > 150 ? `${body.slice(0, 150)}…` : body}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    )
  }

  return <Empty lang={lang} />
}

function Header({
  color,
  title,
  subtitle,
}: {
  color: string
  title: string
  subtitle: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="size-2.5 shrink-0 rounded-full"
        style={{ background: color }}
      />
      <span className="text-[14px] font-medium text-[var(--ink)]">{title}</span>
      <span className="text-[12px] text-[var(--muted)]">{subtitle}</span>
    </div>
  )
}

function Empty({ lang }: { lang: Lang }) {
  return (
    <p className="text-[13px] leading-[1.6] text-[var(--muted)]">
      {t('selectPrompt', lang)}
    </p>
  )
}

/**
 * Projection caveats.
 *
 * Explained variance is surfaced rather than buried: a two-component view that
 * captures little of the original variance will still render as a confident
 * picture of who clusters with whom, and the reader has no way to tell without
 * being told.
 */
export function ProjectionNotice({
  projection,
  droppedSpeakers,
  lang,
}: {
  projection: Projection
  droppedSpeakers: string[]
  lang: Lang
}) {
  const ev = projection.meta.explainedVariance
  const weak = ev !== null && ev < 0.5
  const notes: string[] = []

  if (ev !== null) {
    notes.push(tf('variance', lang, { pct: (ev * 100).toFixed(0) }))
    if (weak) notes.push(t('varianceWeak', lang))
  } else {
    notes.push(t('mdsNote', lang))
  }

  if (droppedSpeakers.length > 0) {
    notes.push(`${t('notPlaced', lang)}: ${droppedSpeakers.join(', ')}`)
  }

  return (
    <div
      className="rounded-[6px] border px-3 py-2 text-[12px] leading-[1.55]"
      style={{
        borderColor: weak ? 'var(--hairline-strong)' : 'var(--hairline)',
        background: 'var(--surface)',
        color: 'var(--body)',
      }}
    >
      {notes.join(' ')}
    </div>
  )
}
