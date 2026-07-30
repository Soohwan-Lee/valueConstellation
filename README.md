# Value Constellation

Paste a multi-stakeholder meeting transcript and get a 2D map showing **where
each participant stands** — derived from what they actually said.

The distinguishing choice is that speakers are mapped as first-class marks, not
just their words. Existing transcript-mapping tools plot utterances and leave
speaker identity to a side panel; here a speaker is a position with a spread.

## Status

Early prototype. The pipeline runs end to end on real transcripts:

```text
transcript → speaker attribution → argument-unit segmentation (gpt-5.4-mini)
  → embedding (text-embedding-3-small) → speaker centroids + spread
  → PCA / metric MDS → SVG map
```

Working: Korean and English transcript parsing across five formats, argument
segmentation with hallucination filtering, speaker centroids with 1-SD spread
ellipses, PCA and MDS layouts, speaker filtering, per-utterance detail with
traceback to source text.

Not built yet: projection-transition animation, transcript↔map linking,
participant position correction, value-dimension axes.

## Running it

```bash
npm install
cp .env.example .env.local   # add your OPENAI_API_KEY
npm run dev                  # http://localhost:3000
```

`OPENAI_API_KEY` is read server-side only. On Vercel, set it in Project
Settings → Environment Variables. Never prefix it with `NEXT_PUBLIC_`.

There is a built-in sample transcript ("use sample") if you just want to see the
map.

## Design commitments

These exist because a map of people is easy to make confidently wrong.

- **A centroid never travels alone.** Every speaker position carries its
  utterance count and spread. A position inferred from two utterances is drawn
  differently from one inferred from forty, and below three it is marked
  provisional rather than rendered as fact.
- **Explained variance is shown, not hidden.** A two-component projection will
  look like a confident picture of who clusters together no matter how little of
  the original variance it captured. On real transcripts this has run as low as
  37%, so the number is displayed and flagged under 50%.
- **Centroids are computed in embedding space, then projected** — never averaged
  from projected coordinates. The two agree only for a linear map, which is why
  PCA is the default; MDS has no out-of-sample extension, so centroids are
  embedded jointly with the utterances.
- **Assent is counted but not positioned.** "네, 맞습니다" is not a location in
  value space. Agreement and procedural turns are excluded from positions and
  reported separately — the gap between how much someone assented and where they
  actually sit is itself worth seeing.
- **Every coordinate traces back to words.** Click any point for the verbatim
  utterance; click a speaker for everything they said.
- **Segmentation output is verified, not trusted.** A paraphrase would silently
  corrupt every downstream coordinate, so a unit's text must occur in the source
  transcript or it is dropped and counted.
- **Eight speakers is the colour limit.** Past that, hue stops distinguishing
  people under common colour-vision deficiencies, so marker shape takes over.

## Layout

```text
app/
  page.tsx              client shell: input, controls, map, detail
  api/analyze/route.ts  segment → embed → project
lib/
  parse.ts       speaker attribution (5 transcript formats)
  segment.ts     argument-unit schema, prompt, hallucination filter
  project.ts     PCA (power iteration) and classical MDS
  aggregate.ts   speaker centroids, covariance ellipses
  colors.ts      speaker colour/shape assignment
components/      ConstellationMap, MapControls, DetailPanel
archive/         frozen v1 value-vector research pipeline
```

## Previous generation

`archive/2026-value-vector-pipeline/` holds the first version: a Python pipeline
extracting 19-dimensional signed Schwartz value vectors from Korean policy
transcripts. It is frozen, but its findings shaped this one — see the archive
README, particularly on stance-direction instability under negation and on
argument units being the right unit of analysis.
