import { z } from 'zod'

/**
 * Repairing missing translations.
 *
 * Segmentation is asked for an English rendering alongside each unit, and it is
 * unreliable about it: on one rebuild of the examples a whole batch of fourteen
 * Korean statements came back with the translation field null — the model had
 * decided, for that call, that the source was already English — while the batch
 * beside it translated everything. The interface then showed the original with
 * no translation for two thirds of a map, silently.
 *
 * Whether a unit needs translating is not a judgement call. If it contains
 * Hangul, it does. So the units that came back without one are collected and
 * translated in a single dedicated call, where translating is the only task.
 *
 * A repair that fails leaves the originals in place, which is exactly what
 * happens without it.
 */

export const TranslationsSchema = z.object({
  translations: z
    .array(z.string())
    .describe('One English translation per input line, in the same order.'),
})

export const TRANSLATION_SYSTEM_PROMPT = `You translate meeting statements into English.

Rules:
1. Translate faithfully. Do not summarise, soften, or clean up — hedging, force and specificity must all survive.
2. Translate EVERY word. An output containing any Korean character is wrong, including for terms that feel untranslatable.
3. Keep numbers and units as they are stated.
4. Return exactly one translation per input line, in the same order. Never merge or drop a line.`

/** True when this unit is not in English and has no usable translation yet. */
export function needsTranslation(text: string, textEn?: string): boolean {
  if (!/[가-힣]/.test(text)) return false
  if (!textEn || !textEn.trim()) return true
  if (textEn.trim() === text.trim()) return true
  return /[가-힣]/.test(textEn)
}

/** Numbers the lines so the model has something to keep in order. */
export function formatForTranslation(texts: string[]): string {
  return texts.map((t, i) => `${i + 1}. ${t}`).join('\n\n')
}
