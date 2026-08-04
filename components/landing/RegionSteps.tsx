'use client'

import { useMemo } from 'react'
import { mapResolution, regionPath, regionRings, type Point } from '@/lib/blob'

/**
 * The region rule, drawn in three steps.
 *
 * Every panel is computed by the code that draws the real thing — the same
 * `mapResolution` and `regionRings` the map calls — so this is a demonstration
 * rather than an illustration of one. If the rule changes, the figure changes
 * with it or the build stops making sense, which is the point.
 *
 * The points are arranged to show both halves of the promise at once: four that
 * sit closer together than the typical gap and merge, and two off on their own
 * that stay separate. A reader can measure that against the middle panel by eye.
 */
const POINTS: Point[] = [
  [60, 100],
  [94, 78],
  [88, 120],
  [122, 102],
  [214, 54],
  [222, 152],
]

const W = 280
const H = 200

export function RegionSteps({
  captions,
}: {
  /** Three captions, in reading order. */
  captions: [string, string, string]
}) {
  const { reach, d } = useMemo(() => {
    const { reach } = mapResolution(POINTS, 10)
    return { reach, d: regionPath(regionRings(POINTS, reach)) }
  }, [])

  return (
    <ol className="grid gap-px overflow-hidden rounded-[12px] border border-[var(--line)] bg-[var(--line)] sm:grid-cols-3">
      {captions.map((caption, step) => (
        <li key={caption} className="bg-[var(--panel)] p-4">
          <div className="overflow-hidden rounded-[8px] border border-[var(--line)] bg-[var(--plate)]">
            <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" aria-hidden>
              {/* Step 2 shows what each statement claims; step 3 shows the
                  outline of the union, with the reach circles kept faintly
                  visible so the join is checkable rather than asserted. */}
              {step >= 1 &&
                POINTS.map(([x, y], i) => (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r={reach}
                    fill="var(--s1)"
                    fillOpacity={step === 1 ? 0.1 : 0.05}
                    stroke="var(--s1)"
                    strokeOpacity={step === 1 ? 0.35 : 0.16}
                    strokeWidth={1}
                    strokeDasharray={step === 1 ? undefined : '3 3'}
                  />
                ))}

              {step === 2 && d && (
                <path
                  d={d}
                  fillRule="evenodd"
                  fill="var(--s1)"
                  fillOpacity={0.12}
                  stroke="var(--s1)"
                  strokeOpacity={0.55}
                  strokeWidth={1.4}
                  strokeLinejoin="round"
                />
              )}

              {POINTS.map(([x, y], i) => (
                <circle
                  key={`p${i}`}
                  cx={x}
                  cy={y}
                  r={3.4}
                  fill="var(--s1)"
                  stroke="var(--plate)"
                  strokeWidth={1}
                />
              ))}

              {/* The measured quantity itself, shown as a ruler between the two
                  statements that set it, so the number in the prose has
                  something on the page to point at. */}
              {step === 0 && (
                <g>
                  <line
                    x1={POINTS[1][0]}
                    y1={POINTS[1][1]}
                    x2={POINTS[3][0]}
                    y2={POINTS[3][1]}
                    stroke="var(--ink)"
                    strokeOpacity={0.4}
                    strokeWidth={1}
                  />
                  <text
                    x={(POINTS[1][0] + POINTS[3][0]) / 2}
                    y={(POINTS[1][1] + POINTS[3][1]) / 2 - 6}
                    textAnchor="middle"
                    className="readout text-[10px]"
                    fill="var(--body)"
                    stroke="var(--plate)"
                    strokeWidth={3}
                    strokeLinejoin="round"
                    style={{ paintOrder: 'stroke' }}
                  >
                    ?
                  </text>
                </g>
              )}
            </svg>
          </div>
          <p className="mt-3 flex gap-2 text-[12.5px] leading-[1.65] text-[var(--muted)]">
            <span className="readout shrink-0 text-[var(--faint)]">
              {String(step + 1).padStart(2, '0')}
            </span>
            <span>{caption}</span>
          </p>
        </li>
      ))}
    </ol>
  )
}
