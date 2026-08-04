import type { SpeakerProfile } from './types'

/**
 * A gap between two participants, measured on the map as drawn.
 *
 * The absolute number is not reportable — projected units have no meaning
 * outside one particular layout — so every pair also carries its share of the
 * widest gap on the same map. That ratio is the comparison a reader can
 * actually make: "these two are half as far apart as the furthest pair here."
 */
export interface SpeakerPair {
  a: SpeakerProfile
  b: SpeakerProfile
  /** Euclidean distance between centroids in projected space. */
  distance: number
  /** distance / widest gap on this map, so the widest pair is exactly 1. */
  relative: number
}

/** Every pair, widest gap first. */
export function speakerPairs(speakers: SpeakerProfile[]): SpeakerPair[] {
  const pairs: Omit<SpeakerPair, 'relative'>[] = []
  for (let i = 0; i < speakers.length; i += 1) {
    for (let j = i + 1; j < speakers.length; j += 1) {
      const a = speakers[i]
      const b = speakers[j]
      pairs.push({ a, b, distance: Math.hypot(a.x - b.x, a.y - b.y) })
    }
  }

  const widest = pairs.reduce((max, p) => Math.max(max, p.distance), 0)
  return pairs
    .map((p) => ({ ...p, relative: widest > 0 ? p.distance / widest : 0 }))
    .sort((x, y) => y.distance - x.distance)
}

/** Pairs involving `speaker`, widest gap first. Empty when they stand alone. */
export function pairsWith(
  pairs: SpeakerPair[],
  speaker: string | null,
): SpeakerPair[] {
  if (!speaker) return []
  return pairs.filter((p) => p.a.speaker === speaker || p.b.speaker === speaker)
}

/** The other half of a pair, given one side of it. */
export function counterpart(pair: SpeakerPair, speaker: string): SpeakerProfile {
  return pair.a.speaker === speaker ? pair.b : pair.a
}
