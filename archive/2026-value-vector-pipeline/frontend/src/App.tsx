import { useEffect, useMemo, useRef, useState } from 'react'
import type { Argument, ProjectionMethod, ColorMode, ClusterMeta } from './types'
import { FIXTURE_ARGUMENTS, ALL_SPEAKERS as FIXTURE_SPEAKERS } from './data/fixture'
import { INITIAL_CLUSTER_META } from './data/clusterMeta'
import { loadFromCsv } from './data/loader'
import { ArgumentMap } from './components/ArgumentMap'
import { ValueDetail } from './components/ValueDetail'
import { speakerPalette } from './utils/valueUtils'

// ─── Types ────────────────────────────────────────────────────────────────────
type DataStatus = 'fixture' | 'loading' | 'loaded' | 'error'
type AppTab = 'reference' | 'interactive'

const REFERENCE_HTML_URL =
  '/data/policy_discussion/figures/full_argument_active_mds_party_cluster.html'

// ─── Data source badge ────────────────────────────────────────────────────────
const STATUS_BADGE: Record<DataStatus, { label: string; cls: string }> = {
  fixture: { label: 'fixture', cls: 'text-amber-600 bg-amber-50 border-amber-200' },
  loading: { label: 'loading…', cls: 'text-blue-500 bg-blue-50 border-blue-200 animate-pulse' },
  loaded:  { label: 'full CSV', cls: 'text-teal-600 bg-teal-50 border-teal-200' },
  error:   { label: '⚠ CSV failed', cls: 'text-rose-500 bg-rose-50 border-rose-200' },
}

export default function App() {
  // ── Tab ───────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<AppTab>('reference')
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // ── CSV data ─────────────────────────────────────────────────────────────
  const [csvArguments, setCsvArguments] = useState<Argument[] | null>(null)
  const [csvClusters, setCsvClusters] = useState<ClusterMeta[] | null>(null)
  const [dataStatus, setDataStatus] = useState<DataStatus>('fixture')
  const [csvSourceLabel, setCsvSourceLabel] = useState('')

  useEffect(() => {
    setDataStatus('loading')
    loadFromCsv()
      .then(({ arguments: args, clusters, source }) => {
        setCsvArguments(args)
        setCsvClusters(clusters)
        setCsvSourceLabel(source)
        setDataStatus('loaded')
      })
      .catch((err) => {
        console.warn('[ValueConstellation] CSV load failed, using fixture:', err)
        setDataStatus('error')
      })
  }, [])

  const hasRealProjections = dataStatus === 'loaded'
  const activeArguments = csvArguments ?? FIXTURE_ARGUMENTS

  // ── View state ────────────────────────────────────────────────────────────
  // Default to MDS + speaker-color to match the reference HTML
  const [projection, setProjection] = useState<ProjectionMethod>('mds')
  const [colorMode, setColorMode] = useState<ColorMode>('speaker')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedCluster, setSelectedCluster] = useState<number | null>(null)
  const [threshold, setThreshold] = useState(0.02)

  // ── Speaker filter ────────────────────────────────────────────────────────
  const allSpeakers = useMemo(
    () => [...new Set(activeArguments.map((a) => a.speaker))].sort(),
    [activeArguments],
  )
  const [visibleSpeakers, setVisibleSpeakers] = useState<Set<string>>(
    new Set(FIXTURE_SPEAKERS),
  )
  // Sync when CSV speakers arrive
  const speakersKey = allSpeakers.join(',')
  useEffect(() => {
    if (allSpeakers.length > 0) setVisibleSpeakers(new Set(allSpeakers))
  }, [speakersKey]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleSpeaker(speaker: string) {
    setVisibleSpeakers((prev) => {
      const next = new Set(prev)
      if (next.has(speaker)) {
        if (next.size === 1) return prev
        next.delete(speaker)
      } else {
        next.add(speaker)
      }
      return next
    })
  }

  // ── Cluster metadata ──────────────────────────────────────────────────────
  const [clusters, setClusters] = useState<ClusterMeta[]>(INITIAL_CLUSTER_META)
  useEffect(() => {
    if (csvClusters && csvClusters.length > 0) setClusters(csvClusters)
  }, [csvClusters])

  function updateClusterLabel(cluster_id: number, label: string) {
    setClusters((prev) =>
      prev.map((c) => (c.cluster_id === cluster_id ? { ...c, label } : c)),
    )
  }

  // ── Filtered map data ─────────────────────────────────────────────────────
  const mapArgs = useMemo(
    () => activeArguments.filter((a) => visibleSpeakers.has(a.speaker)),
    [activeArguments, visibleSpeakers],
  )

  const selectedArg = useMemo(
    () => activeArguments.find((a) => a.unit_id === selectedId) ?? null,
    [activeArguments, selectedId],
  )

  const selectedClusterMeta = useMemo(
    () => clusters.find((c) => c.cluster_id === selectedArg?.cluster_id),
    [clusters, selectedArg],
  )

  const badge = STATUS_BADGE[dataStatus]

  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden">
      {/* ══════════════════════════════════════════════
          Header
      ══════════════════════════════════════════════ */}
      <header className="flex-none h-12 bg-white border-b border-slate-200 flex items-center px-5 gap-4 shadow-sm z-10">
        {/* Logo */}
        <div className="flex items-center gap-2.5 select-none shrink-0">
          <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center text-white text-sm font-bold leading-none">
            ◈
          </div>
          <span className="text-sm font-semibold text-slate-900 tracking-tight">Value Constellation</span>
          <span className="text-slate-300 text-xs">·</span>
          <span className="text-xs text-slate-400">research prototype</span>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg ml-2">
          {([
            { key: 'reference', label: 'Reference Map' },
            { key: 'interactive', label: 'Interactive' },
          ] as { key: AppTab; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                tab === key
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Speaker filters (only in interactive tab) */}
        {tab === 'interactive' && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 shrink-0">Speakers</span>
            {allSpeakers.map((speaker) => {
              const sp = speakerPalette(speaker)
              const active = visibleSpeakers.has(speaker)
              return (
                <button
                  key={speaker}
                  onClick={() => toggleSpeaker(speaker)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-all"
                  style={{
                    borderColor: active ? sp.base : '#e2e8f0',
                    background: active ? sp.base + '18' : 'transparent',
                    color: active ? sp.base : '#94a3b8',
                    opacity: active ? 1 : 0.5,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full"
                    style={{ background: active ? sp.base : '#cbd5e1' }} />
                  {speaker}
                </button>
              )
            })}
          </div>
        )}

        {/* Badges */}
        <div className="flex items-center gap-1.5 shrink-0">
          {tab === 'interactive' && (
            <span className="text-[11px] font-mono text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
              {mapArgs.length}/{activeArguments.length}
            </span>
          )}
          <span
            className={`text-[10px] font-medium border px-2 py-0.5 rounded-full ${badge.cls}`}
            title={csvSourceLabel}
          >
            {badge.label}
          </span>
        </div>
      </header>

      {/* ══════════════════════════════════════════════
          Tab: Reference HTML (iframe)
      ══════════════════════════════════════════════ */}
      <div className={`flex-1 min-h-0 ${tab === 'reference' ? 'flex' : 'hidden'}`}>
        <iframe
          ref={iframeRef}
          src={REFERENCE_HTML_URL}
          className="w-full h-full border-0"
          title="Reference MDS map (backend output)"
        />
      </div>

      {/* ══════════════════════════════════════════════
          Tab: Interactive prototype
      ══════════════════════════════════════════════ */}
      <main className={`flex-1 min-h-0 gap-3 p-3 ${tab === 'interactive' ? 'flex' : 'hidden'}`}>
        {/* Map card */}
        <div className="flex-1 min-w-0">
          <ArgumentMap
            arguments={mapArgs}
            selectedId={selectedId}
            selectedCluster={selectedCluster}
            projectionMethod={projection}
            colorMode={colorMode}
            clusters={clusters}
            hasRealProjections={hasRealProjections}
            onSelect={setSelectedId}
            onProjectionChange={setProjection}
            onColorModeChange={setColorMode}
            onSelectCluster={setSelectedCluster}
            onUpdateClusterLabel={updateClusterLabel}
          />
        </div>

        {/* Detail card */}
        <div className="w-[400px] flex-none min-h-0">
          <ValueDetail
            argument={selectedArg}
            clusterLabel={selectedClusterMeta?.label ?? ''}
            threshold={threshold}
            onThresholdChange={setThreshold}
          />
        </div>
      </main>
    </div>
  )
}
