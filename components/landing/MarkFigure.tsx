'use client'

import type { MarkEntry } from '@/lib/landing'

/**
 * The diagram beside each entry in the reading guide.
 *
 * Drawn at the same proportions and with the same devices as the map itself —
 * the dot field behind, a statement at the same relative size, the same dashed
 * outline for a provisional position — so that recognising the mark here is
 * recognising the mark there. A generic icon would have to be learned twice.
 *
 * One speaker colour is used throughout, because the guide is about mark types
 * and colour on the map means a person.
 */
export function MarkFigure({ figure }: { figure: MarkEntry['figure'] }) {
  return (
    <svg
      viewBox="0 0 160 108"
      className="h-full w-full"
      aria-hidden
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <pattern
          id={`guide-field-${figure}`}
          width={14}
          height={14}
          patternUnits="userSpaceOnUse"
        >
          <circle cx={1} cy={1} r={0.7} fill="var(--line)" />
        </pattern>
      </defs>
      <rect width={160} height={108} fill={`url(#guide-field-${figure})`} opacity={0.7} />
      {FIGURES[figure]}
    </svg>
  )
}

const ACCENT = 'var(--s1)'
const SECOND = 'var(--s2)'

/** A wandering outline, the shape the region estimator actually produces. */
const REGION_PATH =
  'M44 40C52 26 76 22 90 30C104 38 108 34 118 42C128 50 126 66 116 74C106 82 92 76 80 80C68 84 52 82 46 72C40 62 36 54 44 40Z'

const SPLIT_LEFT = 'M30 46C36 34 54 32 62 40C70 48 66 66 56 72C46 78 32 70 30 60Z'
const SPLIT_RIGHT = 'M104 40C114 32 132 38 134 50C136 62 126 74 114 72C102 70 96 60 98 52Z'

const FIGURES: Record<MarkEntry['figure'], React.ReactNode> = {
  /**
   * Three people around a hollow ring.
   *
   * The ring is in ink while the statements are in a speaker colour, which is
   * the whole distinction the figure exists to teach: what the room landed on
   * is not one more participant.
   */
  landed: (
    <g>
      {[
        [40, 40],
        [122, 38],
        [78, 88],
      ].map(([cx, cy], i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={7}
          fill={i === 1 ? SECOND : ACCENT}
          fillOpacity={0.85}
        />
      ))}
      {[
        [40, 40],
        [122, 38],
        [78, 88],
      ].map(([cx, cy], i) => (
        <line
          key={`l${i}`}
          x1={cx}
          y1={cy}
          x2={80}
          y2={54}
          stroke="var(--line-strong)"
          strokeWidth={1}
          strokeDasharray="2 3"
        />
      ))}
      <circle
        cx={80}
        cy={54}
        r={10}
        fill="var(--plate)"
        stroke="var(--ink)"
        strokeWidth={1.5}
      />
      <circle cx={80} cy={54} r={3.2} fill="var(--ink)" />
    </g>
  ),

  dot: (
    <g>
      {[
        [46, 40],
        [70, 62],
        [104, 34],
        [120, 70],
        [88, 84],
      ].map(([cx, cy], i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={4}
          fill={ACCENT}
          fillOpacity={i === 1 ? 1 : 0.45}
          stroke="var(--plate)"
          strokeWidth={1}
        />
      ))}
      <circle
        cx={70}
        cy={62}
        r={11}
        fill="none"
        stroke="var(--ink)"
        strokeOpacity={0.45}
        strokeWidth={1}
      />
    </g>
  ),

  marker: (
    <g>
      {[
        [48, 44],
        [96, 34],
        [110, 68],
        [66, 78],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={3.4} fill={ACCENT} fillOpacity={0.45} />
      ))}
      <circle
        cx={80}
        cy={56}
        r={9}
        fill={ACCENT}
        stroke="var(--plate)"
        strokeWidth={1.2}
      />
      <text
        x={80}
        y={38}
        textAnchor="middle"
        className="text-[12px] font-medium"
        fill="var(--ink)"
        stroke="var(--plate)"
        strokeWidth={3}
        strokeLinejoin="round"
        style={{ paintOrder: 'stroke' }}
      >
        A
      </text>
    </g>
  ),

  region: (
    <g>
      <path
        d={SPLIT_LEFT}
        fill={ACCENT}
        fillOpacity={0.12}
        stroke={ACCENT}
        strokeOpacity={0.4}
        strokeWidth={1.2}
      />
      <path
        d={SPLIT_RIGHT}
        fill={ACCENT}
        fillOpacity={0.12}
        stroke={ACCENT}
        strokeOpacity={0.4}
        strokeWidth={1.2}
      />
      {[
        [40, 50],
        [52, 44],
        [48, 62],
        [112, 48],
        [122, 56],
        [110, 62],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={3.2} fill={ACCENT} fillOpacity={0.75} />
      ))}
      <path
        d="M74 30 L74 78"
        stroke="var(--line-strong)"
        strokeWidth={1}
        strokeDasharray="3 4"
      />
      <text
        x={82}
        y={92}
        className="readout text-[9px]"
        fill="var(--muted)"
        letterSpacing="0.06em"
      >
        empty
      </text>
    </g>
  ),

  measure: (
    <g>
      <path
        d={REGION_PATH}
        fill={ACCENT}
        fillOpacity={0.07}
        stroke={ACCENT}
        strokeOpacity={0.22}
        strokeWidth={1}
      />
      <line
        x1={54}
        y1={64}
        x2={116}
        y2={38}
        stroke="var(--ink)"
        strokeOpacity={0.45}
        strokeWidth={1}
      />
      <circle cx={54} cy={64} r={8} fill={ACCENT} stroke="var(--plate)" strokeWidth={1.2} />
      <circle cx={116} cy={38} r={7} fill={SECOND} stroke="var(--plate)" strokeWidth={1.2} />
      <text
        x={85}
        y={46}
        textAnchor="middle"
        className="readout text-[10px]"
        fill="var(--body)"
        stroke="var(--plate)"
        strokeWidth={3}
        strokeLinejoin="round"
        style={{ paintOrder: 'stroke' }}
      >
        0.62
      </text>
    </g>
  ),

  axes: (
    <g>
      <line x1={16} y1={54} x2={144} y2={54} stroke="var(--line-strong)" strokeWidth={1} strokeDasharray="2 5" />
      <line x1={80} y1={16} x2={80} y2={92} stroke="var(--line-strong)" strokeWidth={1} strokeDasharray="2 5" />
      {[
        [48, 38],
        [62, 66],
        [104, 44],
        [118, 70],
        [92, 30],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={3} fill={ACCENT} fillOpacity={0.5} />
      ))}
      <text x={14} y={50} className="text-[8px]" fill="var(--muted)">
        cost
      </text>
      <text x={146} y={50} textAnchor="end" className="text-[8px]" fill="var(--muted)">
        process
      </text>
      <text x={80} y={14} textAnchor="middle" className="text-[8px]" fill="var(--muted)">
        who pays
      </text>
      <text x={80} y={102} textAnchor="middle" className="text-[8px]" fill="var(--muted)">
        timing
      </text>
    </g>
  ),

  provisional: (
    <g>
      <circle cx={54} cy={58} r={9} fill={ACCENT} stroke="var(--plate)" strokeWidth={1.2} />
      <text
        x={54}
        y={40}
        textAnchor="middle"
        className="readout text-[9px]"
        fill="var(--muted)"
      >
        n=12
      </text>
      <circle
        cx={112}
        cy={54}
        r={7}
        fill="var(--plate)"
        stroke={SECOND}
        strokeWidth={1.8}
        strokeDasharray="3 2.5"
      />
      <text
        x={112}
        y={38}
        textAnchor="middle"
        className="readout text-[9px]"
        fill="var(--muted)"
      >
        n=2
      </text>
      {[
        [46, 70],
        [62, 48],
        [50, 46],
        [60, 68],
        [106, 66],
        [118, 44],
      ].map(([cx, cy], i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={2.8}
          fill={i < 4 ? ACCENT : SECOND}
          fillOpacity={0.55}
        />
      ))}
    </g>
  ),
}
