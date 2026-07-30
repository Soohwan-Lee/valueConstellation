/**
 * Speaker colour assignment.
 *
 * Eight slots, because that is where the palette actually stops working: under
 * simulated protanopia/deuteranopia, worst-pair separation degrades from 0.042
 * at six colours to 0.035 at eight and 0.026 at ten. Past eight, hue stops
 * distinguishing speakers, so shape carries the difference instead.
 */

export const SPEAKER_SLOTS = 8

/** Marker shapes, cycled once colours are exhausted. */
export type SpeakerShape = 'circle' | 'square' | 'triangle' | 'diamond'

const SHAPES: SpeakerShape[] = ['circle', 'square', 'triangle', 'diamond']

/** CSS variable holding this speaker's colour, defined per theme in globals.css. */
export function speakerColor(colorIndex: number): string {
  return `var(--s${(colorIndex % SPEAKER_SLOTS) + 1})`
}

/**
 * Shape for a speaker. Stays 'circle' until the colour palette wraps, so the
 * common case reads as one consistent visual language.
 */
export function speakerShape(colorIndex: number): SpeakerShape {
  return SHAPES[Math.floor(colorIndex / SPEAKER_SLOTS) % SHAPES.length]
}

/** True once colour alone can no longer separate the speakers. */
export function needsShapeEncoding(speakerCount: number): boolean {
  return speakerCount > SPEAKER_SLOTS
}

/** SVG path for a marker of the given shape, centred at the origin. */
export function shapePath(shape: SpeakerShape, r: number): string {
  switch (shape) {
    case 'square':
      return `M${-r},${-r}h${r * 2}v${r * 2}h${-r * 2}Z`
    case 'triangle': {
      const h = r * 1.15
      return `M0,${-h}L${r},${h * 0.75}L${-r},${h * 0.75}Z`
    }
    case 'diamond':
      return `M0,${-r * 1.2}L${r * 1.2},0L0,${r * 1.2}L${-r * 1.2},0Z`
    case 'circle':
    default:
      return `M${-r},0a${r},${r} 0 1,0 ${r * 2},0a${r},${r} 0 1,0 ${-r * 2},0Z`
  }
}
