/**
 * Handing a transcript from the overview page to the studio.
 *
 * The overview has a working composer, so somebody can try the tool without
 * leaving the page they arrived on — but the map, the controls and the analysis
 * state all live in the studio, and duplicating them would mean two places
 * where a result can be shown differently.
 *
 * So the text travels and the analysis happens once, on the other side.
 * `sessionStorage` rather than the URL: a transcript is other people's words,
 * often minutes of a real meeting, and putting it in a query string writes it
 * into browser history, into the address bar, and into any server log that
 * sees the request. It is cleared as soon as it is read.
 */

const KEY = 'vc-pending-transcript'

/** Stores a transcript for the studio to pick up. Returns false if it could not. */
export function stageTranscript(text: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    sessionStorage.setItem(KEY, text)
    return true
  } catch {
    // Private browsing or a full quota. The caller falls back to sending the
    // reader to an empty composer rather than losing the paste silently.
    return false
  }
}

/** Reads and clears a staged transcript. */
export function takeStagedTranscript(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const text = sessionStorage.getItem(KEY)
    if (text) sessionStorage.removeItem(KEY)
    return text
  } catch {
    return null
  }
}
