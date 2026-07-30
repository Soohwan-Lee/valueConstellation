'use client'

import { useMemo, useRef, useState } from 'react'
import type {
  Projection,
  ProjectedUtterance,
  SpeakerProfile,
  SpeakerRenderMode,
} from '@/lib/types'
import { shapePath, speakerColor, speakerShape } from '@/lib/colors'

interface Props {
  projection: Projection
  renderMode: SpeakerRenderMode
  /** Speakers currently visible. Others are dimmed, never removed. */
  activeSpeakers: Set<string>
  selectedId: string | null
  onSelect: (utterance: ProjectedUtterance | null) => void
  onSelectSpeaker: (speaker: string) => void
}

const PADDING = 56
const VIEW_W = 900
const VIEW_H = 620

/** Opacity for utterances belonging to a filtered-out speaker. */
const DIMMED = 0.12

export function ConstellationMap({
  projection,
  renderMode,
  activeSpeakers,
  selectedId,
  onSelect,
  onSelectSpeaker,
}: Props) {
  const [hovered, setHovered] = useState<ProjectedUtterance | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const { toX, toY, scaleLen } = useMemo(
    () => buildScales(projection),
    [projection],
  )

  const showPoints = renderMode === 'point' || renderMode === 'both'
  const showRegions = renderMode === 'region' || renderMode === 'both'

  const isActive = (speaker: string) =>
    activeSpeakers.size === 0 || activeSpeakers.has(speaker)

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full touch-none select-none"
        role="img"
        aria-label="Map of participant positions and their utterances"
        onClick={() => onSelect(null)}
      >
        {/* Axes are a reference frame only: in an embedding projection the
            directions carry no independent meaning, so they stay unlabelled
            and very faint rather than inviting a reading. */}
        <line
          x1={PADDING / 2}
          y1={VIEW_H / 2}
          x2={VIEW_W - PADDING / 2}
          y2={VIEW_H / 2}
          stroke="var(--hairline)"
          strokeWidth={1}
        />
        <line
          x1={VIEW_W / 2}
          y1={PADDING / 2}
          x2={VIEW_W / 2}
          y2={VIEW_H - PADDING / 2}
          stroke="var(--hairline)"
          strokeWidth={1}
        />

        {/* Speaker regions sit beneath the points they summarise. */}
        {showRegions &&
          projection.speakers.map((s) => {
            if (!s.ellipse) return null
            const active = isActive(s.speaker)
            const rx = Math.max(10, scaleLen(s.ellipse.rx))
            const ry = Math.max(10, scaleLen(s.ellipse.ry))
            return (
              <ellipse
                key={`region-${s.speaker}`}
                cx={toX(s.ellipse.cx)}
                cy={toY(s.ellipse.cy)}
                rx={rx}
                ry={ry}
                transform={`rotate(${-s.ellipse.angle} ${toX(s.ellipse.cx)} ${toY(s.ellipse.cy)})`}
                fill={speakerColor(s.colorIndex)}
                fillOpacity={active ? 0.13 : 0.03}
                stroke={speakerColor(s.colorIndex)}
                strokeOpacity={active ? 0.35 : 0.08}
                strokeWidth={1}
                pointerEvents="none"
              />
            )
          })}

        {/* Utterances. */}
        {projection.utterances.map((u) => {
          const speaker = projection.speakers.find((s) => s.speaker === u.speaker)
          const active = isActive(u.speaker)
          const isSelected = selectedId === u.id
          const isHovered = hovered?.id === u.id
          return (
            <circle
              key={u.id}
              cx={toX(u.x)}
              cy={toY(u.y)}
              r={isSelected || isHovered ? 6 : 4}
              fill={speakerColor(speaker?.colorIndex ?? 0)}
              fillOpacity={active ? (isSelected ? 1 : 0.6) : DIMMED}
              stroke={isSelected ? 'var(--ink)' : 'transparent'}
              strokeWidth={1.5}
              className="cursor-pointer transition-[r] duration-100"
              onMouseEnter={() => setHovered(u)}
              onMouseLeave={() => setHovered(null)}
              onClick={(e) => {
                e.stopPropagation()
                onSelect(u)
              }}
            />
          )
        })}

        {/* Speaker centroids, drawn last so they stay legible. */}
        {showPoints &&
          projection.speakers.map((s) => {
            const active = isActive(s.speaker)
            const cx = toX(s.x)
            const cy = toY(s.y)
            const shape = speakerShape(s.colorIndex)
            const r = 7 + Math.min(5, Math.log2(Math.max(1, s.n)) * 1.6)

            return (
              <g
                key={`speaker-${s.speaker}`}
                transform={`translate(${cx} ${cy})`}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectSpeaker(s.speaker)
                }}
              >
                {/* A dashed outline marks a position inferred from too few
                    utterances to support a confident claim. */}
                <path
                  d={shapePath(shape, r)}
                  fill={s.underdetermined ? 'var(--bg)' : speakerColor(s.colorIndex)}
                  fillOpacity={active ? 1 : 0.2}
                  stroke={speakerColor(s.colorIndex)}
                  strokeOpacity={active ? 1 : 0.25}
                  strokeWidth={s.underdetermined ? 1.75 : 1.25}
                  strokeDasharray={s.underdetermined ? '3 2.5' : undefined}
                />
                <text
                  x={0}
                  y={-r - 7}
                  textAnchor="middle"
                  className="pointer-events-none text-[12px]"
                  fill="var(--ink)"
                  fillOpacity={active ? 0.92 : 0.22}
                >
                  {s.speaker}
                  {s.underdetermined && (
                    <tspan fill="var(--muted)"> · n={s.n}</tspan>
                  )}
                </text>
              </g>
            )
          })}
      </svg>

      {hovered && (
        <Tooltip
          utterance={hovered}
          x={toX(hovered.x)}
          y={toY(hovered.y)}
          viewW={VIEW_W}
        />
      )}
    </div>
  )
}

function Tooltip({
  utterance,
  x,
  y,
  viewW,
}: {
  utterance: ProjectedUtterance
  x: number
  y: number
  viewW: number
}) {
  // Flip toward the centre near the right edge so the card stays on screen.
  const flip = x > viewW * 0.62
  return (
    <div
      className="pointer-events-none absolute z-10 max-w-[320px] rounded-[8px] border border-[var(--hairline-strong)] bg-[var(--surface)] px-3 py-2 shadow-lg"
      style={{
        left: `${(x / viewW) * 100}%`,
        top: `${(y / VIEW_H) * 100}%`,
        transform: `translate(${flip ? 'calc(-100% - 14px)' : '14px'}, -50%)`,
      }}
    >
      <div className="mb-1 flex items-center gap-2 text-[11px] text-[var(--muted)]">
        <span className="font-medium text-[var(--ink)]">{utterance.speaker}</span>
        <span className="tnum">{utterance.kind}</span>
      </div>
      <p className="text-[13px] leading-[1.5] text-[var(--body)]">
        {utterance.text.length > 220
          ? `${utterance.text.slice(0, 220)}…`
          : utterance.text}
      </p>
    </div>
  )
}

/**
 * Maps projected coordinates into the viewBox.
 *
 * A single scale factor is used for both axes so that distances are not
 * distorted differently in x and y — stretching one axis to fill the frame
 * would make some pairs look closer than they are.
 */
function buildScales(projection: Projection) {
  const xs: number[] = []
  const ys: number[] = []
  for (const u of projection.utterances) {
    xs.push(u.x)
    ys.push(u.y)
  }
  for (const s of projection.speakers) {
    xs.push(s.x)
    ys.push(s.y)
    if (s.ellipse) {
      xs.push(s.ellipse.cx - s.ellipse.rx, s.ellipse.cx + s.ellipse.rx)
      ys.push(s.ellipse.cy - s.ellipse.ry, s.ellipse.cy + s.ellipse.ry)
    }
  }

  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  const spanX = maxX - minX || 1
  const spanY = maxY - minY || 1
  const usableW = VIEW_W - PADDING * 2
  const usableH = VIEW_H - PADDING * 2

  const scale = Math.min(usableW / spanX, usableH / spanY)

  // Centre the content in whichever direction has slack.
  const offsetX = (usableW - spanX * scale) / 2
  const offsetY = (usableH - spanY * scale) / 2

  return {
    toX: (v: number) => PADDING + offsetX + (v - minX) * scale,
    // SVG y grows downward; invert so the map reads like a chart.
    toY: (v: number) => VIEW_H - PADDING - offsetY - (v - minY) * scale,
    scaleLen: (v: number) => v * scale,
  }
}
