'use client'

import type {
  ProjectedUtterance,
  Projection,
  SpeakerProfile,
} from '@/lib/types'
import { speakerColor } from '@/lib/colors'
import { MIN_UTTERANCES_FOR_POSITION } from '@/lib/aggregate'

/**
 * Right-hand panel. Its purpose is to make every coordinate traceable back to
 * the words that produced it — a position with no route back to the transcript
 * is not something a facilitator should be asked to trust.
 */
export function DetailPanel({
  projection,
  selectedUtterance,
  selectedSpeaker,
  onSelectUtterance,
}: {
  projection: Projection
  selectedUtterance: ProjectedUtterance | null
  selectedSpeaker: string | null
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
        <p className="text-[14px] leading-[1.6] text-[var(--ink)]">
          {selectedUtterance.text}
        </p>
        {selectedUtterance.textEn && (
          <div className="border-t border-[var(--hairline)] pt-3">
            <div className="mb-1 text-[11px] tracking-wide text-[var(--muted)]">
              TRANSLATION
            </div>
            <p className="text-[13px] leading-[1.6] text-[var(--body)]">
              {selectedUtterance.textEn}
            </p>
          </div>
        )}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-[var(--hairline)] pt-3 text-[12px]">
          <dt className="text-[var(--muted)]">position</dt>
          <dd className="tnum text-[var(--body)]">
            {selectedUtterance.x.toFixed(3)}, {selectedUtterance.y.toFixed(3)}
          </dd>
          <dt className="text-[var(--muted)]">order</dt>
          <dd className="tnum text-[var(--body)]">#{selectedUtterance.index + 1}</dd>
        </dl>
      </div>
    )
  }

  if (selectedSpeaker) {
    const speaker = projection.speakers.find((s) => s.speaker === selectedSpeaker)
    if (!speaker) return <Empty />
    const own = projection.utterances.filter((u) => u.speaker === selectedSpeaker)
    return (
      <div className="space-y-3">
        <Header
          color={speakerColor(speaker.colorIndex)}
          title={speaker.speaker}
          subtitle={`${speaker.n} mapped · ${speaker.nExcluded} excluded`}
        />

        {speaker.underdetermined && (
          <p className="rounded-[6px] border border-[var(--hairline-strong)] bg-[var(--surface-2)] px-3 py-2 text-[12px] leading-[1.5] text-[var(--body)]">
            Only {speaker.n} substantive utterance
            {speaker.n === 1 ? '' : 's'}, below the {MIN_UTTERANCES_FOR_POSITION}{' '}
            needed for a stable estimate. Treat this position as provisional.
          </p>
        )}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
          <dt className="text-[var(--muted)]">centroid</dt>
          <dd className="tnum text-[var(--body)]">
            {speaker.x.toFixed(3)}, {speaker.y.toFixed(3)}
          </dd>
          <dt className="text-[var(--muted)]">spread</dt>
          <dd className="tnum text-[var(--body)]">
            {speaker.ellipse
              ? `${speaker.ellipse.rx.toFixed(3)} × ${speaker.ellipse.ry.toFixed(3)}`
              : '—'}
          </dd>
        </dl>

        <div className="border-t border-[var(--hairline)] pt-3">
          <div className="mb-2 text-[11px] tracking-wide text-[var(--muted)]">
            UTTERANCES
          </div>
          <ul className="space-y-1.5">
            {own.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => onSelectUtterance(u)}
                  className="w-full rounded-[6px] border border-[var(--hairline)] px-2.5 py-2 text-left text-[13px] leading-[1.5] text-[var(--body)] transition-colors hover:border-[var(--hairline-strong)] hover:bg-[var(--surface-2)]"
                >
                  {u.text.length > 150 ? `${u.text.slice(0, 150)}…` : u.text}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  return <Empty />
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

function Empty() {
  return (
    <p className="text-[13px] leading-[1.6] text-[var(--muted)]">
      Select a point to read the utterance behind it, or a speaker marker to see
      everything they said.
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
}: {
  projection: Projection
  droppedSpeakers: string[]
}) {
  const ev = projection.meta.explainedVariance
  const weak = ev !== null && ev < 0.5
  const notes: string[] = []

  if (ev !== null) {
    notes.push(
      `The two components capture ${(ev * 100).toFixed(0)}% of the variance in the original embedding space.`,
    )
    if (weak) {
      notes.push(
        'Distances on this plane are a rough guide only — much of the structure does not fit in two dimensions.',
      )
    }
  } else {
    notes.push(
      'Metric MDS preserves pairwise distances but has no explained-variance measure.',
    )
  }

  if (droppedSpeakers.length > 0) {
    notes.push(
      `Not placed (no substantive utterances): ${droppedSpeakers.join(', ')}.`,
    )
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
