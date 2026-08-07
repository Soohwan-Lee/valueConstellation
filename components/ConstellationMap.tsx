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
import {
  mapResolution,
  regionPath,
  regionRings,
  ringsArea,
  type Point,
} from '@/lib/blob'
import { buildScales, PADDING, VIEW_H, VIEW_W } from '@/lib/frame'
import type { AxisPole } from '@/lib/axes'
import { shapePath, speakerColor, speakerShape } from '@/lib/colors'
import { kindLabel, t, type Lang } from '@/lib/i18n'
import { speakerLabel, type SpeakerNames } from '@/lib/speakers'

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
  /** Opens the sentence behind the landing point. Absent when there is none. */
  onSelectConsensus?: () => void
  lang: Lang
  /** English renderings of the speaker names, for the language toggle. */
  speakerNames: SpeakerNames | null
  /**
   * `full` adds zoom and pan. `select` leaves them off, for a map embedded in a
   * scrolling page: d3-zoom binds wheel and touch, so a map that zooms would
   * swallow the gesture the reader is using to get past it.
   */
  interaction?: 'full' | 'select'
  /**
   * Changes when a different analysis is loaded, which restarts the settle
   * animation. Deliberately not tied to the projection method: switching PCA
   * to MDS animates position instead, so the same points visibly move rather
   * than being replaced by a new set.
   */
  settleKey: string
}

/** Opacity for utterances belonging to a filtered-out speaker. */
const DIMMED = 0.1

/** Total window over which marks settle in, in ms. */
const SETTLE_WINDOW = 420

/** Duration of a layout change, shared by points and regions. */
const MOVE_MS = 560

/**
 * Radius a statement claims when the map has too few statements to measure a
 * resolution from, in viewBox units. Large enough to see, small enough not to
 * imply anybody covered ground.
 */
const REGION_FLOOR = 30

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
  onSelectConsensus,
  lang,
  speakerNames,
  settleKey,
  interaction = 'full',
}: Props) {
  const [hovered, setHovered] = useState<ProjectedUtterance | null>(null)
  const [hoveredSpeaker, setHoveredSpeaker] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [transform, setTransform] = useState({ k: 1, x: 0, y: 0 })

  const { toX, toY } = useMemo(() => buildScales(projection), [projection])

  /**
   * Speaker regions, in screen units.
   *
   * Built here rather than server-side because they describe a particular
   * layout: the same speaker occupies a different shape under PCA than under
   * MDS, and the region has to follow the points the reader is looking at.
   *
   * The resolution is measured once over every statement and shared by all of
   * them, so two regions are drawn at the same scale and can be compared.
   */
  const regions = useMemo(() => {
    const bySpeaker: Point[][] = projection.speakers.map((s) =>
      projection.utterances
        .filter((u) => u.speaker === s.speaker)
        .map((u) => [toX(u.x), toY(u.y)]),
    )
    const { reach } = mapResolution(bySpeaker, REGION_FLOOR)

    const byArea = projection.speakers.map((s) => {
      const points: Point[] = projection.utterances
        .filter((u) => u.speaker === s.speaker)
        .map((u) => [toX(u.x), toY(u.y)])
      const rings = regionRings(points, reach)
      return { speaker: s, d: regionPath(rings), area: ringsArea(rings) }
    })
    return byArea.sort((a, b) => b.area - a.area)
  }, [projection, toX, toY])

  // Zoom and pan. Marks are counter-scaled below so that magnifying the layout
  // separates crowded points without inflating the points themselves.
  const behaviorRef = useRef<ReturnType<typeof zoom<SVGSVGElement, unknown>>>(null)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg || interaction !== 'full') return
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
  }, [interaction])

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

  const axes = projection.meta.axes

  return (
    <div className="relative h-full w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid meet"
        // `touch-none` is what lets a finger pan the map instead of scrolling
        // the page, and is exactly wrong when the map is embedded in a page
        // somebody is scrolling through.
        className={`h-full w-full select-none ${
          interaction === 'full' ? 'touch-none' : ''
        }`}
        role="img"
        // A scatter cannot be read by a screen reader whatever is done to it,
        // so the label states what is on it and the rail carries the same
        // information as focusable controls.
        aria-label={`${projection.utterances.length} statements from ${projection.speakers.length} participants: ${projection.speakers
          .map((s) => `${speakerLabel(s.speaker, lang, speakerNames)} (${s.n})`)
          .join(', ')}`}
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

          {/* The axes, drawn only when they have names.
              PCA puts them along the two directions the statements differ on
              most, so they are worth seeing. MDS orientation is arbitrary, and
              a cross drawn on it would invite a reading that does not exist. */}
          {axes && (
            <g pointerEvents="none">
              <line
                x1={PADDING * 0.6}
                y1={VIEW_H / 2}
                x2={VIEW_W - PADDING * 0.6}
                y2={VIEW_H / 2}
                stroke="var(--line-strong)"
                strokeWidth={inv}
                strokeDasharray={`${2 * inv} ${5 * inv}`}
              />
              <line
                x1={VIEW_W / 2}
                y1={PADDING * 0.6}
                x2={VIEW_W / 2}
                y2={VIEW_H - PADDING * 0.6}
                stroke="var(--line-strong)"
                strokeWidth={inv}
                strokeDasharray={`${2 * inv} ${5 * inv}`}
              />
            </g>
          )}

          <g key={settleKey}>
            {/* Speaker regions sit beneath the points they summarise, largest
                first so a tight region is never buried under a wide one. */}
            {showRegions && (
              <RegionLayer signature={`${settleKey}-${renderMode}`}>
                {regions.map(({ speaker, d }) =>
                  d ? (
                    <path
                      key={`region-${speaker.speaker}`}
                      d={d}
                      // A ring inside a ring is a hole: statements arranged
                      // around empty ground, which the region should show as
                      // empty rather than fill in.
                      fillRule="evenodd"
                      fill={speakerColor(speaker.colorIndex)}
                      fillOpacity={isActive(speaker.speaker) ? 0.1 : 0.025}
                      stroke={speakerColor(speaker.colorIndex)}
                      strokeOpacity={isActive(speaker.speaker) ? 0.34 : 0.07}
                      strokeWidth={inv}
                      strokeLinejoin="round"
                      pointerEvents="none"
                    />
                  ) : null,
                )}
              </RegionLayer>
            )}

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

            {/* The middle of the room, and what it landed on.
                Both in ink, both hollow: colour on this map is a participant,
                and neither of these is one. The consensus is a sentence nobody
                said — placed here because it was embedded like a statement, not
                because it looked right — so it is drawn as a mark that could
                not be mistaken for somebody's position. */}
            {projection.groupCentre && (
              <Landmark
                x={toX(projection.groupCentre[0])}
                y={toY(projection.groupCentre[1])}
                inv={inv}
                label={t('legendGroup', lang)}
                kind="group"
              />
            )}
            {projection.consensus && (
              <Landmark
                x={toX(projection.consensus[0])}
                y={toY(projection.consensus[1])}
                inv={inv}
                label={t('legendConsensus', lang)}
                kind="consensus"
                onClick={onSelectConsensus}
              />
            )}

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
                const isHot = hoveredSpeaker === s.speaker

                return (
                  <g
                    key={`speaker-${s.speaker}`}
                    transform={`translate(${cx} ${cy}) scale(${inv})`}
                    className="cursor-pointer motion-safe:[transition:transform_560ms_cubic-bezier(0.32,0.72,0,1)]"
                    onMouseEnter={() => setHoveredSpeaker(s.speaker)}
                    onMouseLeave={() => setHoveredSpeaker(null)}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectSpeaker(s.speaker)
                    }}
                  >
                    {/* A marker is the only thing on the map that measures
                        anything when clicked, and nothing else says so. The
                        ring on hover is the signpost. */}
                    {(isPicked || isHot) && (
                      <circle
                        r={r + 7}
                        fill="none"
                        stroke="var(--ink)"
                        strokeOpacity={isPicked ? 0.5 : 0.24}
                        strokeWidth={1}
                        strokeDasharray={isPicked ? '2 3' : undefined}
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
                      {speakerLabel(s.speaker, lang, speakerNames)}
                      {s.underdetermined && (
                        <tspan
                          fill="var(--muted)"
                          className="readout text-[12px]"
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

      {/* Axis names sit outside the zoom group, pinned to the frame edges: they
          label the whole direction, not a place in it, so they must not slide
          away when the map is panned. */}
      {axes && (
        <div className="pointer-events-none absolute inset-0">
          <AxisName className="left-3 top-1/2 -translate-y-1/2 text-left" pole={axes.horizontal.low} arrow="←" lang={lang} />
          <AxisName className="right-3 top-1/2 -translate-y-1/2 text-right" pole={axes.horizontal.high} arrow="→" lang={lang} />
          <AxisName className="left-1/2 top-2 -translate-x-1/2 text-center" pole={axes.vertical.high} arrow="↑" lang={lang} />
          <AxisName className="bottom-2 left-1/2 -translate-x-1/2 text-center" pole={axes.vertical.low} arrow="↓" lang={lang} />
        </div>
      )}

      {transform.k > 1.01 && (
        <button
          type="button"
          onClick={resetZoom}
          className="readout absolute bottom-3 right-3 rounded-[5px] border border-[var(--line)] bg-[var(--panel)]/90 px-2 py-1 text-[12px] text-[var(--body)] backdrop-blur-sm transition-colors hover:border-[var(--line-strong)] hover:text-[var(--ink)]"
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
          speakerNames={speakerNames}
        />
      )}
    </div>
  )
}

/**
 * One end of one axis.
 *
 * Set quietly. These are a reading aid produced by a model looking at the
 * statements at that end, not a measurement, and type loud enough to compete
 * with the marks would give them an authority they have not earned.
 */
function AxisName({
  pole,
  arrow,
  lang,
  className,
}: {
  pole: AxisPole
  /** Points along the axis toward this end. */
  arrow: '←' | '→' | '↑' | '↓'
  lang: Lang
  className: string
}) {
  // Four phrases floating at the edges of a plate read as captions until
  // something says they describe a direction. The arrow is that something, and
  // it points the way the map opens out rather than at the label.
  const mark = (
    <span aria-hidden className="readout text-[var(--faint)]">
      {arrow}
    </span>
  )
  const vertical = arrow === '↑' || arrow === '↓'
  return (
    <span
      className={`absolute max-w-[34%] text-[12px] font-medium leading-[1.4] tracking-[0.06em] text-[var(--muted)] ${className}`}
    >
      {arrow === '↑' && <span className="block leading-none">{mark}</span>}
      {arrow === '←' && <>{mark} </>}
      <span className={vertical ? 'block' : undefined}>{pole[lang]}</span>
      {arrow === '→' && <> {mark}</>}
      {arrow === '↓' && <span className="block leading-none">{mark}</span>}
    </span>
  )
}

/**
 * The region layer.
 *
 * Regions do not travel between layouts. Their outline is a contour of a field
 * rebuilt from scratch each time, so it has no vertices in common with the last
 * one and there is nothing to interpolate — and animating between two unrelated
 * shapes would read as the region morphing into something else rather than as
 * the same statements being rearranged.
 *
 * So it stands aside instead. The layer clears while the points travel and
 * returns once they have arrived, which also leaves the movement itself
 * unobstructed.
 */
function RegionLayer({
  signature,
  children,
}: {
  signature: string
  children: React.ReactNode
}) {
  const [settled, setSettled] = useState(true)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const reduced =
      typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    setSettled(false)
    const timer = setTimeout(() => setSettled(true), MOVE_MS)
    return () => clearTimeout(timer)
  }, [signature])

  return (
    <g
      style={{
        opacity: settled ? 1 : 0,
        transition: `opacity ${settled ? 260 : 140}ms ease`,
      }}
    >
      {children}
    </g>
  )
}

/**
 * A point on the map that is not a person.
 *
 * Drawn in ink and hollow, at a size below every speaker marker. Both of these
 * are true of the room rather than of anybody in it, and the one rule this
 * interface will not bend is that saturated colour means a participant — a
 * filled coloured mark for "the consensus" would read as a ninth person who
 * agreed with everybody.
 */
function Landmark({
  x,
  y,
  inv,
  label,
  kind,
  onClick,
}: {
  x: number
  y: number
  inv: number
  label: string
  kind: 'group' | 'consensus'
  onClick?: () => void
}) {
  const consensus = kind === 'consensus'
  return (
    <g
      transform={`translate(${x} ${y}) scale(${inv})`}
      className={`motion-safe:[transition:transform_560ms_cubic-bezier(0.32,0.72,0,1)] ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={
        onClick
          ? (e) => {
              e.stopPropagation()
              onClick()
            }
          : undefined
      }
    >
      {consensus ? (
        <>
          <circle r={9} fill="var(--plate)" stroke="var(--ink)" strokeWidth={1.4} />
          <circle r={3} fill="var(--ink)" />
        </>
      ) : (
        <>
          <line x1={-6} y1={0} x2={6} y2={0} stroke="var(--muted)" strokeWidth={1.1} />
          <line x1={0} y1={-6} x2={0} y2={6} stroke="var(--muted)" strokeWidth={1.1} />
        </>
      )}
      <text
        x={0}
        y={consensus ? -15 : -11}
        textAnchor="middle"
        className="pointer-events-none text-[12px]"
        fill={consensus ? 'var(--ink)' : 'var(--muted)'}
        stroke="var(--plate)"
        strokeWidth={3.5}
        strokeLinejoin="round"
        style={{ paintOrder: 'stroke' }}
      >
        {label}
      </text>
    </g>
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
        className="readout text-[12px]"
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
  speakerNames,
}: {
  utterance: ProjectedUtterance
  x: number
  y: number
  preferEnglish: boolean
  lang: Lang
  speakerNames: SpeakerNames | null
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
          {speakerLabel(utterance.speaker, lang, speakerNames)}
        </span>
        <span className="eyebrow">{kindLabel(utterance.kind, lang)}</span>
      </div>
      <p className="text-[13px] leading-[1.55] text-[var(--body)]">
        {body.length > 220 ? `${body.slice(0, 220)}…` : body}
      </p>
    </div>
  )
}
