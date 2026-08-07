'use client'

import { useMemo, useState } from 'react'
import type { ProjectedUtterance } from '@/lib/types'
import type { Consensus } from '@/lib/consensus'
import { spreadPositions } from '@/lib/consensus'
import type { Exchange } from '@/lib/exchanges'
import { clockSeconds } from '@/lib/timeline'
import { shapePath, speakerColor, speakerShape } from '@/lib/colors'
import { exchangeLabel, t, tf, type Lang } from '@/lib/i18n'
import { speakerLabel, type SpeakerNames } from '@/lib/speakers'
import { say } from '@/lib/summaries'

/**
 * The meeting as it happened: time across, distance from what the room landed
 * on down, and an arrow wherever one statement answered another.
 *
 * The map answers "who is near whom" and cannot answer "how did they get
 * there". Two rooms with identical coordinates can be four people taking each
 * other's arguments apart and four people delivering monologues in turn, and
 * for anybody who has to run the next meeting that is the whole difference.
 *
 * Both axes are measured rather than drawn. Horizontal is the clock, or
 * transcript order when there is none. Vertical is the distance from the
 * landing point in embedding space, before any projection — the one view where
 * a reader watches things approach something else over time is the last place a
 * layout fitted to spread people apart should be allowed to speak.
 *
 * What the vertical axis may NOT say is how close anything is. Sentence
 * distances in this space are bunched into a narrow band, so the axis is
 * rescaled to the meeting's own range and labelled by its ends — "closest of
 * what was said" and "furthest" — never by a number. See `spreadPositions`.
 */

const VIEW_W = 900
const VIEW_H = 520
const PAD = { top: 34, right: 28, bottom: 54, left: 30 }

interface Props {
  utterances: ProjectedUtterance[]
  consensus: Consensus | null
  exchanges: Exchange[]
  hiddenSpeakers: Set<string>
  selectedId: string | null
  selectedSpeaker: string | null
  onSelect: (u: ProjectedUtterance | null) => void
  lang: Lang
  speakerNames: SpeakerNames | null
  /** Colour slot per speaker, so the two views agree on who is who. */
  colorIndex: Record<string, number>
}

export function FlowView({
  utterances,
  consensus,
  exchanges,
  hiddenSpeakers,
  selectedId,
  selectedSpeaker,
  onSelect,
  lang,
  speakerNames,
  colorIndex,
}: Props) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [hoveredEdge, setHoveredEdge] = useState<Exchange | null>(null)

  const layout = useMemo(() => {
    const gap = consensus?.gap ?? {}
    const spread = spreadPositions(gap)
    const placed = utterances
      .filter((u) => spread[u.id] !== undefined)
      .map((u) => ({ u, seconds: clockSeconds(u.at) }))
      .sort((a, b) =>
        a.seconds !== null && b.seconds !== null
          ? a.seconds - b.seconds
          : a.u.index - b.u.index,
      )
    if (placed.length === 0) return null

    // The clock when every statement carries one, transcript order otherwise.
    // Mixed input falls back to order: a horizontal axis where half the points
    // are minutes and half are line numbers is not an axis.
    const timed = placed.every((p) => p.seconds !== null)
    const first = timed ? placed[0].seconds! : 0
    const last = timed ? placed[placed.length - 1].seconds! : placed.length - 1
    const span = Math.max(1, last - first)

    const width = VIEW_W - PAD.left - PAD.right
    const height = VIEW_H - PAD.top - PAD.bottom

    const points = placed.map((p, i) => ({
      u: p.u,
      seconds: p.seconds,
      x: PAD.left + (((timed ? p.seconds! : i) - first) / span) * width,
      // 1 is the furthest statement, drawn at the top; the landing point is the
      // line along the bottom, so converging reads as descending.
      y: PAD.top + spread[p.u.id] * height,
    }))

    const byId = new Map(points.map((p) => [p.u.id, p]))
    const bySpeaker = new Map<string, typeof points>()
    for (const p of points) {
      const list = bySpeaker.get(p.u.speaker) ?? []
      list.push(p)
      bySpeaker.set(p.u.speaker, list)
    }

    const edges = exchanges
      .map((e) => ({ e, from: byId.get(e.from), to: byId.get(e.to) }))
      .filter(
        (x): x is { e: Exchange; from: (typeof points)[0]; to: (typeof points)[0] } =>
          Boolean(x.from && x.to),
      )

    return { points, byId, bySpeaker, edges, timed, first, last, height, width }
  }, [utterances, consensus, exchanges])

  if (!layout) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="max-w-[36ch] text-center text-[13px] leading-[1.7] text-[var(--muted)]">
          {t('flowUnavailable', lang)}
        </p>
      </div>
    )
  }

  const dim = (speaker: string) =>
    hiddenSpeakers.has(speaker) ||
    (selectedSpeaker !== null && selectedSpeaker !== speaker)

  const baseline = VIEW_H - PAD.bottom + 16

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="min-h-0 w-full flex-1"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={t('flowTitle', lang)}
      >
        {/* The landing point, as the floor everything is measured to. Drawn in
            ink: it is not a person, and colour on this page means a person. */}
        <line
          x1={PAD.left - 12}
          y1={baseline}
          x2={VIEW_W - PAD.right}
          y2={baseline}
          stroke="var(--ink)"
          strokeWidth={1.2}
        />
        {/* Above the line, not below it: the clock labels live under the line
            and a caption sharing that row would sit on top of them. */}
        <text
          x={PAD.left - 12}
          y={baseline - 7}
          className="fill-[var(--ink)] text-[13px] font-medium"
        >
          {t(
            consensus?.basis === 'consensus' ? 'flowFloorConsensus' : 'flowFloorGroup',
            lang,
          )}
        </text>

        {/* Vertical axis, named by its ends rather than by a distance — see the
            note at the top of this file. */}
        <text
          x={PAD.left - 12}
          y={PAD.top - 14}
          className="fill-[var(--muted)] text-[12px]"
        >
          {t('flowAxisFar', lang)}
        </text>

        {/* Time, with the first and last statement marked. */}
        {layout.timed && (
          <>
            <text
              x={PAD.left}
              y={VIEW_H - 12}
              className="readout fill-[var(--faint)] text-[12px]"
            >
              {layout.points[0].u.at}
            </text>
            <text
              x={VIEW_W - PAD.right}
              y={VIEW_H - 12}
              textAnchor="end"
              className="readout fill-[var(--faint)] text-[12px]"
            >
              {layout.points[layout.points.length - 1].u.at}
            </text>
          </>
        )}

        {/* Exchanges under the statements, so an arrow never covers a mark it
            points at. Curved away from the straight line between the two, which
            is the only way a reply spanning ten minutes stays readable. */}
        <g fill="none">
          {layout.edges.map(({ e, from, to }) => {
            const faded = dim(from.u.speaker) || dim(to.u.speaker)
            const live = hoveredEdge === e || hovered === e.from || hovered === e.to
            const mx = (from.x + to.x) / 2
            const my = (from.y + to.y) / 2 - Math.min(70, Math.abs(from.x - to.x) / 3 + 16)
            const d = `M ${to.x} ${to.y} Q ${mx} ${my} ${from.x} ${from.y}`
            return (
              <g key={`${e.from}-${e.to}`}>
                {/* A 1px stroke is a 1px hover target. The invisible one
                    underneath is what makes the arcs reachable with a mouse. */}
                <path
                  d={d}
                  stroke="transparent"
                  strokeWidth={12}
                  onMouseEnter={() => setHoveredEdge(e)}
                  onMouseLeave={() => setHoveredEdge(null)}
                  className="pointer-events-auto"
                />
                <path
                  d={d}
                  stroke={live ? 'var(--ink)' : 'var(--line-strong)'}
                  strokeWidth={live ? 1.4 : 1}
                  strokeDasharray={e.kind === 'challenges' ? undefined : '3 3'}
                  opacity={faded ? 0.12 : live ? 1 : 0.5}
                  pointerEvents="none"
                />
              </g>
            )
          })}
        </g>

        {/* One line per speaker through their own statements, in order. */}
        {[...layout.bySpeaker].map(([speaker, points]) => (
          <polyline
            key={speaker}
            points={points.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={speakerColor(colorIndex[speaker] ?? 0)}
            strokeWidth={1}
            opacity={dim(speaker) ? 0.08 : 0.35}
          />
        ))}

        {layout.points.map((p) => {
          const faded = dim(p.u.speaker)
          const active = selectedId === p.u.id || hovered === p.u.id
          const colour = speakerColor(colorIndex[p.u.speaker] ?? 0)
          return (
            <g
              key={p.u.id}
              transform={`translate(${p.x} ${p.y})`}
              opacity={faded ? 0.12 : 1}
              onMouseEnter={() => setHovered(p.u.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSelect(p.u)}
              className="cursor-pointer"
            >
              <circle r={11} fill="transparent" />
              <path
                d={shapePath(speakerShape(colorIndex[p.u.speaker] ?? 0), active ? 6 : 4.2)}
                fill={colour}
                stroke="var(--plate)"
                strokeWidth={active ? 1.4 : 0}
              />
            </g>
          )
        })}
      </svg>

      {/* What is being pointed at, in words. Hovering an arrow says what the
          answer did to the earlier point; hovering a mark says who said it and
          when. Neither is a tooltip on a figure — both are the sentence the
          picture is standing in for. */}
      <div className="min-h-[3.2rem] shrink-0 border-t border-[var(--line)] px-4 py-2.5">
        {hoveredEdge ? (
          <p className="text-[12.5px] leading-[1.6] text-[var(--ink)]">
            <span className="font-medium">
              {speakerLabel(
                layout.byId.get(hoveredEdge.from)?.u.speaker ?? '',
                lang,
                speakerNames,
              )}
            </span>
            {' → '}
            <span className="font-medium">
              {speakerLabel(
                layout.byId.get(hoveredEdge.to)?.u.speaker ?? '',
                lang,
                speakerNames,
              )}
            </span>
            <span className="text-[var(--muted)]">
              {' · '}
              {exchangeLabel(hoveredEdge.kind, lang)}
              {' · '}
              {say(hoveredEdge.note, lang)}
            </span>
          </p>
        ) : hovered ? (
          <p className="truncate text-[12.5px] leading-[1.6] text-[var(--muted)]">
            <span className="font-medium text-[var(--ink)]">
              {speakerLabel(
                layout.byId.get(hovered)?.u.speaker ?? '',
                lang,
                speakerNames,
              )}
            </span>
            {layout.byId.get(hovered)?.u.at && (
              <span className="readout"> {layout.byId.get(hovered)?.u.at}</span>
            )}
            {' · '}
            {layout.byId.get(hovered)?.u.text}
          </p>
        ) : (
          <p className="text-[12px] leading-[1.6] text-[var(--muted)]">
            {tf('flowHint', lang, { n: layout.edges.length })}
          </p>
        )}
      </div>
    </div>
  )
}
