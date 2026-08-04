import { readFileSync } from 'node:fs'

/**
 * Minimal `.env` reader for the generator scripts.
 *
 * Node loads `.env` natively only behind a flag that also changes how the file
 * is parsed, and the alternative is a dependency for six lines. Existing
 * environment variables win, so `OPENAI_API_KEY=… npm run fixtures` overrides
 * the file.
 *
 * Nothing in `app/` or `lib/` uses this: Next loads `.env.local` itself, and
 * the key is only ever read server-side.
 */
export function loadDotEnv(path: string): void {
  let contents: string
  try {
    contents = readFileSync(path, 'utf8')
  } catch {
    return
  }
  for (const line of contents.split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line)
    if (!match) continue
    const value = match[2].trim().replace(/^["']|["']$/g, '')
    if (!process.env[match[1]]) process.env[match[1]] = value
  }
}

/**
 * Loads `.env` and stops with a usable message when the key is missing.
 * Both generators need a key and neither can do anything useful without one.
 */
export function requireOpenAiKey(root: string): void {
  loadDotEnv(`${root}/.env`)
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set. Put it in .env or the environment.')
    process.exit(1)
  }
}
