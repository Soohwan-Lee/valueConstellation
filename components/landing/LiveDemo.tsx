'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ConstellationMap } from '@/components/ConstellationMap'
import { pairsWith, speakerPairs } from '@/lib/pairs'
import type { Lang } from '@/lib/i18n'
import type {
  AnalysisResult,
  ProjectedUtterance,
  SpeakerProfile,
} from '@/lib/types'

/**
 * The hero: the product, running, on real output.
 *
 * It plays itself. Selecting a participant is the map's one gesture and the
 * only thing on it that is not self-evident, so the page performs it rather
 * than describing it — by the time somebody has read the headline they have
 * seen a measurement drawn twice.
 *
 * The cycle stops permanently at the first click, tap or key. Somebody who has
 * taken hold of the map is reading it, and a demo that keeps reaching in to
 * change the selection is fighting them for the controls.
 */
const HOLD_MS = 2600

export function LiveDemo({
  analysis,
  lang,
}: {
  analysis: AnalysisResult
  lang: Lang
}) {
  const projection = analysis.projections.pca
  const [selectedSpeaker, setSelectedSpeaker] = useState<string | null>(null)
  const [selected, setSelected] = useState<ProjectedUtterance | null>(null)
  const [autoplay, setAutoplay] = useState(true)

  const order = useMemo(
    () => rankByReach(projection.speakers),
    [projection.speakers],
  )

  useEffect(() => {
    if (!autoplay || order.length === 0) return
    if (
      typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      // Still show the gesture, just without cycling through it.
      setSelectedSpeaker(order[0])
      return
    }

    let index = 0
    // A beat before the first selection, so the map is seen settling first.
    const first = setTimeout(() => setSelectedSpeaker(order[0]), 1100)
    const step = setInterval(() => {
      index = (index + 1) % order.length
      setSelectedSpeaker(order[index])
    }, HOLD_MS)

    return () => {
      clearTimeout(first)
      clearInterval(step)
    }
  }, [autoplay, order])

  const takeOver = useCallback(() => setAutoplay(false), [])

  const pairs = useMemo(
    () => speakerPairs(projection.speakers),
    [projection.speakers],
  )
  const measure = useMemo(
    () => pairsWith(pairs, selectedSpeaker),
    [pairs, selectedSpeaker],
  )

  return (
    <div
      onPointerDown={takeOver}
      onKeyDown={takeOver}
      className="h-full w-full"
    >
      <ConstellationMap
        projection={projection}
        renderMode="both"
        hiddenSpeakers={EMPTY}
        selectedId={selected?.id ?? null}
        selectedSpeaker={selectedSpeaker}
        measure={measure}
        // Nothing hovers a distance row here; the rail that does lives in the
        // studio.
        emphasised={null}
        lang={lang}
        settleKey="demo"
        interaction="select"
        onSelect={(u) => {
          setAutoplay(false)
          setSelected(u)
          if (u) setSelectedSpeaker(null)
        }}
        onSelectSpeaker={(s) => {
          setAutoplay(false)
          setSelected(null)
          setSelectedSpeaker((prev) => (prev === s ? null : s))
        }}
      />
    </div>
  )
}

const EMPTY: Set<string> = new Set()

/**
 * Order the demo visits participants in: most-said first.
 *
 * A speaker with two statements has a provisional position, and opening on one
 * would demonstrate the measurement using the weakest evidence on the map.
 */
function rankByReach(speakers: SpeakerProfile[]): string[] {
  return [...speakers]
    .sort((a, b) => b.n - a.n)
    .map((s) => s.speaker)
}
