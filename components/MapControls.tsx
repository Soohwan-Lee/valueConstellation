'use client'

import type {
  ProjectionMethod,
  SpeakerProfile,
  SpeakerRenderMode,
} from '@/lib/types'
import type { SpeakerPair } from '@/lib/pairs'
import { counterpart, distanceBand, pairsWith } from '@/lib/pairs'
import { shapePath, speakerColor, speakerShape } from '@/lib/colors'
import { bandLabel, t, tf, type Lang } from '@/lib/i18n'
import { speakerLabel, type SpeakerNames } from '@/lib/speakers'
import { say, type SpeakerSummaries } from '@/lib/summaries'
import { pairChange, speakerMove, type Timeline } from '@/lib/timeline'

/**
 * The participant list.
 *
 * Two things happen per row, and they are given separate targets because they
 * answer separate questions: the row itself asks "where does this person stand
 * relative to everyone else", and the trailing toggle asks "take their points
 * off the map while I look at someone else".
 *
 * The utterance count is not decoration. A position inferred from two
 * statements must not look like one inferred from forty, so the number sits in
 * the row rather than in a tooltip.
 */
export function ParticipantList({
  speakers,
  pairs,
  hidden,
  selected,
  onSelect,
  onToggleVisible,
  onShowAll,
  onHoverPair,
  lang,
  speakerNames,
  summaries,
  timeline,
  separable,
}: {
  speakers: SpeakerProfile[]
  /** Every gap on the map, widest first. Drives the distances shown on select. */
  pairs: SpeakerPair[]
  /** What each participant argued, shown inline under their name. */
  summaries: SpeakerSummaries | null
  /** First half against second, when the transcript was timed. Usually null. */
  timeline: Timeline | null
  /**
   * Whether the map can tell these people apart at all. Qualifies what a
   * movement between the halves is allowed to be read as — see below.
   */
  separable: boolean
  hidden: Set<string>
  selected: string | null
  onSelect: (speaker: string) => void
  onToggleVisible: (speaker: string) => void
  onShowAll: () => void
  onHoverPair: (pair: SpeakerPair | null) => void
  lang: Lang
  speakerNames: SpeakerNames | null
}) {
  return (
    <div onMouseLeave={() => onHoverPair(null)}>
      <ul className="-mx-1.5 space-y-px">
        {speakers.map((s) => {
          const visible = !hidden.has(s.speaker)
          const isSelected = selected === s.speaker
          const move = speakerMove(timeline, s.speaker)
          return (
            <li
              key={s.speaker}
              className="group rounded-[7px] border transition-colors"
              style={{
                background: isSelected ? 'var(--panel-2)' : 'transparent',
                borderColor: isSelected ? 'var(--line-strong)' : 'transparent',
              }}
            >
              <div className="flex items-center">
              <button
                type="button"
                onClick={() => onSelect(s.speaker)}
                aria-expanded={isSelected}
                className="flex min-w-0 flex-1 cursor-pointer flex-col gap-1 rounded-[7px] px-2 py-2 text-left transition-colors group-hover:bg-[var(--panel-2)]"
                style={{ opacity: visible ? 1 : 0.4 }}
              >
                <span className="flex w-full items-center gap-2.5">
                  <svg
                    width={11}
                    height={11}
                    viewBox="-6 -6 12 12"
                    className="shrink-0"
                  >
                    <path
                      d={shapePath(speakerShape(s.colorIndex), 4.6)}
                      fill={
                        s.underdetermined ? 'var(--panel)' : speakerColor(s.colorIndex)
                      }
                      stroke={speakerColor(s.colorIndex)}
                      strokeWidth={s.underdetermined ? 1.6 : 0}
                    />
                  </svg>
                  <span className="truncate text-[13.5px] text-[var(--ink)]">
                    {speakerLabel(s.speaker, lang, speakerNames)}
                  </span>
                  {s.underdetermined && (
                    <span
                      className="readout shrink-0 text-[12px] text-[var(--muted)]"
                      title={tf('underdeterminedHint', lang, {
                        n: s.n,
                        s: s.n === 1 ? '' : 's',
                      })}
                    >
                      ?
                    </span>
                  )}
                  {/* Only for the people the clock actually separated. A tag
                      on everybody would be a tag on nobody — and half the
                      transcripts this tool sees carry no time at all, so
                      nothing in the row may depend on one being there. */}
                  {move?.moved && (
                    <span
                      className="ml-auto shrink-0 rounded-[3px] border border-[var(--line-strong)] px-1.5 py-px text-[12px] leading-[1.4] text-[var(--body)]"
                      title={tf('movedHint', lang, {
                        early: move.early,
                        late: move.late,
                      })}
                    >
                      {t('movedTag', lang)}
                    </span>
                  )}
                  <span
                    className={`readout shrink-0 pl-2 text-[12px] text-[var(--muted)] ${
                      move?.moved ? '' : 'ml-auto'
                    }`}
                  >
                    {s.n}
                  </span>
                  {/* The one mark saying this row opens. Without it the list
                      was a column of names, a count and a dot, and nothing in
                      it suggested that the thing to do was press one — which
                      is the first move the studio expects of anybody. */}
                  <span
                    aria-hidden
                    className="readout shrink-0 text-[8px] text-[var(--faint)] transition-transform group-hover:text-[var(--muted)]"
                    style={{ transform: isSelected ? 'rotate(90deg)' : 'none' }}
                  >
                    ▶
                  </span>
                </span>

                {/* What this person argued, in the list rather than behind a
                    click. The rail was a column of names and counts, which
                    tells a reader who was in the room and nothing about it —
                    every summary needed a separate click to reach, so nobody
                    would ever see two of them side by side. That comparison is
                    the entire point of the tool.

                    Clamped to two lines until selected, so the list stays
                    scannable and the full sentence is one click away. */}
                {summaries?.[s.speaker] && (
                  <span
                    className={`block pl-[21px] text-[12px] leading-[1.5] text-[var(--muted)] ${
                      isSelected ? '' : 'line-clamp-2'
                    }`}
                  >
                    {say(summaries[s.speaker].stance, lang)}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => onToggleVisible(s.speaker)}
                aria-pressed={!visible}
                title={visible ? t('hideOnMap', lang) : t('showOnMap', lang)}
                aria-label={visible ? t('hideOnMap', lang) : t('showOnMap', lang)}
                className="mr-1 rounded-[4px] px-1.5 py-2 text-[var(--faint)] transition-colors hover:text-[var(--ink)]"
              >
                <svg width={12} height={12} viewBox="0 0 12 12" aria-hidden>
                  <circle
                    cx={6}
                    cy={6}
                    r={4}
                    fill={visible ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeWidth={1.2}
                  />
                </svg>
              </button>
              </div>

              {/* Distances live inside the row of the person they are measured
                  from, rather than in a section of their own. They only mean
                  anything once somebody is selected, and a permanently visible
                  list of pairs is a second thing to learn for an answer nobody
                  asked for yet. */}
              {isSelected && (
                <DistancesFrom
                  pairs={pairs}
                  speaker={s.speaker}
                  onHover={onHoverPair}
                  lang={lang}
                  speakerNames={speakerNames}
                  timeline={timeline}
                />
              )}
            </li>
          )
        })}
      </ul>
      {hidden.size > 0 && (
        <button
          type="button"
          onClick={onShowAll}
          className="mt-2 text-[12px] text-[var(--muted)] underline decoration-[var(--line-strong)] underline-offset-[3px] transition-colors hover:text-[var(--ink)]"
        >
          {t('showAll', lang)}
        </button>
      )}

      {/* What the tag above means, and where the meeting was cut. A mark with
          no sentence beside it is a coinage, and this one would be read as
          "changed their mind" — which is not what was measured. */}
      {timeline && (
        <p className="mt-3 text-[12px] leading-[1.55] text-[var(--muted)]">
          {tf(
            timeline.moves.some((m) => m.moved)
              ? 'timeSplitNote'
              : 'timeSplitNoneNote',
            lang,
            { at: timeline.splitAt },
          )}
          {/* Only where the map has already admitted it cannot separate these
              people, which is the same condition that means several agenda
              items were covered — and then the second half is about something
              else, so everybody's late statements differ without anybody
              having moved. */}
          {!separable && timeline.moves.some((m) => m.moved) && (
            <> {t('timeTopicCaveat', lang)}</>
          )}
        </p>
      )}
    </div>
  )
}

/**
 * The gaps from one selected participant to everybody else, nearest first.
 *
 * Sits inside that person's row rather than in a section of its own. A
 * permanently visible table of pairs is a second thing to learn, positioned
 * above the controls somebody is actually using, answering a question they have
 * not asked yet — and it only means anything once a participant is chosen.
 *
 * Quoted as a share of the widest gap on the map: projected units mean nothing
 * between two maps, so an absolute figure would invite exactly the comparison
 * the method cannot support. Hovering a row draws that one line.
 */
function DistancesFrom({
  pairs,
  speaker,
  onHover,
  lang,
  speakerNames,
  timeline,
}: {
  pairs: SpeakerPair[]
  speaker: string
  onHover: (pair: SpeakerPair | null) => void
  lang: Lang
  speakerNames: SpeakerNames | null
  timeline: Timeline | null
}) {
  const mine = [...pairsWith(pairs, speaker)].sort(
    (a, b) => a.distance - b.distance,
  )
  if (mine.length === 0) return null

  return (
    <div className="px-1.5 pb-2.5 pt-0.5">
      <div className="eyebrow mb-1.5 pl-[21px]">{t('distanceLabel', lang)}</div>
      <ul className="space-y-px">
        {mine.map((pair) => {
          const other = counterpart(pair, speaker).speaker
          // Only when it changed. `same` is a real answer and it is the answer
          // for most pairs, but printing "unchanged" on every row would bury
          // the one that is not — it is said once, in the note below.
          const change = pairChange(timeline, speaker, other)
          const moved = change && change.direction !== 'same' ? change : null
          return (
          <li key={`${pair.a.speaker}-${pair.b.speaker}`}>
            <div
              onMouseEnter={() => onHover(pair)}
              className="rounded-[5px] py-1.5 pl-[21px] pr-1 transition-colors hover:bg-[var(--panel)]"
            >
              <div className="flex items-baseline gap-2">
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-[var(--body)]">
                  {speakerLabel(other, lang, speakerNames)}
                </span>
                {/* A bar, so the column can be scanned without reading every
                    number. Its width is the ratio the number states. */}
                <span
                  aria-hidden
                  className="h-px shrink-0 bg-[var(--line-strong)]"
                  style={{ width: `${Math.max(3, pair.relative * 40)}px` }}
                />
                <span className="readout w-[30px] shrink-0 text-right text-[12px] text-[var(--muted)]">
                  {pair.relative.toFixed(2)}
                </span>
              </div>
              {/* The gap in words, carrying the emphasis the number used to
                  hold. "0.47" is a ratio nobody can read without first being
                  told what it is a ratio of; "근거가 조금 다름" is the sentence
                  somebody came to the panel for, and the figure behind it is
                  there for whoever wants to check the ordering. */}
              <span className="mt-0.5 block text-[12px] leading-[1.45] text-[var(--ink)]">
                {bandLabel(distanceBand(pair.relative), lang)}
                {moved && (
                  <span className="text-[var(--muted)]">
                    {' · '}
                    {t(moved.direction === 'closer' ? 'pairCloser' : 'pairApart', lang)}
                  </span>
                )}
              </span>
            </div>
          </li>
          )
        })}
      </ul>
      <p className="mt-2 pl-[21px] text-[12px] leading-[1.55] text-[var(--muted)]">
        {t('distanceNote', lang)}
      </p>
    </div>
  )
}

/**
 * What each mark means, stated on the plate.
 *
 * A first-time reader arrives at a field of dots and shapes with no idea which
 * of them is a person and which is a sentence. That belongs above the map and
 * permanently visible, not inside a disclosure in the rail — by the time
 * somebody knows to look for an explanation they have already misread the
 * picture. The glyphs are drawn in ink rather than in a speaker's colour,
 * because colour on this page means identity and the legend names mark types.
 *
 * The measure entry doubles as the only signpost for the map's one hidden
 * action, which is why it names the gesture rather than just the mark.
 */
export function MarkLegend({
  showRegions,
  showPoints,
  hasAxes,
  lang,
}: {
  showRegions: boolean
  showPoints: boolean
  /** True when the layout named its axes, which only PCA does. */
  hasAxes: boolean
  lang: Lang
}) {
  const items: { key: string; glyph: React.ReactNode; label: string }[] = []

  if (hasAxes) {
    items.push({
      key: 'axes',
      glyph: (
        <>
          <line x1={1} y1={7} x2={13} y2={7} stroke="var(--line-strong)" strokeWidth={1} strokeDasharray="2 3" />
          <line x1={7} y1={1} x2={7} y2={13} stroke="var(--line-strong)" strokeWidth={1} strokeDasharray="2 3" />
        </>
      ),
      label: t('legendAxis', lang),
    })
  }

  if (showPoints) {
    items.push({
      key: 'marker',
      glyph: <circle cx={7} cy={7} r={4.5} fill="var(--muted)" />,
      label: t('legendMarker', lang),
    })
  }
  items.push({
    key: 'dot',
    glyph: <circle cx={7} cy={7} r={2} fill="var(--muted)" />,
    label: t('legendDot', lang),
  })
  if (showRegions) {
    items.push({
      key: 'region',
      glyph: (
        <path
          d="M2.4 7.6C2.4 4.4 4.4 2.2 7.4 2.4C10.6 2.6 12 4.4 11.7 7.6C11.4 10.5 9.6 11.8 6.8 11.6C4 11.4 2.4 10.2 2.4 7.6Z"
          fill="none"
          stroke="var(--muted)"
          strokeWidth={1}
          strokeDasharray="2.5 2"
        />
      ),
      label: t('legendRegion', lang),
    })
  }
  items.push({
    key: 'measure',
    glyph: (
      <>
        <line x1={1.5} y1={10} x2={12.5} y2={4} stroke="var(--muted)" strokeWidth={1} />
        <circle cx={1.5} cy={10} r={1.6} fill="var(--muted)" />
        <circle cx={12.5} cy={4} r={1.6} fill="var(--muted)" />
      </>
    ),
    label: t('legendMeasure', lang),
  })

  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map((item) => (
        <li
          key={item.key}
          className="flex items-center gap-1.5 text-[12px] text-[var(--muted)]"
        >
          <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden className="shrink-0">
            {item.glyph}
          </svg>
          {item.label}
        </li>
      ))}
    </ul>
  )
}

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string; title?: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12.5px] text-[var(--muted)]">{label}</span>
      <div className="flex rounded-[6px] bg-[var(--panel-2)] p-0.5">
        {options.map((o) => {
          const on = value === o.value
          return (
            <button
              key={o.value}
              type="button"
              title={o.title}
              onClick={() => onChange(o.value)}
              aria-pressed={on}
              className="rounded-[4px] px-2 py-1 text-[12px] transition-colors"
              style={{
                background: on ? 'var(--signal)' : 'transparent',
                color: on ? 'var(--on-signal)' : 'var(--muted)',
              }}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function renderModeOptions(
  lang: Lang,
): { value: SpeakerRenderMode; label: string; title: string }[] {
  return [
    { value: 'point', label: t('modePoint', lang), title: t('modePointHint', lang) },
    { value: 'region', label: t('modeRegion', lang), title: t('modeRegionHint', lang) },
    { value: 'both', label: t('modeBoth', lang), title: t('modeBothHint', lang) },
  ]
}

/**
 * Layouts, named for what they show rather than for the algorithm.
 *
 * "PCA" and "MDS" are what a reader would look up, and also what nobody
 * choosing a view is thinking about. The technical names are on the reference
 * page; here the label answers "what will this show me".
 *
 * Rendered by `studio/LayoutMenu`, on the toolbar above the map rather than in
 * the console rail — the choice is an angle on the picture, and in the rail it
 * competed with the participant list for the reader's first decision.
 */
export function methodOptions(
  lang: Lang,
): { value: ProjectionMethod; label: string; description: string }[] {
  return [
    { value: 'people', label: t('methodPeople', lang), description: t('methodPeopleHint', lang) },
    { value: 'pca', label: t('methodPca', lang), description: t('methodPcaHint', lang) },
    { value: 'mds', label: t('methodMds', lang), description: t('methodMdsHint', lang) },
  ]
}
