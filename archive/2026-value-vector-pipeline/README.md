# Archive — 2026 Value Vector Pipeline (v1)

Archived 2026-07-30. This directory holds the **first generation** of
valueConstellation: a Python research pipeline that extracted 19-dimensional
signed Schwartz value vectors from a Korean multi-stakeholder policy transcript,
plus the React/Vite viewer and Node prototypes built on top of it.

This work is **frozen**. The project has pivoted to a new concept (see the repo
root `README.md`). Nothing here is on the active path, but it is kept because the
measurement findings and the prototype concepts remain useful reference.

## What is in here

| Path | What it was |
|---|---|
| `scripts/` | Python research scripts: model probes, transcript → argument units → translation → value extraction, PCA/MDS projection, plotting |
| `results/model_probes/` | Synthetic probe outputs comparing candidate value-extraction models |
| `results/policy_discussion/` | Real transcript outputs (`first_topic_*`, `full_argument_*`) incl. the static Plotly MDS map |
| `data/` | Source transcript workbook and samples |
| `frontend/` | React 18 + TypeScript + Tailwind + Vite viewer (Reference Map / Interactive tabs) |
| `prototypes/` | Five standalone Node `server.mjs` concept prototypes |
| `MODEL_SELECTION.md` | Model comparison notes |

## Findings worth carrying forward

These are the substantive results of v1 — the reason the archive exists.

**Value-extraction model selection**

- `nharrel/Valuesnet_DeBERTa_v3` saturates value dimensions and scores neutral
  sentences highly. Its raw outputs are not usable as comparable value
  intensities.
- `VictorYeste/human-value-detection-deberta-baseline` was the best presence
  extractor found: 19 refined Schwartz value presence probabilities, text-only.
- `VictorYeste/deberta-based-human-value-stance-detection` requires
  `sentence + value name` and returns attained/constrained. It works, but is
  **unstable on negation and anti-value cases** — `anti_tradition` and
  `anti_conformity` were wrongly read as strongly attained. Direction from this
  model is a noisy suggestion, not ground truth.
- `valueeval24-hierocles-of-alexandria` is the closest public model for
  ValueEval-style attained/constrained labels but was too heavy for fast CPU
  iteration; its 0.10.0 API change was never fully absorbed.

**Pipeline / measurement lessons**

- Korean text fed directly to these public models is unreliable. English
  translation first is required, and `Helsinki-NLP/opus-mt-ko-en` was not good
  enough for research interpretation — OpenAI translation or hand review was.
- **Argument-level units** beat both full turns and single sentences as the unit
  of analysis. Adjacent Korean sentences forming one policy claim (claim +
  reasons + implications) should stay together.
- Cluster in the original 19D value space, never on t-SNE/UMAP coordinates.
  Metric MDS was the best 2D layout; PCA when interpretable axes matter;
  t-SNE/UMAP exploratory only.
- The `0.20` active-value threshold was never calibrated. Calibrating it (and
  comparing `0.20` / `0.30` / `0.40` against hand labels) was the open task when
  this line was archived.
- Keep `support_*` and `constraint_*` separate. A constrained value is not a
  missing value.

**The unfinished task at freeze time**

Hand-label `full_argument_calibration_seed_sample.csv`, then compare thresholds
and direction-error rates. If the new concept ever needs calibrated value
dimensions, this is where to resume.

## Running the archived code

The formulas v1 used:

```text
raw_signed_i  = presence_i * (P(attained_i) - P(constrained_i))
support_i     = max(0, raw_signed_i)
constraint_i  = max(0, -raw_signed_i)
```

Python (conda env `valueconstellation-valuesnet`), from the repo root:

```bash
conda run -n valueconstellation-valuesnet \
  python archive/2026-value-vector-pipeline/scripts/victoryeste_cascade_probe.py
```

Note that scripts resolve paths relative to the old repo root, so most will need
`--input` / `--output` adjusted or need to be run with the archive directory as
the working directory. They are not maintained.

Frontend and prototypes:

```bash
cd archive/2026-value-vector-pipeline/frontend && npm install && npm run dev
node archive/2026-value-vector-pipeline/prototypes/absent-stakeholder-blindspot/server.mjs
```

Prototypes read `results/policy_discussion/` with paths relative to the old root
and will need adjustment.

## Prototype concepts (five directions explored)

| Directory | Concept |
|---|---|
| `absent-stakeholder-blindspot/` | Empty-chair detection — whose interests are unrepresented in the discussion |
| `live-tension-constellation/` | Real-time value-tension graph overlay |
| `contextual-value-tensions/` | Context-aware tension explorer |
| `value-collision-story/` | Narrative framing of value collisions |
| `value-minority-checkin/` | Surfacing value positions held by a minority of participants |

`absent-stakeholder-blindspot/` was the most developed. All called OpenAI
`gpt-5.4-mini` with hardcoded Korean fallbacks when no API key was present.
