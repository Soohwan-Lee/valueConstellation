'use client'

import Link from 'next/link'
import { mapResolution, regionPath, regionRings, type Point } from '@/lib/blob'
import { buildScales } from '@/lib/frame'
import { speakerLabel } from '@/lib/speakers'
import { attributionVerdict } from '@/components/DetailPanel'
import { t, tf, type Lang } from '@/lib/i18n'
import type { AnalysisResult } from '@/lib/types'
import type { Scenario } from '@/data/scenarios'

/**
 * One example, as the thing you click.
 *
 * The overview used to open on a single large map with the other three behind
 * tabs, which put the choice one interaction away and let somebody leave having
 * seen one shape. Four cards, each showing its own map, is the pattern template
 * galleries settled on for the same reason: the options are the content, and
 * picking one is the first thing you do rather than the thing you do after
 * reading.
 *
 * Each preview is drawn from that example's committed analysis with the same
 * region maths as the real map, so the shapes on the cards are the shapes you
 * get when you open them.
 */
const W = 300
const H = 168
const PAD = 26

export function ScenarioCard({
  scenario,
  analysis,
  lang,
  cta,
  index,
}: {
  scenario: Scenario
  analysis: AnalysisResult
  lang: Lang
  cta: string
  index: number
}) {
  // The layout the studio opens on, so the shape on the card is the shape you
  // land on. It used to draw the PCA layout while the studio defaulted to
  // people, which made every card a preview of a different picture.
  const projection = analysis.projections.people
  const { toX, toY } = buildScales(projection, {
    width: W,
    height: H,
    padding: PAD,
  })

  const bySpeaker: Point[][] = projection.speakers.map((s) =>
    projection.utterances
      .filter((u) => u.speaker === s.speaker)
      .map((u) => [toX(u.x), toY(u.y)] as Point),
  )
  const { reach } = mapResolution(bySpeaker, 14)
  const verdict = attributionVerdict(projection.meta.attribution)

  return (
    <Link
      href={`/studio?example=${scenario.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-[16px] border border-[var(--line)] bg-[var(--panel)] shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1 hover:border-[var(--line-strong)] hover:shadow-[var(--shadow-lift)]"
    >
      <div className="relative border-b border-[var(--line)] bg-[var(--plate)]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-full w-full"
          role="img"
          aria-label={scenario.topic[lang]}
        >
          <defs>
            <pattern
              id={`card-field-${scenario.id}`}
              width={16}
              height={16}
              patternUnits="userSpaceOnUse"
            >
              <circle cx={1} cy={1} r={0.7} fill="var(--line)" />
            </pattern>
          </defs>
          <rect width={W} height={H} fill={`url(#card-field-${scenario.id})`} opacity={0.6} />

          {bySpeaker.map((points, i) => {
            const d = regionPath(regionRings(points, reach))
            if (!d) return null
            const colour = `var(--s${(projection.speakers[i].colorIndex % 8) + 1})`
            return (
              <path
                key={`r${i}`}
                d={d}
                fillRule="evenodd"
                fill={colour}
                fillOpacity={0.1}
                stroke={colour}
                strokeOpacity={0.3}
                strokeWidth={1}
              />
            )
          })}

          {projection.utterances.map((u, i) => {
            const s = projection.speakers.find((x) => x.speaker === u.speaker)
            return (
              <circle
                key={u.id}
                cx={toX(u.x)}
                cy={toY(u.y)}
                r={2.6}
                fill={`var(--s${((s?.colorIndex ?? 0) % 8) + 1})`}
                fillOpacity={0.55}
                className="motion-safe:animate-[settle_320ms_cubic-bezier(0.32,0.72,0,1)_both]"
                style={{
                  animationDelay: `${index * 90 + i * 12}ms`,
                  transformBox: 'fill-box',
                  transformOrigin: 'center',
                }}
              />
            )
          })}

          {projection.speakers.map((s) => (
            <g key={s.speaker}>
              <circle
                cx={toX(s.x)}
                cy={toY(s.y)}
                r={6}
                fill={s.underdetermined ? 'var(--plate)' : `var(--s${(s.colorIndex % 8) + 1})`}
                stroke={`var(--s${(s.colorIndex % 8) + 1})`}
                strokeWidth={1.4}
                strokeDasharray={s.underdetermined ? '3 2.5' : undefined}
              />
              <text
                x={toX(s.x)}
                y={toY(s.y) - 11}
                textAnchor="middle"
                className="text-[9.5px] font-medium"
                fill="var(--body)"
                stroke="var(--plate)"
                strokeWidth={2.5}
                strokeLinejoin="round"
                style={{ paintOrder: 'stroke' }}
              >
                {speakerLabel(s.speaker, lang, analysis.speakerNames)}
              </text>
            </g>
          ))}
        </svg>

        <span className="readout absolute left-3 top-3 rounded-full bg-[var(--panel)]/85 px-2 py-0.5 text-[10px] text-[var(--muted)] backdrop-blur-sm">
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        {/* The agenda is the card's headline, not a caption above one.
            Somebody scanning four of these is deciding whether the tool fits
            a meeting of their own, and that is answered by what was being
            decided — which was set at 12px in muted grey under an eyebrow,
            below a title naming a finding they had no context for yet. */}
        <p className="eyebrow">{t('agendaLabel', lang)}</p>
        <h3 className="t-title mt-1.5">{scenario.topic[lang]}</h3>

        {/* What this particular map turned out to show, marked as the finding
            it is rather than left to read as a second headline. */}
        <p className="mt-3 flex-1 text-[13.5px] leading-[1.65] text-[var(--muted)]">
          <span className="font-medium text-[var(--ink)]">
            {scenario.title[lang]}
          </span>
          {' — '}
          {scenario.teaser[lang]}
        </p>

        {/* What the map scored, on the card rather than behind the click. One
            of these four is a failure and says so here: an example gallery
            where every tile promises success teaches that the tool always
            works, which is the one thing it must not teach. */}
        <div className="mt-3.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-[var(--muted)]">
          <span>
            {tf('cardPeople', lang, { n: projection.speakers.length })}
          </span>
          <span className="text-[var(--faint)]">·</span>
          <span>
            {tf('cardStatements', lang, { n: projection.utterances.length })}
          </span>
          {verdict && (
            <>
              <span className="text-[var(--faint)]">·</span>
              {/* Weight rather than hue: every colour on this page belongs to
                  a speaker, and an alarm-coloured chip would read as a fifth
                  participant. The failing card gets the ink outline the rest
                  of the interface uses for a caveat. */}
              <span
                className="rounded-full px-1.5 py-0.5"
                style={
                  verdict === 'none'
                    ? {
                        border: '1px solid var(--ink)',
                        color: 'var(--ink)',
                        padding: '1px 5px',
                      }
                    : { background: 'var(--panel-2)', color: 'var(--body)' }
                }
              >
                {t(verdict === 'none' ? 'cardFails' : 'cardWorks', lang)}
              </span>
            </>
          )}
        </div>

        <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--body)] transition-colors group-hover:text-[var(--ink)]">
          {cta}
          <span
            aria-hidden
            className="readout transition-transform group-hover:translate-x-1"
          >
            →
          </span>
        </span>
      </div>
    </Link>
  )
}
