# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**valueConstellation** is an early research prototype for extracting value-dimension signals from multi-stakeholder deliberation text.

The current research target is to represent each utterance or claim as a value-based vector:

```text
presence_i = P(value_i present)
direction_i = P(attained_i) - P(constrained_i)
signed_value_i = presence_i * direction_i
```

Current lightweight working scores:

```text
raw_signed_i = presence_i * (P(attained_i) - P(constrained_i))
support_i = max(0, raw_signed_i)
constraint_i = max(0, -raw_signed_i)
```

For Korean stakeholder dialogue, the current prototype direction is:

```text
Korean utterance
→ claim-unit segmentation
→ English translation
→ 19-value presence extraction
→ attained/constrained estimation
→ signed value vector
→ project-specific calibration
```

## Current Model Findings

- `nharrel/Valuesnet_DeBERTa_v3` is not the main path. It saturates many value dimensions and gives high value scores to neutral sentences, so its raw outputs are not reliable as comparable value intensities.
- `VictorYeste/human-value-detection-deberta-baseline` is the preferred current presence extractor. It outputs 19 refined Schwartz value presence probabilities and is text-only.
- `VictorYeste/deberta-based-human-value-detection` is also a presence detector, used in the CLEF 2024 cascade subtask 1.
- `VictorYeste/deberta-based-human-value-stance-detection` is a separate stance detector. It requires `sentence + value name` input and outputs `attained` / `constrained`. It helps, but anti-value and negation cases are unstable.
- `scripts/victoryeste_cascade_probe.py` combines VictorYeste presence and stance into `support_01`, `constrain_01`, and signed `[-1, 1]` scores. It ran successfully on the current synthetic probes in the Windows conda environment.
- VictorYeste cascade results: neutral text goes near zero and `anti_security` is directionally plausible, but `anti_tradition` and `anti_conformity` are incorrectly treated as strongly attained. Treat direction as a noisy suggestion, not ground truth.
- `valueeval24-hierocles-of-alexandria` is the most direct public candidate for ValueEval-style attained/constrained labels, but it is heavy for quick Windows CPU iteration. The 0.10.0 package changed API, and the current script was partially updated to derive `values` from `labels`; the model run was interrupted before producing fresh results.
- Korean direct input is not reliable for these public models. Use English translation first.
- For real transcripts, use argument-level units rather than full turns or individual sentences when possible. The current `argument` mode asks OpenAI to keep adjacent Korean sentences together when they form one policy claim with reasons or implications. The old sentence/line-style mode is still available as `--unit claim`.
- `Helsinki-NLP/opus-mt-ko-en` is available as a local fallback, but its translation quality is not reliable enough for research interpretation. Prefer `OPENAI_API_KEY` with the OpenAI translation backend or manually reviewed translations.
- The 19 labels are refined Schwartz values from Schwartz et al. 2012. They can be aggregated to the original 10 Schwartz values and then projected to two higher-order axes.
- The `00:50~08:36` segment is the opening common-answer segment for the transcript's "second discussion topic", not an automatically detected first topic.

## Entry Points

- `scripts/valuesnet_probe.py`: probes `nharrel/Valuesnet_DeBERTa_v3`.
- `scripts/alternative_value_models_probe.py`: probes Schwartz, Moral Foundations, and VictorYeste ValueEval-style models.
- `scripts/hierocles_probe.py`: probes Hierocles attained/constrained outputs and writes raw plus summary CSVs.
- `scripts/victoryeste_cascade_probe.py`: probes VictorYeste presence + stance cascade and writes `results/victoryeste_cascade_raw.csv` plus `results/victoryeste_cascade_summary.csv`.
- `scripts/policy_discussion_value_pipeline.py`: reads `data/koreanPolicyMakingDiscussion.xlsx`, splits policy speech into claim units, translates, and writes raw plus wide 19-value vector CSVs.
- `scripts/project_value_vectors.py`: PCA-projects wide 19-value vector CSVs to 2D and optionally asks OpenAI to label axes/clusters.

Generated outputs live in `results/`.

## Commands

Use the existing conda environment:

```bash
conda activate valueconstellation-valuesnet
```

Run probes:

```bash
conda run -n valueconstellation-valuesnet python scripts/valuesnet_probe.py
conda run -n valueconstellation-valuesnet python scripts/alternative_value_models_probe.py
conda run -n valueconstellation-valuesnet python scripts/hierocles_probe.py
conda run -n valueconstellation-valuesnet python scripts/victoryeste_cascade_probe.py
conda run -n valueconstellation-valuesnet python scripts/policy_discussion_value_pipeline.py --start-time 00:50 --end-time 08:36
conda run -n valueconstellation-valuesnet python scripts/project_value_vectors.py --input results/policy_discussion/first_topic_argument_vectors.csv --output results/policy_discussion/first_topic_argument_projection_compare.csv --metadata-output results/policy_discussion/first_topic_argument_projection_compare_metadata.json --method all --label-with-openai
```

Use `--limit` on `hierocles_probe.py` for quick smoke tests:

```bash
conda run -n valueconstellation-valuesnet python scripts/hierocles_probe.py --limit 4
```

## Development Notes

- Keep scripts standalone until shared logic clearly emerges.
- Do not commit downloaded Hugging Face model caches.
- Do not commit `.omc/`, `.DS_Store`, `.env`, `*.mp3`, or `__pycache__/`.
- Treat generated CSVs in `results/` as small, reproducible research artifacts.
- Keep `results/model_probes/` for synthetic/model-comparison outputs and `results/policy_discussion/` for real transcript outputs.
- If adding automated tests later, avoid model downloads in default tests; use mocked logits or small cached sample outputs.

## Frontend Handoff Notes

Frontend work may start before the backend and research pipeline are final. Treat the UI as a client of an evolving value-vector backend, not as the owner of the analysis logic.

Recommended boundaries:

- Keep frontend application code separate from research scripts. If adding a web app, prefer a top-level `frontend/` or `app/` directory instead of mixing UI files into `scripts/`.
- Do not move or rewrite the existing Python research scripts just to support the UI. Add small backend adapter endpoints or export helpers when the UI needs data.
- Keep the 19D signed value vector as the canonical measurement. The 2D projection is a view/layout layer, not the source of truth.
- Do not cluster on t-SNE or UMAP coordinates. If the UI shows clusters, they should come from the original 19D value space or from backend-provided cluster assignments.
- Preserve both `support_*` and `constraint_*` information where available. A negative/constrained value is not the same thing as a missing value.
- Treat active-value thresholds such as `0.20`, `0.30`, and `0.40` as configurable UI/backend parameters, not hard-coded facts.
- Make room in the UI for manual review: editable argument text, editable cluster labels, visible top contributing values, and flags for uncertain direction/translation cases.
- For Korean transcript data, show the original Korean and English translation together when possible. Do not hide translation uncertainty.
- Avoid making the frontend depend directly on large model inference. Model execution should stay in Python/backend workflows unless explicitly changed.
- Avoid committing generated build outputs, package caches, local database files, API keys, or private transcript exports.

Useful frontend data concepts:

- `argument_id`: stable identifier for a claim or argument unit.
- `speaker`, `party`, `start_time`, `end_time`: transcript metadata for filtering and provenance.
- `argument_ko`, `argument_en`: original Korean and translated English text.
- `value_scores`: 19 signed values in `[-1, 1]`.
- `support_scores`, `constraint_scores`: non-negative per-value components, if exposed by the backend.
- `projection`: 2D coordinates for display, preferably metric MDS by default with PCA as an interpretable alternative.
- `cluster_id`, `cluster_label`: backend or user-editable cluster metadata.

When creating frontend mocks, use small fixtures derived from `results/policy_discussion/first_topic_argument_vectors.csv`, `first_topic_argument_active_values.csv`, and `first_topic_argument_projection_compare.csv`. Keep fixtures small and clearly marked as sample data.

## Current Resume Point

The current real-transcript experiment is in `results/policy_discussion/`.

- Source: `data/koreanPolicyMakingDiscussion.xlsx`.
- Processed segment: `00:50~08:36`, the opening common-answer segment for the transcript's "second discussion topic."
- Current best segmentation: `--unit argument`, not sentence-level `--unit claim`.
- Current model path: Korean argument unit -> OpenAI `gpt-5.4-mini` translation -> VictorYeste 19-value presence -> VictorYeste attained/constrained stance -> signed/support/constraint values.
- Current projection comparison: PCA, metric MDS, t-SNE, and UMAP are written to `first_topic_argument_projection_compare.csv`; metadata is in `first_topic_argument_projection_compare_metadata.json`.
- Current map recommendation: use the 19D vector as the actual measurement, use metric MDS as the default 2D layout candidate, keep PCA available when interpretable axes matter, and treat t-SNE/UMAP as exploratory only.
- Current cluster recommendation: cluster in original 19D value space and display cluster labels on the 2D map; do not cluster on t-SNE/UMAP coordinates.
- Current threshold: `0.20` is only an exploratory active-value cutoff. Calibrate it before using in the system.

Next session should start by reviewing `first_topic_argument_active_values.csv`, creating a 30-50 item hand-labeled calibration sheet, and comparing `0.20`, `0.30`, and `0.40` thresholds plus direction errors.
