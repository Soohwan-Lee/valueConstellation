import type { Metadata } from 'next'
import { IBM_Plex_Mono, IBM_Plex_Sans_KR } from 'next/font/google'
import { PreferencesProvider } from '@/components/Preferences'
import './globals.css'

/**
 * Typography.
 *
 * The interface is Korean-first, so the primary face has to carry Hangul as a
 * designed weight rather than as a system fallback — a Latin-only face means
 * every Korean line on the page is set in whatever the OS happens to ship, and
 * the two languages never look like the same document.
 *
 * Plex Mono is not decoration here: every number on the page is meant to be
 * compared against another number, and tabular figures in a face built to sit
 * beside the sans is what makes a column of counts readable at a glance.
 */
const plexKr = IBM_Plex_Sans_KR({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-plex-kr',
  display: 'swap',
  // Hangul arrives as several hundred unicode-range faces the browser fetches
  // only for the characters actually on screen. `subsets` governs preloading,
  // not coverage, and preloading that many files would spend the first-paint
  // budget on glyphs most visitors never render.
  preload: false,
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Value Constellation — 회의록에서 입장 지도로',
  description:
    'Map where participants stand — and what they said — from a meeting transcript.',
}

/**
 * Applies the stored theme and language before first paint.
 *
 * Without this the page renders light and in Korean and then flips, which on a
 * dark-theme instrument is a flash of white straight into the reader's eyes,
 * and for an English reader is a paragraph they cannot read appearing first.
 */
const BOOT = `try{
var t=localStorage.getItem('vc-theme');
if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark');
var l=localStorage.getItem('vc-lang');
if(l==='ko'||l==='en'){document.documentElement.setAttribute('lang',l);document.documentElement.setAttribute('data-lang',l)}
}catch(e){}`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="ko"
      data-lang="ko"
      className={`${plexKr.variable} ${plexMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      </head>
      <body>
        <PreferencesProvider>{children}</PreferencesProvider>
      </body>
    </html>
  )
}
