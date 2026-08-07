'use client'

import { useMemo } from 'react'
import { SAMPLE_TRANSCRIPT } from '@/data/sample'
import { isModerator, parseTranscript } from '@/lib/parse'
import { t, type Lang } from '@/lib/i18n'
import { Caveat } from '@/components/DetailPanel'

/**
 * The transcript composer.
 *
 * Shared by the studio, where it takes the whole plate, and by the overview,
 * where it is the section that lets somebody try the tool without leaving the
 * page they arrived on. One implementation, because the preview below the
 * editor is the part that matters and it must agree with the analysis exactly.
 */

/**
 * The line shapes the parser recognises, shown while the editor is empty.
 *
 * Taken from the formats the parser is tested against rather than invented, so
 * following one of them is a guarantee rather than a suggestion. The last two
 * are the timed forms — a leading clock, and the speaker-header form that
 * Clova, Otter and Daglo export. Times are optional everywhere; when they are
 * there, the map can also compare the first half of the meeting with the
 * second, which is what `timedNote` says.
 */
export const TRANSCRIPT_FORMATS: Record<Lang, string[]> = {
  ko: [
    '김철수: 발언',
    '[김철수] 발언',
    '◯ 김철수 위원  발언',
    '[00:12] 김철수: 발언',
    '김철수 00:12 ⏎ 발언',
  ],
  en: [
    'Alice: what she said',
    '[Alice] what she said',
    '[00:12] Alice: what she said',
    'Alice 00:12 ⏎ what she said',
  ],
}

/**
 * Pre-flight on what was pasted, using the same parser the server runs.
 *
 * An approximation here would be worse than nothing: the point of showing
 * detected speakers before spending the wait and an API call is to catch a
 * transcript the parser reads differently than the reader does, and a second,
 * looser regex would report names the analysis will not produce.
 */
export function useDetectedSpeakers(transcript: string) {
  return useMemo(() => {
    if (!transcript.trim()) return { speakers: [], moderators: [] as string[] }
    const parsed = parseTranscript(transcript)
    return {
      speakers: parsed.speakers,
      moderators: parsed.speakers.filter(isModerator),
    }
  }, [transcript])
}

export function Composer({
  lang,
  transcript,
  onChange,
  onSubmit,
  onCancel,
  error,
  loading,
  autoFocus = false,
  /** `plate` fills the studio's map area; `inline` sits in a page section. */
  variant = 'plate',
}: {
  lang: Lang
  transcript: string
  onChange: (v: string) => void
  onSubmit: () => void
  onCancel?: (() => void) | null
  error: string | null
  loading: boolean
  autoFocus?: boolean
  variant?: 'plate' | 'inline'
}) {
  const empty = !transcript.trim()
  const detected = useDetectedSpeakers(transcript)
  const plate = variant === 'plate'

  return (
    <div className={plate ? 'flex min-h-0 flex-1 flex-col' : ''}>
      {plate && (
        <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[var(--line)] px-4 py-3">
          <h2 className="t-title">{t('pasteTitle', lang)}</h2>
          <SampleButton lang={lang} onChange={onChange} />
          <p className="w-full text-[12.5px] leading-[1.6] text-[var(--muted)]">
            {t('transcriptLabel', lang)}
          </p>
        </header>
      )}

      {/* The editor is set in the sans face rather than in mono: the transcript
          is Korean, and the mono face has no Hangul to set it in. */}
      <div className={plate ? 'flex min-h-0 flex-1 flex-col p-4' : ''}>
        {!plate && (
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="text-[13px] text-[var(--muted)]">
              {t('transcriptLabel', lang)}
            </p>
            <SampleButton lang={lang} onChange={onChange} />
          </div>
        )}

        <textarea
          id="transcript"
          value={transcript}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          autoFocus={autoFocus}
          placeholder={
            lang === 'ko'
              ? '김철수: 저는 이 사업을 추진해야 한다고 봅니다.\n이영희: 주민 부담을 먼저 봐야 합니다.'
              : 'Alice: I think we should move ahead.\nBob: We should look at the cost first.'
          }
          className={`scroll-quiet w-full resize-none rounded-[10px] border border-[var(--line)] bg-[var(--plate)] p-4 text-[13.5px] leading-[1.8] text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--faint)] focus:border-[var(--line-strong)] ${
            plate ? 'min-h-[220px] flex-1' : 'h-[240px]'
          }`}
        />

        {/* Below the editor: the format help while there is nothing to read,
            and what the parser found once there is. The preview matters more
            than it looks — a transcript the parser splits differently than the
            reader expects is the failure that costs the wait and an API call to
            discover. */}
        <div className="mt-3 min-h-[52px]">
          {empty ? (
            <div>
              <div className="eyebrow mb-1.5">{t('formatsLabel', lang)}</div>
              <ul className="flex flex-wrap gap-1.5 text-[12px] text-[var(--body)]">
                {TRANSCRIPT_FORMATS[lang].map((f) => (
                  <li key={f} className="rounded-[4px] bg-[var(--panel-2)] px-2 py-1">
                    {f}
                  </li>
                ))}
              </ul>
              {/* Said here rather than after the analysis: whether the
                  timestamps survive the copy-paste is decided in this box, and
                  a reader who strips them will never be told what they lost. */}
              <p className="mt-2 text-[12px] leading-[1.55] text-[var(--muted)]">
                {t('timedNote', lang)}
              </p>
            </div>
          ) : detected.speakers.length === 0 ? (
            <p className="text-[12.5px] leading-[1.6] text-[var(--body)]">
              {t('noSpeakersYet', lang)}
            </p>
          ) : (
            <div>
              <div className="eyebrow mb-1.5">
                {t('detectedLabel', lang)}{' '}
                <span className="readout normal-case tracking-normal">
                  {detected.speakers.length}
                </span>
              </div>
              <ul className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[13px]">
                {detected.speakers.map((name) => {
                  const facilitator = detected.moderators.includes(name)
                  return (
                    <li
                      key={name}
                      className={
                        facilitator ? 'text-[var(--muted)]' : 'text-[var(--ink)]'
                      }
                    >
                      {name}
                      {facilitator && (
                        <span className="ml-1 text-[12px] text-[var(--muted)]">
                          — {t('moderatorExcluded', lang)}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onSubmit}
            disabled={loading || empty}
            className="rounded-full px-6 py-2.5 text-[13.5px] font-medium transition-opacity disabled:opacity-40"
            style={{ background: 'var(--signal)', color: 'var(--on-signal)' }}
          >
            {loading ? t('analyzing', lang) : t('buildMap', lang)}
          </button>
          {onCancel && !loading && (
            <button
              type="button"
              onClick={onCancel}
              className="ml-auto text-[12.5px] text-[var(--muted)] underline decoration-[var(--line-strong)] underline-offset-[3px] transition-colors hover:text-[var(--ink)]"
            >
              {t('cancel', lang)}
            </button>
          )}
        </div>

        {error && (
          <div className="mt-3">
            <Caveat>{error}</Caveat>
          </div>
        )}
      </div>
    </div>
  )
}

function SampleButton({
  lang,
  onChange,
}: {
  lang: Lang
  onChange: (v: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(SAMPLE_TRANSCRIPT)}
      className="text-[12.5px] text-[var(--muted)] underline decoration-[var(--line-strong)] underline-offset-[3px] transition-colors hover:text-[var(--ink)]"
    >
      {t('loadSample', lang)}
    </button>
  )
}
