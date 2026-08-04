'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ConstellationMap } from '@/components/ConstellationMap'
import { Caveat, DetailPanel, ProjectionNotice } from '@/components/DetailPanel'
import Link from 'next/link'
import { Disclosure, Section, StageList, type Stage } from '@/components/Chrome'
import { SourceMenu } from '@/components/studio/SourceMenu'
import { GuideButton } from '@/components/studio/GuideButton'
import { LangSwitch, ThemeSwitch, usePreferences } from '@/components/Preferences'
import {
  MarkLegend,
  methodOptions,
  ParticipantList,
  renderModeOptions,
  SegmentedControl,
} from '@/components/MapControls'
import { SCENARIOS, getScenario } from '@/data/scenarios'
import { Composer } from '@/components/Composer'
import { takeStagedTranscript } from '@/lib/handoff'
import precomputed from '@/data/fixtures/precomputed.json'
import { needsShapeEncoding, SPEAKER_SLOTS } from '@/lib/colors'
import { pairsWith, speakerPairs, type SpeakerPair } from '@/lib/pairs'
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

export default function Studio() {
  const { lang } = usePreferences()

  // The opening state is a finished example, not an empty box: somebody who
  // arrives here directly sees what the tool produces before being asked to
  // supply anything.
  const [scenarioId, setScenarioId] = useState<string | null>(SCENARIOS[0].id)
  const [analysis, setAnalysis] = useState<Analysis | null>(
    FIXTURES[SCENARIOS[0].id] ?? null,
  )
  /**
   * Bumped whenever a different analysis is loaded. The map keys its settle
   * animation off this rather than off the data itself, so re-running the same
   * transcript still visibly redraws.
   */
  const [analysisSerial, setAnalysisSerial] = useState(0)

  const [pasting, setPasting] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState<Stage>('parse')
  const [error, setError] = useState<string | null>(null)

  const [method, setMethod] = useState<ProjectionMethod>('pca')
  const [renderMode, setRenderMode] = useState<SpeakerRenderMode>('both')
  const [hiddenSpeakers, setHiddenSpeakers] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<ProjectedUtterance | null>(null)
  const [selectedSpeaker, setSelectedSpeaker] = useState<string | null>(null)
  const [hoveredPair, setHoveredPair] = useState<SpeakerPair | null>(null)
  /** Set when a transcript arrived from the overview and should run on its own. */
  const [runStaged, setRunStaged] = useState(false)

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

  /**
   * Opens on whatever the landing page pointed at.
   *
   * Read from `location` on mount rather than through the router's search-param
   * hook, which would put this page behind a Suspense boundary and stop it
   * being prerendered — for one string read on arrival, that is the wrong
   * trade. Anything unrecognised falls through to the default example.
   */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    // A transcript pasted on the overview page. It is analysed here rather than
    // there so there is only ever one place a result is produced.
    if (params.get('pending') !== null) {
      const staged = takeStagedTranscript()
      if (staged) {
        setTranscript(staged)
        setPasting(true)
        setScenarioId(null)
        setRunStaged(true)
        return
      }
    }

    if (params.get('compose') !== null) {
      setPasting(true)
      setScenarioId(null)
      return
    }
    const example = params.get('example')
    if (example && FIXTURES[example]) {
      setScenarioId(example)
      setAnalysis(FIXTURES[example])
      setAnalysisSerial((n) => n + 1)
    }
  }, [])

  // Escape clears whatever is selected. The inspector covers part of the map,
  // and reaching for its close button is the wrong amount of work to undo a
  // click made out of curiosity.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setSelected(null)
      setSelectedSpeaker(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const resetSelection = useCallback(() => {
    setSelected(null)
    setSelectedSpeaker(null)
    setHoveredPair(null)
    setHiddenSpeakers(new Set())
  }, [])

  const pickScenario = useCallback(
    (id: string) => {
      const fixture = FIXTURES[id]
      setScenarioId(id)
      setError(null)
      resetSelection()
      if (fixture) {
        setAnalysis(fixture)
        setAnalysisSerial((n) => n + 1)
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
      if (!res.ok) {
        // The one failure a reader can act on is a server with no key
        // configured, so it is the one that gets said in their language.
        throw new Error(
          res.status === 503
            ? t('needsKey', lang)
            : (json?.error ?? `Request failed (${res.status})`),
        )
      }
      setAnalysis(json as Analysis)
      setAnalysisSerial((n) => n + 1)
      setScenarioId(null)
      setPasting(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed.')
    } finally {
      setLoading(false)
    }
  }, [transcript, resetSelection, lang])

  // Runs the handed-over transcript once it has landed in state. Kept separate
  // from the URL effect because `analyze` reads `transcript`, which is not set
  // yet at the moment the handoff is read.
  useEffect(() => {
    if (!runStaged || !transcript.trim()) return
    setRunStaged(false)
    void analyze()
  }, [runStaged, transcript, analyze])

  const toggleVisible = useCallback((speaker: string) => {
    setHiddenSpeakers((prev) => {
      const next = new Set(prev)
      if (next.has(speaker)) next.delete(speaker)
      else next.add(speaker)
      return next
    })
  }, [])

  const selectSpeaker = useCallback((speaker: string) => {
    // Selecting the same person again clears, so the measure lines can be put
    // away with the control that drew them.
    setSelectedSpeaker((prev) => (prev === speaker ? null : speaker))
    setSelected(null)
  }, [])

  const speakerCount = projection?.speakers.length ?? 0
  const shapeNotice = useMemo(
    () => needsShapeEncoding(speakerCount),
    [speakerCount],
  )

  const pairs = useMemo(
    () => (projection ? speakerPairs(projection.speakers) : []),
    [projection],
  )
  const visiblePairs = useMemo(
    () =>
      pairs.filter(
        (p) => !hiddenSpeakers.has(p.a.speaker) && !hiddenSpeakers.has(p.b.speaker),
      ),
    [pairs, hiddenSpeakers],
  )
  // A gap to somebody switched off the map is not one the reader can see, so
  // it is not drawn or listed either.
  const measure = useMemo(
    () => pairsWith(visiblePairs, selectedSpeaker),
    [visiblePairs, selectedSpeaker],
  )

  const lookFor = scenarioId ? getScenario(scenarioId)?.lookFor[lang] : null

  const hasMap = !loading && !pasting && projection && speakerCount > 0

  const openComposer = useCallback(() => {
    setPasting(true)
    setScenarioId(null)
    setTranscript('')
    setError(null)
  }, [])

  // One row rather than a block. The studio is a working surface: the wordmark
  // and tagline belong on the page that introduces the tool, not above the
  // controls of the tool itself.
  const identity = (
    <div className="flex items-center justify-between gap-3 px-5 py-3.5">
      <Link
        href="/"
        className="group flex items-center gap-2 text-[12.5px] text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
      >
        <span
          aria-hidden
          className="readout inline-block transition-transform group-hover:-translate-x-0.5"
        >
          ←
        </span>
        {t('backToOverview', lang)}
      </Link>
      <div className="flex shrink-0 items-center gap-2">
        <LangSwitch />
        <ThemeSwitch />
      </div>
    </div>
  )

  return (
    <div className="flex flex-col lg:h-dvh lg:flex-row lg:overflow-hidden">
      {/* On a narrow screen the map comes first and the console follows it:
          scrolling past five blocks of controls to reach the thing they
          describe is the wrong order to meet them in. */}
      <div className="border-b border-[var(--line)] bg-[var(--panel)] lg:hidden">
        {identity}
      </div>

      {/* Console rail. Identity, source, and every control that changes what
          the map shows — kept off the plate so the map is never covered by the
          things that describe it. */}
      <aside className="scroll-quiet order-2 bg-[var(--panel)] lg:order-1 lg:h-full lg:w-[336px] lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-[var(--line)]">
        <div className="hidden lg:block">{identity}</div>

        {hasMap && (
          <>
            {/* The one thing somebody is here to do: look at a person. Nothing
                above it, and the distances to everyone else unfold inside the
                row when one is chosen. */}
            <Section title={t('participantsLabel', lang)}>
              <ParticipantList
                speakers={projection.speakers}
                pairs={visiblePairs}
                hidden={hiddenSpeakers}
                selected={selectedSpeaker}
                onSelect={selectSpeaker}
                onToggleVisible={toggleVisible}
                onShowAll={() => setHiddenSpeakers(new Set())}
                onHoverPair={setHoveredPair}
                lang={lang}
                speakerNames={analysis?.speakerNames ?? null}
              />
              {!selectedSpeaker && (
                <p className="mt-2.5 px-0.5 text-[11.5px] leading-[1.55] text-[var(--muted)]">
                  {t('measureHint', lang)}
                </p>
              )}
            </Section>

            {/* Closed on arrival. Which layout to use is a question nobody has
                before they know what the map shows, and an open panel of
                switches suggests the picture is arbitrary. */}
            <Disclosure title={t('displayOptions', lang)}>
              <div className="space-y-2.5">
                <SegmentedControl
                  label={t('speakersLabel', lang)}
                  value={renderMode}
                  options={renderModeOptions(lang)}
                  onChange={setRenderMode}
                />
                <SegmentedControl
                  label={t('layoutLabel', lang)}
                  value={method}
                  options={methodOptions(lang)}
                  onChange={setMethod}
                />
              </div>
              <p className="mt-3 text-[11.5px] leading-[1.6] text-[var(--muted)]">
                {t('methodNote', lang)}
              </p>
              {shapeNotice && (
                <p className="mt-2 text-[11.5px] leading-[1.55] text-[var(--muted)]">
                  {tf('shapeNote', lang, {
                    n: speakerCount,
                    max: SPEAKER_SLOTS,
                  })}
                </p>
              )}
            </Disclosure>
          </>
        )}
      </aside>

      {/* The plate. */}
      <main className="order-1 min-w-0 flex-1 p-3 sm:p-4 lg:order-2 lg:h-full lg:p-5">
        <div className="flex h-[70vh] min-h-[460px] flex-col overflow-hidden rounded-[18px] border border-[var(--line)] bg-[var(--plate)] lg:h-full">
          {/* Loading is checked before the composer: the request is started
              from the composer and leaves it mounted, so testing `pasting`
              first would keep the editor on screen for the whole eight-second
              wait and the staged progress would never appear. */}
          {loading ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <div className="animate-rise">
                <StageList current={stage} lang={lang} />
              </div>
            </div>
          ) : pasting ? (
            <Composer
              lang={lang}
              transcript={transcript}
              onChange={setTranscript}
              onSubmit={analyze}
              onCancel={
                analysis
                  ? () => {
                      setPasting(false)
                      setError(null)
                    }
                  : null
              }
              error={error}
              loading={loading}
              autoFocus
            />
          ) : projection && speakerCount > 0 ? (
            <>
              {/* Title and legend at the top, provenance and caveats at the
                  bottom: what the marks mean has to be read before the map,
                  and how far to trust it after. */}
              <header className="border-b border-[var(--line)] px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <SourceMenu
                    activeId={scenarioId}
                    pasting={pasting}
                    lang={lang}
                    onPick={pickScenario}
                    onPaste={openComposer}
                    disabled={loading}
                  />
                  <GuideButton lang={lang} />
                </div>
                {/* What to look for in this particular map. Carried over from
                    the overview so somebody who arrived by picking an example
                    is not left to work out why that one was worth opening. */}
                {lookFor && (
                  <p className="mt-3 text-[12.5px] leading-[1.7] text-[var(--body)]">
                    {lookFor}
                  </p>
                )}
                <div className="mt-3">
                  <MarkLegend
                    showRegions={renderMode !== 'point'}
                    showPoints={renderMode !== 'region'}
                    hasAxes={projection.meta.axes !== null}
                    lang={lang}
                  />
                </div>
              </header>

              <div className="relative min-h-0 flex-1">
                <ConstellationMap
                  projection={projection}
                  renderMode={renderMode}
                  hiddenSpeakers={hiddenSpeakers}
                  selectedId={selected?.id ?? null}
                  selectedSpeaker={selectedSpeaker}
                  measure={measure}
                  emphasised={hoveredPair}
                  lang={lang}
                  speakerNames={analysis?.speakerNames ?? null}
                  settleKey={String(analysisSerial)}
                  onSelect={(u) => {
                    setSelected(u)
                    if (u) setSelectedSpeaker(null)
                  }}
                  onSelectSpeaker={selectSpeaker}
                />

                {(selected || selectedSpeaker) && (
                  <div className="absolute inset-x-3 bottom-3 max-h-[70%] sm:inset-x-auto sm:bottom-3 sm:right-3 sm:top-3 sm:w-[330px]">
                    <DetailPanel
                      projection={projection}
                      pairs={pairs}
                      selectedUtterance={selected}
                      selectedSpeaker={selectedSpeaker}
                      lang={lang}
                      speakerNames={analysis?.speakerNames ?? null}
                      onSelectUtterance={(u) => {
                        setSelected(u)
                        setSelectedSpeaker(null)
                      }}
                      onClose={() => {
                        setSelected(null)
                        setSelectedSpeaker(null)
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Caveats sit under the map rather than behind a disclosure:
                  what the projection failed to capture has to be readable
                  without first suspecting that something is wrong. */}
              <footer className="space-y-2 border-t border-[var(--line)] px-4 py-3">
                <ProjectionNotice
                  projection={projection}
                  droppedSpeakers={analysis?.droppedSpeakers ?? []}
                  lang={lang}
                />
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-[var(--muted)]">
                  <span>
                    {t('mapped', lang)}{' '}
                    <span className="readout text-[var(--body)]">
                      {projection.utterances.length}
                    </span>
                  </span>
                  <span className="text-[var(--faint)]">/</span>
                  <span>
                    {t('assentProcedural', lang)}{' '}
                    <span className="readout text-[var(--body)]">
                      {analysis ? analysis.counts.agreement : 0} ·{' '}
                      {analysis ? analysis.counts.procedural : 0}
                    </span>
                  </span>
                </div>
              </footer>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8">
              <p className="max-w-[36ch] text-center text-[13.5px] leading-[1.7] text-[var(--muted)]">
                {t('leadIn', lang)}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
