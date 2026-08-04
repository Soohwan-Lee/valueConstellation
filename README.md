<div align="center">

# Value Constellation

**Paste a meeting transcript. See where each participant actually stands.**

Speakers are mapped as first-class marks — a position, a region, and the words behind both.

[![License](https://img.shields.io/badge/license-MIT-black)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-black)](https://www.typescriptlang.org)
[![Status](https://img.shields.io/badge/status-research%20prototype-black)](#status)

<img src="docs/hero.svg" alt="Four participants mapped from a transcript, with the measured gap from one of them to each of the others" width="820">

<sub>Generated from a built-in example by `npm run hero` — same code path as the app.</sub>

</div>

---

Most transcript tools plot utterances and leave speaker identity in a side panel.
This one asks a different question: **given everything these people said, how far
apart are they?** A speaker is a position with a spread, every coordinate traces
back to a verbatim line, and the map states plainly when it is not evidence.

Korean-first, English throughout. Built for facilitators and deliberation
researchers who need to look at a room and see the shape of the disagreement.

## Quick start

```bash
git clone https://github.com/Soohwan-Lee/valueConstellation.git
cd valueConstellation
npm install
cp .env.example .env.local     # add your OPENAI_API_KEY
npm run dev                    # http://localhost:3000
```

Requires **Node 22.6+** (the test runner strips types natively) and an OpenAI API
key. The app opens on a finished example, so there is nothing to configure before
seeing what it does — and a sample transcript is one click away in the composer if
you want to run the pipeline without one of your own.

## How it works

```text
transcript
  → speaker attribution         rule-based, six formats, no model call
  → argument-unit segmentation  gpt-5.4-mini, 15 turns per call, 8 in flight
  → embedding                   text-embedding-3-small
  → centroid + spread           per speaker, in embedding space
  → PCA / metric MDS            projected to 2D
  → map
```

Segmentation splits speech into argument units — a claim never separates from its
reason — rather than into sentences. Units whose text does not occur in the source
transcript are dropped and counted, because a paraphrase would silently corrupt
every downstream coordinate.

Centroids are computed in embedding space and then projected, never averaged from
projected coordinates. The two agree only for a linear map, which is why PCA is the
default; MDS has no out-of-sample extension, so its centroids are embedded jointly
with the utterances.

## Reading the map

| Mark | Means |
|---|---|
| **Marker** | The average position of everything that speaker said. |
| **Region** | Where their statements actually fell. Two lobes means they argued from two separate positions. |
| **Dot** | One statement. Click it for the verbatim line. |
| **Measure line** | The gap between two people, as a share of the widest gap on that map. Select a participant to draw them. |
| **Dashed marker** | Fewer than three statements. The position is provisional. |
| **Axes** | Deliberately unlabelled. The directions carry no fixed meaning; only relative distance does. |

Distances are always relative. Projected units mean nothing across two maps, so
nothing on the page ever reports one.

## What testing on real data showed

A 57-minute five-party political debate (105 turns) is the honest test case, and
the result is a caution rather than a success.

**All five parties landed on top of each other.** Centroids fell within 0.17 of one
another while each party's own spread was 0.18–0.26 — every speaker's statements
scattered wider than the speakers sat apart. Explained variance was 10.8%.

Measuring the ratio directly — mean between-speaker distance over mean
within-speaker spread — gives **0.38**. In raw text embeddings, **topic dominates
speaker identity**: each party discussed every sub-topic, so averaging across all of
them returns roughly the topic centroid for everybody.

The tool now reports that ratio as `separation` and says so above the map when it
falls below 1, rather than presenting a meaningless layout as a finding. The three
built-in examples score 1.68–3.37; that debate scores 0.46.

The practical consequence: **one map wants one question.** A meeting covering
several agenda items needs a map per item. Per-speaker averaging over heterogeneous
topics is a real limitation of the method, not a bug to tune away. Making speaker
identity separable — rather than relying on raw embedding distance — is the open
research problem here.

## Design commitments

<details>
<summary>Nine rules for not being confidently wrong about people</summary>

- **A centroid never travels alone.** Every speaker position carries its statement
  count and spread. A position inferred from two statements is drawn differently
  from one inferred from forty, and below three it is marked provisional.
- **Regions are built from the statements, not fitted to them.** A covariance
  ellipse draws a smooth oval over points that are rarely oval, and asserts the
  speaker occupied the empty ground between two separate framings. The region is
  the silhouette of a disk around each statement, so it can be concave.
- **Explained variance is shown, not hidden.** A two-component projection looks like
  a confident picture of who clusters together no matter how little variance it
  captured. On real transcripts this has run as low as 37%.
- **A map that shows nothing says so.** Below six statements the explained-variance
  figure is arithmetic rather than evidence — n points always fit n−1 dimensions —
  and below a separation of 1 the centroids are not distinguishing anybody. Both are
  stated on the map. A single-speaker transcript is refused outright.
- **Assent is counted but not positioned.** "네, 맞습니다" is not a location. Assent
  and procedural turns are excluded from positions and reported separately: the gap
  between how much someone agreed and where they actually sit is worth seeing.
- **Every coordinate traces back to words.** Click a point for the statement behind
  it; click a participant for everything they said, original and translation side by
  side rather than one replacing the other.
- **Colour means a person.** The eight speaker hues are the only saturated colour in
  the interface. Buttons, selection and focus are ink on paper, because a
  categorical palette cannot be read against chrome that competes with it.
- **Eight speakers is the colour limit.** Past that, hue stops separating people
  under common colour-vision deficiencies, so marker shape takes over.
- **Nothing claims precision it does not have.** No progress bar for a server that
  reports no progress, no raw projected coordinates in the readouts, no absolute
  distances that invite comparison between two maps.

</details>

## Project layout

```text
app/
  page.tsx                 console rail, plate, composer
  api/analyze/route.ts     segment → embed → project
lib/
  parse.ts                 speaker attribution, six transcript formats
  segment.ts               argument-unit schema, prompt, hallucination filter
  project.ts               PCA (power iteration) and classical MDS
  aggregate.ts             centroids, spread, saturation, separation
  blob.ts                  speaker regions as a union of disks
  pairs.ts                 gaps between participants, in map units
  frame.ts                 the drawing frame, shared with the hero renderer
  colors.ts                speaker colour and shape assignment
  i18n.ts                  every interface string, KOR and ENG
components/                ConstellationMap, MapControls, DetailPanel,
                           Chrome, HowToRead
scripts/render-hero.ts     regenerates docs/hero.svg
archive/                   frozen v1 value-vector research pipeline
```

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server on :3000 |
| `npm run build` | Production build |
| `npm test` | Parser, projection, region and distance suites — no model calls |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run hero` | Regenerate `docs/hero.svg` from the committed fixture |

Tests never call a model. Every case in them is a format or failure mode observed in
real data rather than an invented example.

## Deploying

Works on Vercel with no configuration beyond one environment variable:

| Key | Value | Environments |
|---|---|---|
| `OPENAI_API_KEY` | `sk-…` | Production, Preview, Development |

It is read server-side only. **Never prefix it with `NEXT_PUBLIC_`** — that ships
the key to the browser. Without it the app still runs and the examples still render;
the analyse endpoint returns 503 and says so in the reader's language.

The analyse route declares `maxDuration = 60`, and transcripts are capped at 120,000
characters so a paste cannot outlive the function.

## Status

Early research prototype, and the pipeline runs end to end on real transcripts.

**Working** — Korean and English transcript parsing across six formats including
transcription-tool exports and Korean official minutes; argument segmentation with
hallucination filtering; speaker centroids with regions; PCA and MDS with animated
transition between them; zoom and pan; per-participant filtering; measured gaps
between participants; per-statement traceback to source text; light and dark themes;
KOR/ENG interface toggle.

**Not built yet** — transcript ↔ map linking, participant position correction,
value-dimension axes.

## Previous generation

`archive/2026-value-vector-pipeline/` holds the first version: a Python pipeline
extracting 19-dimensional signed Schwartz value vectors from Korean policy
transcripts. It is frozen, but its findings shaped this one — see the archive
README, particularly on stance-direction instability under negation, and on argument
units being the right unit of analysis.

## License

[MIT](LICENSE) © SoohwanLee
