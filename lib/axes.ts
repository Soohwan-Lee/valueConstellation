import { z } from 'zod'
import type { ProjectedUtterance } from './types.ts'

/**
 * Naming the axes.
 *
 * Until now the map's axes were deliberately unlabelled, on the grounds that a
 * direction in a projection carries no fixed meaning. That is true of MDS,
 * whose orientation is arbitrary — rotate the whole picture and nothing is
 * lost. It is not true of PCA, where the axes are by construction the two
 * directions the statements differ on most. Those directions are the closest
 * thing this method has to an answer for "what is this room actually arguing
 * about", and leaving them anonymous threw that away.
 *
 * So: name them from the statements at each end, and only for PCA.
 *
 * The names are a reading aid and are marked as one. They come from a model
 * looking at the extremes, not from a measurement, and the statements
 * themselves stay one click away so a reader can check the label against what
 * was actually said.
 */

const PoleSchema = z.object({
  ko: z.string().describe('2-5 words in Korean. A theme, not a sentence.'),
  en: z.string().describe('2-5 words in English. A theme, not a sentence.'),
})

const AxisSchema = z.object({
  low: PoleSchema.describe('What the statements at the LOW end have in common.'),
  high: PoleSchema.describe('What the statements at the HIGH end have in common.'),
})

export const AxisLabelsSchema = z.object({
  horizontal: AxisSchema,
  vertical: AxisSchema,
})

export type AxisPole = z.infer<typeof PoleSchema>
export type AxisLabel = z.infer<typeof AxisSchema>
export type AxisLabels = z.infer<typeof AxisLabelsSchema>

export const AXIS_SYSTEM_PROMPT = `You name the two axes of a map of meeting statements.

The map was produced by taking every argument in a discussion, placing similar
arguments near each other, and then flattening to two dimensions along the two
directions the arguments differ on most. You are given the statements furthest
along each end of each direction.

For each end, name what the statements there have in common: the kind of reason
being given, the concern being raised, the frame being used. 2-5 words.

Rules:
- Name the shared theme, never summarise one statement.
- The two ends of one axis must contrast with each other. If you cannot find a
  contrast, name each end on its own terms rather than inventing one.
- Do not use the words "positive", "negative", "high", "low", "left" or "right".
- Do not name a person, and do not use a speaker's name.
- Give both Korean and English. The Korean is the primary label and must read
  naturally; it is not a translation of the English.`

/** How many statements from each end are shown to the model. */
const EXTREMES = 5

/**
 * Formats the ends of both axes for the prompt.
 *
 * Statements are given without their speaker. A label naming a direction after
 * whoever happens to sit at that end would make the axis a person rather than a
 * theme, which is the one thing it must not be — everybody would then appear to
 * be measured against one participant.
 */
export function formatExtremesForPrompt(
  utterances: ProjectedUtterance[],
): string {
  const byX = [...utterances].sort((a, b) => a.x - b.x)
  const byY = [...utterances].sort((a, b) => a.y - b.y)

  const block = (label: string, items: ProjectedUtterance[]) =>
    `${label}\n${items.map((u) => `- ${u.text}`).join('\n')}`

  return [
    block('HORIZONTAL AXIS — low end:', byX.slice(0, EXTREMES)),
    block('HORIZONTAL AXIS — high end:', byX.slice(-EXTREMES).reverse()),
    block('VERTICAL AXIS — low end:', byY.slice(0, EXTREMES)),
    block('VERTICAL AXIS — high end:', byY.slice(-EXTREMES).reverse()),
  ].join('\n\n')
}

/**
 * True when the statements are spread enough along both axes for the ends to be
 * different from each other.
 *
 * With everything piled in the middle, the five statements at one end and the
 * five at the other are the same handful of arguments, and the model will
 * invent a contrast between a set and itself. Requiring the ends to be disjoint
 * is a cheap, exact check for that.
 */
export function canLabelAxes(utterances: ProjectedUtterance[]): boolean {
  return utterances.length >= EXTREMES * 2
}
