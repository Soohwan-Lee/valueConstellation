import { z } from 'zod'
import type { Lang } from './i18n.ts'

/**
 * Speaker names in both languages.
 *
 * Everything else on the page switches with the language toggle and the names
 * did not, so an English reader got an interface they could read wrapped around
 * four labels they could not — on the map, in the list, in the inspector, and
 * in the distances. The names are the one thing you have to read to use it.
 *
 * This is a rendering of the name, not a translation of the person: 김철수
 * becomes "Kim Cheol-su", which is the same name written in the other script.
 * Role names are different — 사회자 is a job, not a name, so it becomes
 * "Facilitator" rather than "Sahoeja".
 *
 * Transcript content is still never translated in place. The inspector shows a
 * statement's English rendering beside the original, and the original name is
 * always what the analysis keys on.
 */

export const SpeakerNamesSchema = z.object({
  names: z.array(
    z.object({
      source: z.string().describe('The name exactly as given in the input.'),
      en: z.string().describe('The same name written in English.'),
    }),
  ),
})

export type SpeakerNames = Record<string, string>

export const SPEAKER_NAMES_SYSTEM_PROMPT = `You render meeting participant names in English.

Rules:
1. A personal name is romanised, not translated. Use Revised Romanization for Korean: 김철수 → "Kim Cheol-su", 이영희 → "Lee Young-hee". Family name first, as written.
2. A role rather than a name is translated: 사회자 → "Facilitator", 의장 → "Chair", 위원장 → "Committee Chair", 서기 → "Clerk".
3. A name already in English is returned unchanged.
4. Copy "source" exactly as given, including any spacing.
5. Return one entry per input name. Never merge, drop, or invent one.`

export function formatSpeakersForPrompt(speakers: string[]): string {
  return speakers.map((s) => `- ${s}`).join('\n')
}

/**
 * The name to show. Falls back to the original whenever there is no rendering
 * for it — an untranslated name is better than a blank label, and this is the
 * state every map built before the field existed is in.
 */
export function speakerLabel(
  speaker: string,
  lang: Lang,
  names?: SpeakerNames | null,
): string {
  if (lang === 'ko') return speaker
  return names?.[speaker]?.trim() || speaker
}
