# Repository Guidelines

## Project Shape

Value Constellation maps where participants in a meeting stand relative to each
other, from the transcript. One Next.js 16 app, TypeScript throughout.

```text
app/          `/` explains, `/new` takes a transcript, `/studio` works,
              `/how-it-works` is the reference
lib/          all logic — no React, no Node-only imports
components/   presentation; components/landing/ is overview-only
data/         example transcripts, precomputed fixture
docs/         generated assets
scripts/      one-off generators, run with node's native type stripping
archive/      frozen v1 Python pipeline — do not extend
```

Keep logic in `lib/` and components thin. `lib/` runs unchanged in the browser,
in the API route, in the test runner and in `scripts/`, which is what lets the
composer preview a transcript with the exact parser the server will use. Do not
introduce a second, looser implementation of something `lib/` already does.

Add directories only when duplication becomes real.

## Common Commands

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build; also typechecks
npm test           # node --test over lib/*.test.ts
npm run typecheck  # tsc --noEmit
npm run hero       # redraw docs/hero.svg after changing map geometry
npm run fixtures   # rebuild the examples through the pipeline (costs money)
```

Node 22.6+ is required for native type stripping. `OPENAI_API_KEY` goes in
`.env.local` and is read server-side only — never prefix it with `NEXT_PUBLIC_`.

## Coding Style

- TypeScript, 2-space indentation, no semicolons, single quotes.
- `camelCase` for values and functions, `PascalCase` for types and components,
  `UPPER_CASE` for module constants.
- Comments explain why a decision was made, especially where the obvious
  implementation would be wrong. Do not narrate what the code already says.
- Interface strings belong in `lib/i18n.ts`, in both languages, `title` hints
  included. Transcript content is never translated.
- Every figure on screen gets a plain-language name and one line saying how to
  read it, and the verdict is stated before the arithmetic behind it.
- The mono face carries no Hangul: use it for digits and Latin identifiers only.
  That applies inside a value too — put `readout` on the digits, not on a string
  that may contain a participant's name.
- 12px is the smallest text on either page. Glyph marks — a disclosure
  triangle, an axis arrow — may be smaller; anything a reader has to read may
  not.
- Colour is reserved for speaker identity. Chrome is ink on paper.

## Testing

`npm test` runs node's built-in runner over `lib/*.test.ts`. Tests must not call
a model or hit the network.

Every case in the suite is a transcript format or failure mode observed in real
data rather than an invented example — the timestamp, moderator and
speaker-header parser cases each shipped as a bug that corrupted attribution.
When fixing a defect in parsing, projection, regions or distances, add the input
that produced it.

The properties worth pinning are the ones that break silently: PCA linearity,
rejection of non-finite input, region coverage, the degenerate cases where a
divisor can be zero, and that every layout of a meeting reports the same trust
figures — the default one is fitted to separate speakers and must not be able to
grade itself on having done so.

## Git And Security

- Conventional Commits, imperative mood, lower-case subject.
- The body explains what was wrong and why the change is right, not what the
  diff shows. Long bodies are normal here and preferred to terse ones.
- One coherent change per commit. Split a refactor from the behaviour change it
  enables when both can stand alone.
- Do not commit secrets, API keys, private transcripts, generated build output,
  `node_modules/`, or model caches.
