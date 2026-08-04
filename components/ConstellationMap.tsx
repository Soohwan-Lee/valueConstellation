'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { select } from 'd3-selection'
import { zoom, zoomIdentity, type D3ZoomEvent } from 'd3-zoom'
import type {
  Projection,
  ProjectedUtterance,
  SpeakerRenderMode,
} from '@/lib/types'
import type { SpeakerPair } from '@/lib/pairs'
import { shapePath, speakerColor, speakerShape } from '@/lib/colors'
import { kindLabel, type Lang } from '@/lib/i18n'

interface Props {
  projection: Projection
  renderMode: SpeakerRenderMode
  /** Speakers switched off in the rail. Dimmed here, never removed. */
  hiddenSpeakers: Set<string>
  selectedId: string | null
  selectedSpeaker: string | null
  /** Gaps to draw as measure lines. Empty when nothing is selected. */
  measure: SpeakerPair[]
  /** Pair to emphasise while its row is hovered in the rail. */
  emphasised: SpeakerPair | null
  onSelect: (utterance: ProjectedUtterance | null) => void
  onSelectSpeaker: (speaker: string) => void
  lang: Lang
  /**
   * Changes when a different analysis is loaded, which restarts the settle
   * animation. Deliberately not tied to the projection method: switching PCA
   * to MDS animates position instead, so the same points visibly move rather
   * than being replaced by a new set.
   */
  settleKey: string
}

const PADDING = 64
const VIEW_W = 900
const VIEW_H = 620

/** Opacity for utterances belonging to a filtered-out speaker. */
const DIMMED = 0.1

/** Total window over which marks settle in, in ms. */
const SETTLE_WINDOW = 420

const MOVE =
  'motion-safe:[transition:cx_560ms_cubic-bezier(0.32,0.72,0,1),cy_560ms_cubic-bezier(0.32,0.72,0,1)]'

export function ConstellationMap({
  projection,
  renderMode,
  hiddenSpeakers,
  selectedId,
  selectedSpeaker,
  measure,
  emphasised,
  onSelect,
  onSelectSpeaker,
  lang,
  settleKey,
}: Props) {
  const [hovered, setHovered] = useState<ProjectedUtterance | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [transform, setTransform] = useState({ k: 1, x: 0, y: 0 })

  const { toX, toY, scaleLen } = useMemo(
    () => buildScales(projection),
    [projection],
  )

  // Zoom and pan. Marks are counter-scaled below so that magnifying the layout
  // separates crowded points without inflating the points themselves.
  const behaviorRef = useRef<ReturnType<typeof zoom<SVGSVGElement, unknown>>>(null)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const behavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 8])
      .translateExtent([
        [0, 0],
        [VIEW_W, VIEW_H],
      ])
      .on('zoom', (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
        const { k, x, y } = event.transform
        setTransform({ k, x, y })
      })
    behaviorRef.current = behavior
    const selection = select(svg)
    selection.call(behavior)
    // Suppress the double-click-to-zoom default: double-clicking a point should
    // belong to selection, not navigation.
    selection.on('dblclick.zoom', null)
    return () => {
      selection.on('.zoom', null)
    }
  }, [])

  const resetZoom = () => {
    const svg = svgRef.current
    const behavior = behaviorRef.current
    if (!svg || !behavior) return
    // Reset through the behaviour so its internal transform stays in sync with
    // ours; setting state alone would leave the next gesture resuming from the
    // old zoom level.
    select(svg).call(behavior.transform, zoomIdentity)
  }

  /** Counter-scale so strokes and radii stay constant while zooming. */
  const inv = 1 / transform.k

  const showPoints = renderMode === 'point' || renderMode === 'both'
  const showRegions = renderMode === 'region' || renderMode === 'both'

  const isActive = (speaker: string) => !hiddenSpeakers.has(speaker)

  const stagger = projection.utterances.length
    ? SETTLE_WINDOW / projection.utterances.length
    : 0

  const lines = emphasised ? [emphasised] : measure

  return (
    <div className="relative h-full w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full touch-none select-none"
        role="img"
        aria-label="Map of participant positions and their utterances"
        onClick={() => onSelect(null)}
      >
        <defs>
          {/* A uniform field, not a coordinate grid: it carries no units and
              labels nothing. Its job is to make panning and zooming legible —
              without a static texture, dragging a cloud of dots across an empty
              rectangle gives the eye nothing to register the movement against. */}
          <pattern
            id="plate-field"
            width={30}
            height={30}
            patternUnits="userSpaceOnUse"
          >
            <circle cx={1} cy={1} r={0.85} fill="var(--line)" />
          </pattern>
        </defs>

        <g
          transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}
        >
          <rect
            x={-VIEW_W}
            y={-VIEW_H}
            width={VIEW_W * 3}
            height={VIEW_H * 3}
            fill="url(#plate-field)"
            opacity={0.55}
            pointerEvents="none"
          />

          <g key={settleKey}>
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
                    fillOpacity={active ? 0.1 : 0.025}
                    stroke={speakerColor(s.colorIndex)}
                    strokeOpacity={active ? 0.34 : 0.07}
                    strokeWidth={inv}
                    strokeDasharray={`${4 * inv} ${3 * inv}`}
                    pointerEvents="none"
                    className="motion-safe:[transition:cx_560ms_cubic-bezier(0.32,0.72,0,1),cy_560ms_cubic-bezier(0.32,0.72,0,1),rx_560ms_cubic-bezier(0.32,0.72,0,1),ry_560ms_cubic-bezier(0.32,0.72,0,1)]"
                  />
                )
              })}

            {/* Utterances. */}
            {projection.utterances.map((u, i) => {
              const speaker = projection.speakers.find(
                (s) => s.speaker === u.speaker,
              )
              const active = isActive(u.speaker)
              const isSelected = selectedId === u.id
              const isHovered = hovered?.id === u.id
              return (
                <circle
                  key={u.id}
                  cx={toX(u.x)}
                  cy={toY(u.y)}
                  r={(isSelected || isHovered ? 5.5 : 3.4) * inv}
                  fill={speakerColor(speaker?.colorIndex ?? 0)}
                  fillOpacity={active ? (isSelected ? 1 : 0.62) : DIMMED}
                  stroke={isSelected ? 'var(--ink)' : 'var(--plate)'}
                  strokeWidth={(isSelected ? 1.5 : 0.9) * inv}
                  strokeOpacity={active ? 1 : 0}
                  className={`cursor-pointer motion-safe:animate-[settle_360ms_cubic-bezier(0.32,0.72,0,1)_both] ${MOVE}`}
                  style={{
                    animationDelay: `${i * stagger}ms`,
                    transformBox: 'fill-box',
                    transformOrigin: 'center',
                  }}
                  onMouseEnter={() => setHovered(u)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelect(u)
                  }}
                />
              )
            })}

            {/* Measure lines: the gap between two people, stated. Drawn above
                the utterances so the line reads as an instrument laid over the
                data rather than as another data mark. */}
            {lines.map((p) => (
              <MeasureLine
                key={`${p.a.speaker}-${p.b.speaker}`}
                pair={p}
                x1={toX(p.a.x)}
                y1={toY(p.a.y)}
                x2={toX(p.b.x)}
                y2={toY(p.b.y)}
                inv={inv}
              />
            ))}

            {/* Speaker centroids, drawn last so they stay legible. */}
            {showPoints &&
              projection.speakers.map((s) => {
                const active = isActive(s.speaker)
                const cx = toX(s.x)
                const cy = toY(s.y)
                const shape = speakerShape(s.colorIndex)
                const r = 7 + Math.min(5, Math.log2(Math.max(1, s.n)) * 1.6)
                const isPicked = selectedSpeaker === s.speaker

                return (
                  <g
                    key={`speaker-${s.speaker}`}
                    transform={`translate(${cx} ${cy}) scale(${inv})`}
                    className="cursor-pointer motion-safe:[transition:transform_560ms_cubic-bezier(0.32,0.72,0,1)]"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectSpeaker(s.speaker)
                    }}
                  >
                    {isPicked && (
                      <circle
                        r={r + 7}
                        fill="none"
                        stroke="var(--ink)"
                        strokeOpacity={0.5}
                        strokeWidth={1}
                        strokeDasharray="2 3"
                      />
                    )}
                    {/* A dashed outline marks a position inferred from too few
                        utterances to support a confident claim. */}
                    <path
                      d={shapePath(shape, r)}
                      fill={
                        s.underdetermined
                          ? 'var(--plate)'
                          : speakerColor(s.colorIndex)
                      }
                      fillOpacity={active ? 1 : 0.2}
                      stroke={speakerColor(s.colorIndex)}
                      strokeOpacity={active ? 1 : 0.25}
                      strokeWidth={s.underdetermined ? 1.75 : 1.25}
                      strokeDasharray={s.underdetermined ? '3 2.5' : undefined}
                    />
                    {/* Stroke-behind-fill keeps the name readable wherever it
                        lands: over an ellipse, over another speaker's points,
                        or over the field. */}
                    <text
                      x={0}
                      y={-r - 9}
                      textAnchor="middle"
                      className="pointer-events-none text-[12.5px] font-medium"
                      fill="var(--ink)"
                      fillOpacity={active ? 1 : 0.24}
                      stroke="var(--plate)"
                      strokeWidth={3.5}
                      strokeLinejoin="round"
                      style={{ paintOrder: 'stroke' }}
                    >
                      {s.speaker}
                      {s.underdetermined && (
                        <tspan
                          fill="var(--muted)"
                          className="readout text-[11px]"
                        >
                          {' '}
                          n={s.n}
                        </tspan>
                      )}
                    </text>
                  </g>
                )
              })}
          </g>
        </g>
      </svg>

      {transform.k > 1.01 && (
        <button
          type="button"
          onClick={resetZoom}
          className="readout absolute bottom-3 right-3 rounded-[5px] border border-[var(--line)] bg-[var(--panel)]/90 px-2 py-1 text-[11px] text-[var(--body)] backdrop-blur-sm transition-colors hover:border-[var(--line-strong)] hover:text-[var(--ink)]"
        >
          {transform.k.toFixed(1)}× · reset
        </button>
      )}

      {hovered && (
        <Tooltip
          utterance={hovered}
          // The tooltip lives outside the zoom group, so place it using the
          // zoomed screen position rather than the raw layout coordinate.
          x={toX(hovered.x) * transform.k + transform.x}
          y={toY(hovered.y) * transform.k + transform.y}
          preferEnglish={lang === 'en'}
          lang={lang}
        />
      )}
    </div>
  )
}

/**
 * One measured gap.
 *
 * The number is a share of the widest gap on the same map, never a raw
 * projected distance: projected units mean nothing across maps, and printing
 * one would invite exactly the cross-transcript comparison the method cannot
 * support.
 */
function MeasureLine({
  pair,
  x1,
  y1,
  x2,
  y2,
  inv,
}: {
  pair: SpeakerPair
  x1: number
  y1: number
  x2: number
  y2: number
  inv: number
}) {
  const length = Math.hypot(x2 - x1, y2 - y1)
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2

  return (
    <g pointerEvents="none">
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="var(--ink)"
        strokeOpacity={0.3}
        strokeWidth={inv}
        strokeDasharray={`${length} ${length}`}
        className="motion-safe:animate-[draw_420ms_cubic-bezier(0.32,0.72,0,1)_both]"
        style={{ ['--draw-length' as string]: length }}
      />
      <text
        x={mx}
        y={my - 4 * inv}
        textAnchor="middle"
        className="readout text-[11px]"
        fill="var(--body)"
        stroke="var(--plate)"
        strokeWidth={3.5 * inv}
        strokeLinejoin="round"
        style={{ paintOrder: 'stroke', fontSize: `${11 * inv}px` }}
      >
        {pair.relative.toFixed(2)}
      </text>
    </g>
  )
}

function Tooltip({
  utterance,
  x,
  y,
  preferEnglish,
  lang,
}: {
  utterance: ProjectedUtterance
  x: number
  y: number
  preferEnglish: boolean
  lang: Lang
}) {
  // Flip toward the centre near the right edge so the card stays on screen.
  const flip = x > VIEW_W * 0.62
  const body =
    preferEnglish && utterance.textEn ? utterance.textEn : utterance.text
  return (
    <div
      className="pointer-events-none absolute z-10 max-w-[320px] rounded-[8px] border border-[var(--line)] bg-[var(--panel)] px-3 py-2.5 shadow-[0_12px_28px_-12px_rgba(0,0,0,0.38)]"
      style={{
        left: `${(x / VIEW_W) * 100}%`,
        top: `${(y / VIEW_H) * 100}%`,
        transform: `translate(${flip ? 'calc(-100% - 14px)' : '14px'}, -50%)`,
      }}
    >
      <div className="mb-1.5 flex items-baseline gap-2">
        <span className="text-[12px] font-medium text-[var(--ink)]">
          {utterance.speaker}
        </span>
        <span className="eyebrow">{kindLabel(utterance.kind, lang)}</span>
      </div>
      <p className="text-[13px] leading-[1.55] text-[var(--body)]">
        {body.length > 220 ? `${body.slice(0, 220)}…` : body}
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

  // Math.min() of an empty list is Infinity, and a span of -Infinity is truthy,
  // so `|| 1` would not catch it — the result would be NaN geometry.
  const finite = (v: number, fallback: number) =>
    Number.isFinite(v) ? v : fallback

  const minX = finite(Math.min(...xs), 0)
  const maxX = finite(Math.max(...xs), 1)
  const minY = finite(Math.min(...ys), 0)
  const maxY = finite(Math.max(...ys), 1)

  const rawSpanX = maxX - minX
  const rawSpanY = maxY - minY
  const spanX = Number.isFinite(rawSpanX) && rawSpanX > 0 ? rawSpanX : 1
  const spanY = Number.isFinite(rawSpanY) && rawSpanY > 0 ? rawSpanY : 1
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
