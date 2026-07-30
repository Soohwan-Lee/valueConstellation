'use client'

import { useCallback, useMemo, useState } from 'react'
import { ConstellationMap } from '@/components/ConstellationMap'
import {
  DetailPanel,
  ProjectionNotice,
} from '@/components/DetailPanel'
import {
  METHOD_OPTIONS,
  RENDER_MODE_OPTIONS,
  SegmentedControl,
  SpeakerChips,
} from '@/components/MapControls'
import { SAMPLE_TRANSCRIPT } from '@/data/sample'
import { needsShapeEncoding, SPEAKER_SLOTS } from '@/lib/colors'
import type {
  AnalysisResult,
  ProjectedUtterance,
  ProjectionMethod,
  SpeakerRenderMode,
} from '@/lib/types'

type Analysis = AnalysisResult & { diagnostics?: Record<string, unknown> }

export default function Home() {
  const [transcript, setTranscript] = useState('')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [method, setMethod] = useState<ProjectionMethod>('pca')
  const [renderMode, setRenderMode] = useState<SpeakerRenderMode>('both')
  const [activeSpeakers, setActiveSpeakers] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<ProjectedUtterance | null>(null)
  const [selectedSpeaker, setSelectedSpeaker] = useState<string | null>(null)

  const projection = analysis?.projections[method] ?? null

  const analyze = useCallback(async () => {
    const text = transcript.trim()
    if (!text) return
    setLoading(true)
    setError(null)
    setSelected(null)
    setSelectedSpeaker(null)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? `Request failed (${res.status})`)
      setAnalysis(json as Analysis)
      setActiveSpeakers(new Set())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed.')
      setAnalysis(null)
    } finally {
      setLoading(false)
    }
  }, [transcript])

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

  return (
    <main className="mx-auto max-w-[1180px] px-6 py-10">
      <header className="mb-8">
        <h1 className="display text-[24px] leading-[1.25] font-medium">
          Value Constellation
        </h1>
        <p className="mt-1 text-[13px] text-[var(--muted)]">
          Where each participant stands, derived from what they actually said.
        </p>
      </header>

      {!analysis && (
        <section className="max-w-[760px]">
          <label
            htmlFor="transcript"
            className="mb-2 block text-[12px] text-[var(--muted)]"
          >
            Transcript — one speaker per line (김철수: …, [김철수] …, ◯ 김철수 위원 …)
          </label>
          <textarea
            id="transcript"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={14}
            spellCheck={false}
            placeholder={'김철수: ...\n이영희: ...'}
            className="w-full resize-y rounded-[8px] border border-[var(--hairline)] bg-[var(--surface)] p-3 font-mono text-[13px] leading-[1.6] text-[var(--ink)] outline-none focus:border-[var(--hairline-strong)]"
          />
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={analyze}
              disabled={loading || !transcript.trim()}
              className="rounded-[6px] px-3.5 py-2 text-[13px] font-medium text-white transition-opacity disabled:opacity-40"
              style={{ background: 'var(--accent)' }}
            >
              {loading ? 'Analyzing…' : 'Build map'}
            </button>
            <button
              type="button"
              onClick={() => setTranscript(SAMPLE_TRANSCRIPT)}
              className="text-[12px] text-[var(--muted)] underline decoration-[var(--hairline-strong)] underline-offset-2 hover:text-[var(--ink)]"
            >
              use sample
            </button>
            {loading && (
              <span className="text-[12px] text-[var(--muted)]">
                segmenting, embedding, projecting…
              </span>
            )}
          </div>
          {error && (
            <p className="mt-3 rounded-[6px] border border-[var(--hairline-strong)] bg-[var(--surface-2)] px-3 py-2 text-[12px] text-[var(--body)]">
              {error}
            </p>
          )}
        </section>
      )}

      {analysis && projection && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SpeakerChips
              speakers={projection.speakers}
              active={activeSpeakers}
              onToggle={toggleSpeaker}
              onClear={() => setActiveSpeakers(new Set())}
            />
            <div className="flex flex-wrap items-center gap-4">
              <SegmentedControl
                label="speakers"
                value={renderMode}
                options={RENDER_MODE_OPTIONS}
                onChange={setRenderMode}
              />
              <SegmentedControl
                label="layout"
                value={method}
                options={METHOD_OPTIONS}
                onChange={setMethod}
              />
              <button
                type="button"
                onClick={() => {
                  setAnalysis(null)
                  setError(null)
                }}
                className="text-[12px] text-[var(--muted)] underline decoration-[var(--hairline-strong)] underline-offset-2 hover:text-[var(--ink)]"
              >
                new transcript
              </button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="space-y-3">
              <div className="rounded-[8px] border border-[var(--hairline)] bg-[var(--surface)]">
                <ConstellationMap
                  projection={projection}
                  renderMode={renderMode}
                  activeSpeakers={activeSpeakers}
                  selectedId={selected?.id ?? null}
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
              <ProjectionNotice
                projection={projection}
                droppedSpeakers={analysis.droppedSpeakers}
              />
              {shapeNotice && (
                <p className="text-[12px] text-[var(--muted)]">
                  {speakerCount} speakers exceeds the {SPEAKER_SLOTS} visually
                  distinct colours available, so marker shape distinguishes the
                  overflow.
                </p>
              )}
            </div>

            <aside className="rounded-[8px] border border-[var(--hairline)] bg-[var(--surface)] p-4">
              <DetailPanel
                projection={projection}
                selectedUtterance={selected}
                selectedSpeaker={selectedSpeaker}
                onSelectUtterance={(u) => {
                  setSelected(u)
                  setSelectedSpeaker(null)
                }}
              />
              <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-[var(--hairline)] pt-3 text-[11px]">
                <dt className="text-[var(--muted)]">mapped</dt>
                <dd className="tnum text-[var(--body)]">
                  {projection.utterances.length}
                </dd>
                <dt className="text-[var(--muted)]">assent / procedural</dt>
                <dd className="tnum text-[var(--body)]">
                  {analysis.counts.agreement} / {analysis.counts.procedural}
                </dd>
              </dl>
            </aside>
          </div>
        </section>
      )}
    </main>
  )
}
