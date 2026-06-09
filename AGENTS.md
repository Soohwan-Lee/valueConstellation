# Repository Guidelines

## Project Shape

Value Constellation is an early research prototype for turning deliberation claims into value-dimension vectors. Keep the repo simple:

- `scripts/`: standalone research and evaluation scripts.
- `results/`: generated CSV/JSON outputs, organized by experiment family.
- `data/`: local input data. Do not commit private or sensitive data.
- `frontend/` and `prototypes/`: UI experiments.
- Add `src/` and `tests/` only when shared reusable code and automated tests become worthwhile.

Prefer explicit scripts over broad abstractions until duplication becomes real.

## Common Commands

Use the conda environment:

```bash
conda activate valueconstellation-valuesnet
```

Run scripts through `conda run` when reproducibility matters:

```bash
conda run -n valueconstellation-valuesnet python scripts/victoryeste_cascade_probe.py
conda run -n valueconstellation-valuesnet python scripts/hierocles_probe.py --limit 4
conda run -n valueconstellation-valuesnet python scripts/policy_discussion_value_pipeline.py --start-time 00:50 --end-time 08:36
```

Project generated 19D vectors:

```bash
conda run -n valueconstellation-valuesnet python scripts/project_value_vectors.py --input results/policy_discussion/first_topic_argument_vectors.csv --output results/policy_discussion/first_topic_argument_projection_compare.csv --metadata-output results/policy_discussion/first_topic_argument_projection_compare_metadata.json --method all --label-with-openai
```

If rebuilding the environment:

```bash
python -m pip install transformers torch sentencepiece protobuf safetensors pandas tabulate openpyxl scikit-learn umap-learn valueeval24-hierocles-of-alexandria
```

## Research Notes

Current scoring formula:

```text
raw_signed_i = presence_i * (P(attained_i) - P(constrained_i))
support_i = max(0, raw_signed_i)
constraint_i = max(0, -raw_signed_i)
```

Current defaults and cautions:

- Do not use `nharrel/Valuesnet_DeBERTa_v3` as the main engine; it over-saturates many values.
- Prefer `VictorYeste/deberta-based-human-value-detection` for 19-value presence and `VictorYeste/deberta-based-human-value-stance-detection` for direction.
- `presence` is not support. A value can be present because it is being constrained or rejected.
- Translate Korean utterances to English before value inference. Set `OPENAI_API_KEY` in `.env` for reliable translation; the Helsinki fallback is for smoke tests only.
- For real transcripts, prefer `--unit argument`. Direction estimates still need hand calibration or LLM review.
- Keep 19D vectors as the measurement. Use MDS/PCA only as map layouts; cluster in original 19D space.
- Current active-value threshold `0.20` is exploratory. Compare `0.20`, `0.30`, and `0.40` against hand labels.

Current policy-discussion baseline:

- Source: `data/koreanPolicyMakingDiscussion.xlsx`
- Processed segment: `00:50~08:36`
- Main outputs: `results/policy_discussion/first_topic_argument_*`

## Coding Style

- Python 3.11+, PEP 8, 4-space indentation.
- Use `snake_case` for functions, variables, and filenames; `UPPER_CASE` for constants.
- Prefer `pathlib.Path`.
- Keep scripts readable, typed where practical, and self-contained.
- Do not download large models in default tests or commit model caches.

## Testing

No formal test suite is configured yet. Treat script execution as the smoke test and inspect generated files in `results/`.

When tests are added, use `pytest`, put them in `tests/`, and avoid large model downloads by default.

## Git And Security

- Use concise imperative commits, preferably Conventional Commits.
- PR notes should include purpose, changed workflows, commands run, and generated artifacts.
- Do not commit secrets, API keys, Hugging Face tokens, private research data, or large local caches.
