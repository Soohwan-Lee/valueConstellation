<div align="center">

<img src="docs/mark.svg" alt="" width="72" height="72">

# Value Constellation

**Paste a meeting transcript. See where each participant actually stands.**

[![License](https://img.shields.io/badge/license-MIT-black)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-black)](https://www.typescriptlang.org)
[![Status](https://img.shields.io/badge/status-research%20prototype-black)](#status)

<img src="docs/hero.svg" alt="Four participants in a depot siting meeting, mapped from what they said, with the measured gap from Dana to each of the others" width="860">

<sub>Real output from the transcript in <code>data/hero.ts</code>, drawn by the same code as the app (<code>npm run hero</code>).</sub>

</div>

---

Most transcript tools plot sentences and leave speaker identity in a side panel.
This one asks a different question:

> Given everything these people said, **how far apart are they?**

A participant is a position with a region around it, a one-sentence account of what
they argued, and the statements that account was read from. Every coordinate traces
back to a verbatim line. And when the map is not evidence, it says so on itself
rather than letting a confident-looking picture speak — the figure it reports is
how often it can name the speaker of a statement it was not shown, against what
guessing would get.

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

Needs **Node 22.6+** and an OpenAI API key. The site opens on a live example with
nothing to configure, and there is a sample transcript one click away if you want
to run the pipeline without one of your own.

| Route | What it is |
|---|---|
| `/` | Overview — the four examples as a gallery, what each mark means, how a region is decided, limits |
| `/new` | Paste a transcript, with live speaker preview and the recognised formats |
| `/studio` | The tool — console rail, map, inspector |
| `/how-it-works` | Reference — models, projections, every threshold, what happens to a pasted transcript |

## Reading the map

| Mark | Means |
|---|---|
| **Dot** | One statement. Click it for the verbatim line. |
| **Marker** | A participant, at the average of everything they said. Bigger means more statements behind it. |
| **Region** | The ground their statements cover. Two separate shapes means two separate positions, and the gap between them is ground nobody stood on. |
| **Measure line** | The gap between two people, as a share of the widest gap on that map. Select a participant to draw them. |
| **Dashed marker** | Fewer than three statements. Not yet a position. |
| **Axes** | The two directions the map opens along, named from the statements at each end. Not on MDS, whose orientation is arbitrary. |

Distances are always relative. Projected units mean nothing across two maps, so
nothing in the interface ever reports one.

### How a region decides its shape

The one mark whose outline comes from a decision rather than from the data
directly — so the decision is published rather than tuned.

1. For each statement, measure the distance to the nearest other statement **by
   the same person**. Pool those across everybody and take the **median**. That
   is the map's **resolution**: two statements closer together than that are not
   distinguishable positions.
2. Each statement claims the ground within one resolution of itself.
3. The outline of everything that overlaps is the region.

Four consequences, all checkable against the picture:

- A statement with nothing near it draws a circle of exactly one resolution.
- Statements within about 2.6 resolutions merge; further apart, they stay separate.
- Distances to *other people's* statements are excluded. Two people saying
  near-identical things is common, and counting those halves the figure — at which
  point every region shatters into four or five fragments. On the examples the
  difference is roughly 2×.
- The figure is **pooled into one number** rather than kept per speaker, so two
  regions are drawn at one scale and can be compared. Per speaker it would not be
  an estimate at all: three statements give two or three distances to take a median
  of, and that figure swung by 3× between speakers in the same meeting.

There is nothing to tune. No number in it was chosen because the picture looked
better with it, which is what makes the shape explainable to somebody who
disagrees with what it says about them. The usual covariance ellipse is not used:
an ellipse covers any set of points with one smooth oval, so somebody who argued
from two separate positions is drawn as having occupied the empty ground between.

The overview page shows the three steps being computed, by the same functions the
map calls.

## How much to trust a map

**Hand the map 100 statements with the names removed. How many land nearest the
person who actually said them?**

That is the figure under every map. It is computed leave-one-out — each statement
is scored against centroids rebuilt without it — and printed beside what guessing
would get, because chance moves with the size of the room: 50% is excellent with
four participants and a coin toss with two.

| Result | What the map says |
|---|---|
| ≥ 2× chance and ≥ 55% | Tells the participants apart clearly |
| > chance + 10 points | Separates them, but not sharply |
| below that | **Cannot** tell them apart — usually one meeting covering several agenda items |
| fewer than 6 statements per person | Declines to judge, and says how little it had |

That last row exists because the figure cannot otherwise distinguish *these people
did not differ* from *there was not enough of them to tell*, and those need
opposite advice. Leave-one-out removes 1/(n−1) of what builds a centroid, so at
three statements each held-out point shifts its own speaker's centre by half that
speaker's spread. Measured directly: a 9-statement transcript on a single agenda
item scored 11% against 33% chance. Telling that reader to narrow their agenda
would have been the wrong instruction — their meeting was short, not unfocused.

Both this and the separation ratio are measured **in embedding space, never on the
projected coordinates**, and all three layouts report identical numbers — pinned by
a test. The default layout is fitted to push the speakers apart, so measuring "the
speakers are far apart" on that picture would be grading its own homework. When
this was measured on the projection, the figures came out more than twice as high.

### Why the second figure is not a grade

Under the layout switcher sits how much of the difference survived the flattening.
For **Topics** (PCA) that runs 17–22%, which looks alarming and is not a verdict on
the map. PCA maximises variance among *all statements*, and most of a sentence
embedding is topic and phrasing — so what PCA works hardest to keep is not what
this map is for. The **People** layout fits the plane to the speaker centroids
instead and keeps **76–100%** of the between-speaker difference on the same
transcripts. With three or fewer participants that figure is arithmetic rather
than evidence — three points always lie in a plane exactly — and is marked as such.

## The built-in examples

Four meetings, each producing a different shape. All four run through the real
pipeline; none is a picture drawn in advance. Rebuild with `npm run fixtures`.

| Example | Agenda | Statements | Traced back | Chance | What it shows |
|---|---|---:|---:|---:|---|
| One question, four positions | Where to site a renewable energy plant | 25 | **64%** | 25% | Four grounds, wide spread, no clustering — and two regions that come apart where somebody changed their kind of reason |
| Same yes, different reasons | Whether to rebuild the city hall | 22 | **82%** | 33% | A unanimous vote hiding three positions |
| Two people, two worlds | Safety on the primary school route | 22 | **86%** | 50% | The sharpest split of the four, from a room of two |
| When the map fails | Parking, school meals and library hours at once | 21 | **5%** | 33% | Three agenda items; every average collapses to the middle and the regions scatter |

The fourth is included **because** it fails, and it fails convincingly: 5% against
33% chance is *worse than guessing*. A reader should meet that case here, where the
map states it, rather than first on their own transcript.

Writing them was itself the finding. The first draft of the consensus example could
not tell its three speakers apart at all, because each had been given several
distinct sub-arguments — a rich range scatters somebody's own statements and buries
the difference between them and everybody else. Rewriting it so each speaker stays
inside one vocabulary, drawn from a genuinely different world — legal liability,
cost recovery, and what happens at the service counter — is what took it to 82%.

## What testing on real data showed

A 57-minute five-party political debate (105 turns) is the honest test case, and
the result is a caution rather than a success.

**All five parties landed on top of each other.** Centroids fell within 0.17 of one
another while each party's own spread was 0.18–0.26 — statements scattered wider
than the speakers sat apart, and every average landed in the middle.

In raw text embeddings, **topic dominates speaker identity**. Each party discussed
every sub-topic, so averaging across all of them returns roughly the topic centroid
for everybody.

The practical consequence: **one map wants one question.** A meeting covering
several agenda items needs a map per item. Per-speaker averaging over heterogeneous
topics is a real limitation of the method, not a bug to tune away.

The People layout is a partial answer, not a solution. Fitting the plane to the
speaker centroids recovers whatever separates them from the directions PCA spends
on topic, which is why it keeps 76–100% where PCA keeps 17–22%. But it can only
project a difference that is there: on the `mixed` example it keeps 100% of the
between-speaker variance and still traces back only 5% of statements, because the
speakers genuinely do not differ once three agendas are averaged together. Making
speaker identity separable in the first place — rather than relying on raw
embedding distance — remains the open research problem here.

## How it is built

```text
transcript
  → speaker attribution         rule-based, six formats, no model call
  → argument-unit segmentation  gpt-5.4-mini, 15 turns per call, 8 in flight
  → translation repair          any Korean unit segmentation left untranslated
  → speaker names               each name rendered in the other language
  → embedding                   text-embedding-3-small, 1536d
  → centroid + spread           per speaker, in embedding space
  → attribution + separation    leave-one-out, in embedding space, before any layout
  → People / PCA / metric MDS   flattened to 2D, all three computed
  → axis naming                 from the statements at each end, not for MDS
  → speaker summaries           one call covering everybody, anchored to statement ids
  → map
```

Segmentation splits speech into argument units — a claim never separates from its
reason — rather than into sentences. Units whose text does not occur in the source
transcript are dropped and counted, because a paraphrase would silently corrupt
every downstream coordinate.

Centroids are computed in embedding space and then projected, never averaged from
projected coordinates. The two agree only for a linear map, which is why the
default layout is linear; MDS has no out-of-sample extension, so its centroids are
embedded jointly with the statements.

**Three layouts, one set of statements.** *People* fits the plane to the speaker
centroids, weighted by √n so somebody who spoke three times does not steer it as
hard as somebody who spoke forty — this is the default, because the question the
tool exists for is who differs from whom. *Topics* (PCA) fits it to the statements,
so the axes describe what the room argued about. *Distance* (metric MDS on cosine
distance) preserves pairwise distance instead of finding directions at all, and so
gets no axis names — rotate an MDS picture and nothing is lost.

**Per-speaker summaries** are read from the transcript, not from the coordinates,
so they say the same thing whichever layout is on screen. One call covers every
participant at once rather than one call each: summarised in isolation the results
come back interchangeable, and a map whose whole claim is that these people differ
cannot hand out swappable descriptions of them. Each summary carries the ids of the
statements it rests on, marked in the inspector, and an id pointing at a statement
that speaker did not make is dropped rather than shown.

`/how-it-works` has the rest: both projections, every threshold with the value it
uses, and what happens to a pasted transcript.

## Design commitments

<details>
<summary>Rules for not being confidently wrong about people</summary>

- **A centroid never travels alone.** Every position carries its statement count
  and spread. One inferred from two statements is drawn differently from one
  inferred from forty, and below three it is marked provisional.
- **Regions are built from the statements, not fitted to them.** See above.
- **Nothing on the map is tuned.** If a shape needs fixing, change what is
  measured rather than adding a multiplier.
- **A map that shows nothing says so.** When the statements cannot be traced back
  to their speakers better than guessing, the map states that instead of letting
  the picture imply otherwise; when there were too few statements to tell, it
  states *that* rather than guessing at a cause. A single-speaker transcript is
  refused outright, before it costs anything to segment or embed.
- **A layout may not grade itself.** Both trust figures are computed in embedding
  space before any projection, so all three layouts report identical numbers. How
  far apart a layout draws people and how far apart they are are different
  questions, and the first cannot answer the second.
- **A participant who was in the room is accounted for.** Somebody who said
  nothing but "네, 맞습니다" is not on the map, and is named underneath it. A map
  that quietly drops a person claims a meeting had fewer people in it than it did.
- **A summary you cannot check is worse than none.** Every per-speaker summary
  carries the statements it was read from, and they are marked in the list.
- **Say what the number means, not what it is called.** No variance, no
  saturation, no explained-variance ratio in front of somebody trying to
  understand a meeting.
- **Assent is counted but not positioned.** "네, 맞습니다" is not a location.
  Assent and procedural turns are excluded from positions and reported
  separately: the gap between how much somebody agreed and where they actually
  sit is worth seeing.
- **Every coordinate traces back to words.** Click a point for the statement
  behind it; click a participant for everything they said, original and
  translation side by side rather than one replacing the other.
- **Colour means a person.** The eight speaker hues are the only saturated colour
  in the interface. Buttons, selection and focus are ink on paper, and the one
  section that changes gravity does it with value rather than hue.
- **The language toggle reaches the names.** Participant names are rendered in
  both scripts, because they are the one thing on a map you have to be able to
  read. A romanisation, not a translation — and a role like 사회자 becomes
  Facilitator because that is a job, not a name.
- **Eight speakers is the colour limit.** Past that, hue stops separating people
  under common colour-vision deficiencies, so marker shape takes over.
- **A transcript is other people's words.** It is sent only to build the map,
  never stored, and never put in a URL.

</details>

## Project layout

```text
app/
  page.tsx                 overview: example gallery, reading guide, region rule, limits
  new/page.tsx             the composer, on its own page
  studio/page.tsx          the tool: console rail, plate, inspector
  how-it-works/page.tsx    reference: models, thresholds, data handling
  api/analyze/route.ts     request handling only
lib/
  analyze.ts               the pipeline, shared by the route and the fixture builder
  parse.ts                 speaker attribution, six transcript formats
  segment.ts               argument-unit schema, prompt, fabrication filter
  project.ts               PCA (power iteration), classical MDS, centroid fitting
  aggregate.ts             centroids, spread, attribution, separation
  models.ts                the two model names, with no other dependencies
  blob.ts                  map resolution, and regions as its contours
  axes.ts                  naming the two axes from their extremes
  summaries.ts             what each participant argued, anchored to statement ids
  translate.ts             filling in translations segmentation missed
  speakers.ts              each participant name in both languages
  pairs.ts                 gaps between participants, in map units
  frame.ts                 the drawing frame, shared with the hero renderer
  colors.ts                speaker colour and shape assignment
  i18n.ts                  every interface string, KOR and ENG
  landing.ts / how.ts      overview and reference prose, KOR and ENG
components/                ConstellationMap, Composer, MapControls, DetailPanel,
                           Chrome, SiteHeader, Preferences, Reveal
  landing/                 ScenarioCard, MarkFigure, RegionSteps
  studio/                  SourceMenu, GuideButton, MethodFooter
scripts/                   fixture builders and the hero renderer
archive/                   frozen v1 value-vector research pipeline
```

## Scripts

| Command | Does | Costs money |
|---|---|:---:|
| `npm run dev` | Dev server on :3000 | |
| `npm run build` | Production build; also typechecks | |
| `npm test` | Parser, projection, region, distance and fixture suites | |
| `npm run typecheck` | `tsc --noEmit` | |
| `npm run fixtures` | Rebuild the four examples through the real pipeline | ● |
| `npm run hero:data` | Analyse the English transcript behind the README image | ● |
| `npm run hero` | Redraw `docs/hero.svg` from that analysis | |

Tests never call a model or hit the network. Every case in them is a format or
failure mode observed in real data rather than an invented example.

## Deploying

Works on Vercel with no configuration beyond one environment variable.

| Key | Value | Environments |
|---|---|---|
| `OPENAI_API_KEY` | `sk-…` | Production, Preview, Development |

Read server-side only. **Never prefix it with `NEXT_PUBLIC_`** — that ships the key
to the browser. Without it the site still runs and every example still renders; the
analyse endpoint returns 503 and says so in the reader's language.

The analyse route declares `maxDuration = 60`, and transcripts are capped at
120,000 characters so a paste cannot outlive the function.

## Status

Early research prototype. The pipeline runs end to end on real transcripts.

**Working** — Korean and English parsing across six transcript formats including
transcription-tool exports and Korean official minutes; argument segmentation with
a fabrication filter; participant centroids with regions; PCA and MDS with an
animated transition between them; zoom and pan; per-participant filtering; measured
gaps; LLM-named PCA axes; per-statement traceback to source text; a composer that
previews what the parser found before spending the request; an overview built as
an example gallery; a reference page; light and dark themes; KOR/ENG throughout
including participant names, both persisted.

**Not built yet** — transcript ↔ map linking, participant position correction,
value-dimension axes.

## Previous generation

`archive/2026-value-vector-pipeline/` holds the first version: a Python pipeline
extracting 19-dimensional signed Schwartz value vectors from Korean policy
transcripts. It is frozen, but its findings shaped this one — see the archive
README, particularly on stance-direction instability under negation, and on
argument units being the right unit of analysis.

## License

[MIT](LICENSE) © SoohwanLee
