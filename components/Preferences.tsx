'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { t, type Lang } from '@/lib/i18n'

export type Theme = 'light' | 'dark'

export const LANG_KEY = 'vc-lang'
export const THEME_KEY = 'vc-theme'

interface Preferences {
  lang: Lang
  setLang: (l: Lang) => void
  theme: Theme
  setTheme: (t: Theme) => void
}

const PreferencesContext = createContext<Preferences | null>(null)

/**
 * Language and theme, shared by every page and persisted.
 *
 * Both are read before first paint by a script in the document head, so the
 * page never renders in one language or theme and then swaps. This provider
 * picks up from what that script decided rather than assuming a default, which
 * is why the initial state is read from the DOM instead of from a constant.
 */
export function PreferencesProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [lang, setLangState] = useState<Lang>('ko')
  const [theme, setThemeState] = useState<Theme>('light')

  useEffect(() => {
    const root = document.documentElement
    setThemeState(root.classList.contains('dark') ? 'dark' : 'light')
    const stored = root.getAttribute('data-lang')
    if (stored === 'ko' || stored === 'en') setLangState(stored)
  }, [])

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    document.documentElement.setAttribute('lang', next)
    document.documentElement.setAttribute('data-lang', next)
    try {
      localStorage.setItem(LANG_KEY, next)
    } catch {
      // A blocked storage API is not a reason to refuse the switch.
    }
  }, [])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    document.documentElement.classList.toggle('dark', next === 'dark')
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {
      // As above.
    }
  }, [])

  const value = useMemo(
    () => ({ lang, setLang, theme, setTheme }),
    [lang, setLang, theme, setTheme],
  )

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences(): Preferences {
  const value = useContext(PreferencesContext)
  if (!value) throw new Error('usePreferences needs a PreferencesProvider above it.')
  return value
}

/**
 * The current language, plus the one-liner every page that renders prose was
 * declaring for itself.
 */
export function useBilingual(): {
  lang: Lang
  say: (text: Record<Lang, string>) => string
} {
  const { lang } = usePreferences()
  return { lang, say: (text) => text[lang] }
}

/**
 * Language switch.
 *
 * A two-state track with a moving thumb rather than a link that toggles: the
 * current language has to be readable at a glance, and both options have to be
 * visible, or somebody who cannot read the interface cannot find the control
 * that would fix that. `KOR · ENG` in full rather than a globe (which reads as
 * region or currency) or `한/A` (asymmetric, and 한 is a character, not a
 * language name).
 *
 * This switches interface chrome only. Transcript content stays in the language
 * it was spoken in, because a participant's words are the evidence.
 */
export function LangSwitch() {
  const { lang, setLang } = usePreferences()
  return (
    <div
      role="group"
      aria-label="Interface language"
      className="relative flex rounded-full border border-[var(--line)] bg-[var(--panel)] p-[3px]"
    >
      <span
        aria-hidden
        className="absolute inset-y-[3px] w-[calc(50%-3px)] rounded-full bg-[var(--signal)] transition-transform duration-[240ms] ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{ transform: `translateX(${lang === 'ko' ? '0%' : '100%'})` }}
      />
      {(['ko', 'en'] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setLang(option)}
          aria-pressed={lang === option}
          className="readout relative z-10 w-[46px] rounded-full py-1 text-[10.5px] font-medium tracking-[0.12em] transition-colors"
          style={{
            color: lang === option ? 'var(--on-signal)' : 'var(--muted)',
          }}
        >
          {option === 'ko' ? 'KOR' : 'ENG'}
        </button>
      ))}
    </div>
  )
}

/**
 * Theme switch.
 *
 * Persisted, because which theme is comfortable depends on the room rather than
 * on the visit. Shown as a track with a thumb so its state is legible without
 * having to decode whether an icon shows the current mode or the one it would
 * switch to — the classic ambiguity of a lone moon button.
 */
export function ThemeSwitch() {
  const { lang, theme, setTheme } = usePreferences()
  const dark = theme === 'dark'
  const label = t(dark ? 'toLight' : 'toDark', lang)

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={label}
      title={label}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      className="relative h-[26px] w-[46px] shrink-0 rounded-full border border-[var(--line)] bg-[var(--panel)] p-[3px] transition-colors"
    >
      <span
        aria-hidden
        className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[var(--signal)] transition-transform duration-[240ms] ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{ transform: `translateX(${dark ? '20px' : '0px'})` }}
      >
        <svg width={11} height={11} viewBox="0 0 12 12" aria-hidden>
          {dark ? (
            <path
              d="M9.4 7.6A4.2 4.2 0 0 1 4.4 2.6 4.2 4.2 0 1 0 9.4 7.6Z"
              fill="var(--on-signal)"
            />
          ) : (
            <>
              <circle cx={6} cy={6} r={2.5} fill="var(--on-signal)" />
              {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                <rect
                  key={deg}
                  x={5.6}
                  y={0.4}
                  width={0.8}
                  height={1.8}
                  rx={0.4}
                  fill="var(--on-signal)"
                  transform={`rotate(${deg} 6 6)`}
                />
              ))}
            </>
          )}
        </svg>
      </span>
    </button>
  )
}
