import type { Metadata } from 'next'
import { IBM_Plex_Mono, IBM_Plex_Sans_KR } from 'next/font/google'
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
  weight: ['400', '500', '600'],
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
  title: 'Value Constellation',
  description:
    'Map where participants stand — and what they said — from a meeting transcript.',
}

/**
 * Applies the stored theme before first paint. Without this the page renders
 * light and then flips, which on a dark-theme instrument is a flash of white
 * straight into the reader's eyes.
 */
const THEME_SCRIPT = `try{var t=localStorage.getItem('vc-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className={`${plexKr.variable} ${plexMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
