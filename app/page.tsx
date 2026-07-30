'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ConstellationMap } from '@/components/ConstellationMap'
import { DetailPanel, ProjectionNotice } from '@/components/DetailPanel'
import { HowToRead } from '@/components/HowToRead'
import { LangToggle, ScenarioChips, StageList, type Stage } from '@/components/Chrome'
import {
  METHOD_OPTIONS,
  RENDER_MODE_OPTIONS,
  SegmentedControl,
  SpeakerChips,
} from '@/components/MapControls'
import { SCENARIOS, getScenario } from '@/data/scenarios'
import precomputed from '@/data/fixtures/precomputed.json'
import { needsShapeEncoding, SPEAKER_SLOTS } from '@/lib/colors'
import { t, tf, type Lang } from '@/lib/i18n'
import type {
  AnalysisResult,
  ProjectedUtterance,
  ProjectionMethod,
  SpeakerRenderMode,
} from '@/lib/types'

type Analysis = AnalysisResult & { diagnostics?: Record<string, unknown> }

const FIXTURES = precomputed as unknown as Record<string, Analysis>

/** Stage timings for the progress display, tuned to observed pipeline latency. */
const STAGE_SCHEDULE: { at: number; stage: Stage }[] = [
  { at: 0, stage: 'parse' },
  { at: 400, stage: 'segment' },
  { at: 5200, stage: 'embed' },
  { at: 6800, stage: 'project' },
]

export default function Home() {
  const [lang, setLang] = useState<Lang>('ko')

  // The landing state is a finished example, not an empty box: a first-time
  // visitor sees what the tool produces before being asked to supply anything.
  const [scenarioId, setScenarioId] = useState<string | null>(SCENARIOS[0].id)
  const [analysis, setAnalysis] = useState<Analysis | null>(
    FIXTURES[SCENARIOS[0].id] ?? null,
  )

  const [pasting, setPasting] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState<Stage>('parse')
  const [error, setError] = useState<string | null>(null)

  const [method, setMethod] = useState<ProjectionMethod>('pca')
  const [renderMode, setRenderMode] = useState<SpeakerRenderMode>('both')
  const [showControls, setShowControls] = useState(false)
  const [activeSpeakers, setActiveSpeakers] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<ProjectedUtterance | null>(null)
  const [selectedSpeaker, setSelectedSpeaker] = useState<string | null>(null)

  const projection = analysis?.projections[method] ?? null

  // Advance the stage labels while a request is in flight. The server does not
  // report progress, so these are elapsed-time estimates — which is also why
  // there is no percentage bar pretending to be a measurement.
  useEffect(() => {
    if (!loading) return
    const timers = STAGE_SCHEDULE.map(({ at, stage: s }) =>
      setTimeout(() => setStage(s), at),
    )
    return () => timers.forEach(clearTimeout)
  }, [loading])

  const resetSelection = useCallback(() => {
    setSelected(null)
    setSelectedSpeaker(null)
    setActiveSpeakers(new Set())
  }, [])

  const pickScenario = useCallback(
    (id: string) => {
      const fixture = FIXTURES[id]
      setScenarioId(id)
      setError(null)
      resetSelection()
      if (fixture) {
        setAnalysis(fixture)
        setPasting(false)
        return
      }
      // No fixture committed for this scenario: fall back to loading its
      // transcript into the editor rather than showing nothing.
      setTranscript(getScenario(id)?.transcript ?? '')
      setPasting(true)
    },
    [resetSelection],
  )

  const analyze = useCallback(async () => {
    const text = transcript.trim()
    if (!text) return
    setLoading(true)
    setStage('parse')
    setError(null)
    resetSelection()
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? `Request failed (${res.status})`)
      setAnalysis(json as Analysis)
      setScenarioId(null)
      setPasting(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed.')
    } finally {
      setLoading(false)
    }
  }, [transcript, resetSelection])

  const toggleSpeaker = useCallback((speaker: string) => {
    setActiveSpeakers((prev) => {
      const next = new Set(prev)
      if (next.has(speaker)) next.delete(speaker)
      else next.add(speaker)
      return next
    })
  }, [])

  const speakerCount = projection?.speakers.length ?? 0
  const shapeNotice = useMemo(
    () => needsShapeEncoding(speakerCount),
    [speakerCount],
  )

  const detectedSpeakers = useMemo(() => {
    if (!transcript.trim()) return 0
    const names = new Set<string>()
    for (const line of transcript.split(/\r?\n/)) {
      const m = /^\s*[◯○●▶▷□■※\-*·•]?\s*\[?\s*([^:：\]\n]{1,20}?)\s*\]?\s*[:：]/.exec(line)
      if (m && !/^\d+$/.test(m[1].trim())) names.add(m[1].trim())
    }
    return names.size
  }, [transcript])

  return (
    <main className="mx-auto max-w-[1180px] px-6 py-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="display text-[22px] leading-[1.25] font-medium">
            Value Constellation
          </h1>
          <p className="mt-1 max-w-[560px] text-[13px] leading-[1.5] text-[var(--muted)]">
            {t('tagline', lang)}
          </p>
        </div>
        <LangToggle lang={lang} onChange={setLang} />
      </header>

      {/* Examples stay visible throughout, so switching scenarios never
          requires navigating away from the map. */}
      <section className="mb-5">
        <div className="mb-2 text-[11px] tracking-wide text-[var(--muted)]">
          {t('examplesLabel', lang).toUpperCase()}
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <ScenarioChips
            activeId={scenarioId}
            lang={lang}
            onPick={pickScenario}
            disabled={loading}
          />
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setPasting(true)
              setScenarioId(null)
              setTranscript('')
              setError(null)
            }}
            className="rounded-[8px] border border-dashed px-3 py-2 text-[13px] transition-colors disabled:opacity-50"
            style={{
              borderColor: pasting ? 'var(--accent)' : 'var(--hairline-strong)',
              color: pasting ? 'var(--ink)' : 'var(--body)',
              background: pasting ? 'var(--surface-2)' : 'transparent',
            }}
          >
            {t('orPasteOwn', lang)}
          </button>
        </div>
      </section>

      {pasting && (
        <section className="mb-6 max-w-[760px]">
          <label
            htmlFor="transcript"
            className="mb-2 block text-[12px] text-[var(--muted)]"
          >
            {t('transcriptLabel', lang)}
          </label>
          <textarea
            id="transcript"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={12}
            spellCheck={false}
            placeholder={
              lang === 'ko'
                ? '김철수: 저는 이 사업을 추진해야 한다고 봅니다.\n이영희: 주민 부담을 먼저 봐야 합니다.'
                : 'Alice: I think we should move ahead.\nBob: We should look at the cost first.'
            }
            className="w-full resize-y rounded-[8px] border border-[var(--hairline)] bg-[var(--surface)] p-3 font-mono text-[13px] leading-[1.6] text-[var(--ink)] outline-none focus:border-[var(--hairline-strong)]"
          />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={analyze}
              disabled={loading || !transcript.trim()}
              className="rounded-[6px] px-3.5 py-2 text-[13px] font-medium text-white transition-opacity disabled:opacity-40"
              style={{ background: 'var(--accent)' }}
            >
              {loading ? t('analyzing', lang) : t('buildMap', lang)}
            </button>
            {detectedSpeakers > 0 && !loading && (
              <span className="tnum text-[12px] text-[var(--muted)]">
                {detectedSpeakers}{' '}
                {lang === 'ko' ? '명 감지' : detectedSpeakers === 1 ? 'speaker' : 'speakers'}
              </span>
            )}
            {analysis && !loading && (
              <button
                type="button"
                onClick={() => {
                  setPasting(false)
                  setError(null)
                }}
                className="text-[12px] text-[var(--muted)] underline decoration-[var(--hairline-strong)] underline-offset-2 hover:text-[var(--ink)]"
              >
                {t('back', lang)}
              </button>
            )}
          </div>
          {error && (
            <p className="mt-3 rounded-[6px] border border-[var(--hairline-strong)] bg-[var(--surface-2)] px-3 py-2 text-[12px] leading-[1.5] text-[var(--body)]">
              {error}
            </p>
          )}
        </section>
      )}

      {loading && (
        <section className="mb-6 rounded-[8px] border border-[var(--hairline)] bg-[var(--surface)] p-4">
          <StageList current={stage} lang={lang} />
        </section>
      )}

      {!loading && projection && projection.speakers.length > 0 && (
        <section className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="space-y-3">
              {/* Speaker legend above the map: identifying who is who is
                  needed constantly, so it does not belong behind a disclosure.
                  Clicking a chip filters; counts stay visible so a position
                  built on two statements never looks like one built on forty. */}
              <SpeakerChips
                speakers={projection.speakers}
                active={activeSpeakers}
                onToggle={toggleSpeaker}
                onClear={() => setActiveSpeakers(new Set())}
                showAllLabel={t('showAll', lang)}
              />

              <div className="rounded-[8px] border border-[var(--hairline)] bg-[var(--surface)]">
                <ConstellationMap
                  projection={projection}
                  renderMode={renderMode}
                  activeSpeakers={activeSpeakers}
                  selectedId={selected?.id ?? null}
                  preferEnglish={lang === 'en'}
                  onSelect={(u) => {
                    setSelected(u)
                    if (u) setSelectedSpeaker(null)
                  }}
                  onSelectSpeaker={(s) => {
                    setSelectedSpeaker(s)
                    setSelected(null)
                  }}
                />
              </div>

              {/* Surfaced outside the disclosure: when the fit is saturated the
                  map is barely evidence at all, which the reader needs before
                  they start drawing conclusions from it, not after. */}
              {projection.meta.saturated && (
                <p
                  className="rounded-[6px] border px-3 py-2 text-[12px] leading-[1.55]"
                  style={{
                    borderColor: 'var(--hairline-strong)',
                    background: 'var(--surface-2)',
                    color: 'var(--body)',
                  }}
                >
                  {tf('varianceSaturated', lang, {
                    n: projection.meta.fittedOn,
                    pct: (
                      (projection.meta.explainedVariance ?? 0) * 100
                    ).toFixed(0),
                  })}
                </p>
              )}

              <HowToRead lang={lang} />

              {/* Advanced controls stay collapsed on arrival: a layout switch
                  is meaningless before someone knows what the map shows, and
                  seeing one suggests the arrangement is arbitrary. */}
              <details
                open={showControls}
                onToggle={(e) => setShowControls(e.currentTarget.open)}
                className="group rounded-[6px] border border-[var(--hairline)] px-3 py-2"
              >
                <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-[12px] text-[var(--body)] hover:text-[var(--ink)]">
                  <span className="inline-block transition-transform group-open:rotate-90">
                    ▸
                  </span>
                  {lang === 'ko' ? '표시 설정' : 'Display options'}
                </summary>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
                  <SegmentedControl
                    label={t('speakersLabel', lang)}
                    value={renderMode}
                    options={RENDER_MODE_OPTIONS.map((o) => ({
                      ...o,
                      label:
                        o.value === 'point'
                          ? t('modePoint', lang)
                          : o.value === 'region'
                            ? t('modeRegion', lang)
                            : t('modeBoth', lang),
                    }))}
                    onChange={setRenderMode}
                  />
                  <SegmentedControl
                    label={t('layoutLabel', lang)}
                    value={method}
                    options={METHOD_OPTIONS}
                    onChange={setMethod}
                  />
                </div>
                <div className="mt-3 space-y-2 border-t border-[var(--hairline)] pt-3">
                  <ProjectionNotice
                    projection={projection}
                    droppedSpeakers={analysis?.droppedSpeakers ?? []}
                    lang={lang}
                  />
                  {shapeNotice && (
                    <p className="text-[12px] text-[var(--muted)]">
                      {tf('shapeNote', lang, {
                        n: speakerCount,
                        max: SPEAKER_SLOTS,
                      })}
                    </p>
                  )}
                </div>
              </details>
            </div>

            <aside className="rounded-[8px] border border-[var(--hairline)] bg-[var(--surface)] p-4">
              <DetailPanel
                projection={projection}
                selectedUtterance={selected}
                selectedSpeaker={selectedSpeaker}
                lang={lang}
                onSelectUtterance={(u) => {
                  setSelected(u)
                  setSelectedSpeaker(null)
                }}
              />
              {analysis && (
                <dl className="mt-4 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 border-t border-[var(--hairline)] pt-3 text-[11px]">
                  <dt className="text-[var(--muted)]">{t('mapped', lang)}</dt>
                  <dd className="tnum text-[var(--body)]">
                    {projection.utterances.length}
                  </dd>
                  <dt className="text-[var(--muted)]">
                    {t('assentProcedural', lang)}
                  </dt>
                  <dd className="tnum text-[var(--body)]">
                    {analysis.counts.agreement} / {analysis.counts.procedural}
                  </dd>
                </dl>
              )}
            </aside>
          </div>
        </section>
      )}
    </main>
  )
}
