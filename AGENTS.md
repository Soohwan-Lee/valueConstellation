# Repository Guidelines

## Project Structure & Module Organization

This repository is an early research prototype for Value Constellation. Keep the structure simple and explicit:

- `README.md`: project overview.
- `CLAUDE.md`: local agent/context notes for this repository.
- `scripts/`: standalone research or evaluation scripts, such as `scripts/valuesnet_probe.py`.
- `results/`: generated experiment outputs, such as CSV summaries.
- `LICENSE`: project license.

Add source modules only when shared logic emerges. Prefer `src/` for reusable Python code and `tests/` for automated tests once the prototype grows beyond standalone scripts.

Current script entry points:

- `scripts/valuesnet_probe.py`: ValuesNet DeBERTa probe.
- `scripts/alternative_value_models_probe.py`: Schwartz, Moral Foundations, and VictorYeste ValueEval-style probes.
- `scripts/hierocles_probe.py`: Hierocles attained/constrained probe.
- `scripts/victoryeste_cascade_probe.py`: VictorYeste presence + stance cascade that writes `support_01`, `constrain_01`, and signed `[-1, 1]` value scores.
- `scripts/policy_discussion_value_pipeline.py`: reads the Korean policy discussion Excel transcript, splits non-moderator speech into claim units, translates to English, and writes 19-value vectors.
- `scripts/project_value_vectors.py`: PCA-projects 19 signed value vectors to 2D and optionally asks OpenAI to label axes/clusters.

## Build, Test, and Development Commands

There is no package build step yet. The current reproducible environment is a conda environment:

```bash
conda activate valueconstellation-valuesnet
python scripts/valuesnet_probe.py
```

Run the ValuesNet probe and write the CSV output:

```bash
conda run -n valueconstellation-valuesnet python scripts/valuesnet_probe.py
```

Run the alternative model probe:

```bash
conda run -n valueconstellation-valuesnet python scripts/alternative_value_models_probe.py
```

Run the Hierocles attained/constrained probe:

```bash
conda run -n valueconstellation-valuesnet python scripts/hierocles_probe.py
```

For a quick Hierocles smoke test:

```bash
conda run -n valueconstellation-valuesnet python scripts/hierocles_probe.py --limit 4
```

Run the current lightweight VictorYeste cascade:

```bash
conda run -n valueconstellation-valuesnet python scripts/victoryeste_cascade_probe.py
```

Run the policy discussion transcript pipeline on the opening common-answer segment only:

```bash
conda run -n valueconstellation-valuesnet python scripts/policy_discussion_value_pipeline.py --start-time 00:50 --end-time 08:36
```

For reliable Korean input, set `OPENAI_API_KEY` in repo-root `.env` before running so the script uses the OpenAI translation path. Without it, the script falls back to `Helsinki-NLP/opus-mt-ko-en`, which is only acceptable for pipeline smoke tests, not final interpretation.

Project a generated vector CSV to 2D:

```bash
conda run -n valueconstellation-valuesnet python scripts/project_value_vectors.py --input results/policy_discussion/first_topic_argument_vectors.csv --output results/policy_discussion/first_topic_argument_projection_compare.csv --metadata-output results/policy_discussion/first_topic_argument_projection_compare_metadata.json --method all --label-with-openai
```

If recreating the environment, install the current runtime dependencies:

```bash
python -m pip install transformers torch sentencepiece protobuf safetensors pandas tabulate openpyxl scikit-learn umap-learn valueeval24-hierocles-of-alexandria
```

## Current Research Direction

The prototype goal is to convert multi-stakeholder deliberation claims into value-dimension vectors. The current working formula is:

```text
presence_i = P(value_i present)
direction_i = P(attained_i) - P(constrained_i)
signed_value_i = presence_i * direction_i
```

Current model judgment:

- Do not use `nharrel/Valuesnet_DeBERTa_v3` as the main embedding engine. It saturates scores across many values and assigns high scores to neutral sentences.
- Use `VictorYeste/human-value-detection-deberta-baseline` or `VictorYeste/deberta-based-human-value-detection` for 19-value presence extraction.
- Current lightweight default is `VictorYeste/deberta-based-human-value-detection` for presence plus `VictorYeste/deberta-based-human-value-stance-detection` for attained/constrained direction.
- Use the following working scores:

```text
raw_signed_i = presence_i * (P(attained_i) - P(constrained_i))
support_i = max(0, raw_signed_i)
constraint_i = max(0, -raw_signed_i)
```

- `presence` is not the same as support. A value can have high presence in an anti-value sentence because the value is being referenced as constrained or rejected.
- `valueeval24-hierocles-of-alexandria` is a direct ValueEval candidate but is too heavy for quick Windows CPU iteration; keep it as a later comparison path, not the default.
- Korean direct input is unreliable. Translate Korean utterances to English before value inference.
- For real transcripts, split into argument units before value inference. The current default uses OpenAI to keep adjacent Korean sentences together when they form one policy claim with reasons or implications. Sentence-level splitting is available with `--unit claim`, and whole-turn scoring is available with `--unit turn`.
- Direction estimates are not robust enough to treat as ground truth. Anti-value and negation cases need LLM review or a small hand-labeled calibration set.
- The 19 labels are refined Schwartz values from Schwartz et al. 2012, not a separate theory. Aggregate them to 10 Schwartz values or 2D higher-order axes only after extraction.

Generated outputs are organized by experiment family:

- `results/model_probes/`: synthetic and model-comparison probes.
- `results/policy_discussion/`: real Korean policy discussion transcript outputs.

Current policy-discussion run state:

- Source transcript: `data/koreanPolicyMakingDiscussion.xlsx`.
- Segment already processed: `00:50~08:36`, the opening common-answer segment for the transcript's "second discussion topic."
- Current best unit mode: `--unit argument`, not sentence-level `--unit claim`.
- Current output set:
  - `results/policy_discussion/first_topic_argument_raw.csv`
  - `results/policy_discussion/first_topic_argument_vectors.csv`
  - `results/policy_discussion/first_topic_argument_active_values.csv`
  - `results/policy_discussion/first_topic_argument_projection_compare.csv`
  - `results/policy_discussion/first_topic_argument_projection_compare_metadata.json`
- Current 2D recommendation: keep 19D vectors as the measurement, use metric MDS as the default map layout candidate, and use PCA only when axis interpretability is more important than neighborhood preservation. Cluster in the original 19D space, not on projected coordinates.
- Current active-value threshold `0.20` is exploratory only. Next work should calibrate `0.20`, `0.30`, and `0.40` against hand-reviewed argument-value labels.

Recommended next steps:

1. Review `results/policy_discussion/first_topic_argument_active_values.csv` manually for segmentation and value-label quality.
2. Build a small gold calibration sheet of 30-50 argument units with human labels for supported/constrained values.
3. Compare thresholds and direction errors against that sheet.
4. Run the improved `--unit argument` pipeline on the rest of the transcript by topic/time segment.
5. Prototype the UI around argument points, top contributing 19D values, editable LLM-generated cluster labels, and MDS/PCA projection toggles.

## Coding Style & Naming Conventions

Use Python 3.11+ and keep scripts readable, typed where practical, and self-contained. Follow PEP 8 conventions:

- 4-space indentation.
- `snake_case` for functions, variables, and file names.
- `UPPER_CASE` for constants.
- Prefer `pathlib.Path` over raw path manipulation.

Do not add broad abstractions until multiple scripts share the same logic.

## Testing Guidelines

No formal test framework is configured yet. For now, treat script execution as the smoke test and verify generated outputs in `results/`.

When tests are added, use `pytest`, place files under `tests/`, and name them `test_<module>.py`. Keep fixtures small and avoid downloading large models during default test runs; use mocks or cached sample outputs where possible.

## Commit & Pull Request Guidelines

Git history currently contains only the initial commit, so no repository-specific convention has been established. Use concise, imperative commit messages, preferably Conventional Commits:

```text
feat: add valuesnet probe script
docs: summarize model evaluation results
```

Pull requests should include a short purpose statement, changed files or workflows, commands run, and any generated artifacts. For visualization or Obsidian-facing changes, include screenshots or note paths when relevant.

## Security & Configuration Tips

Do not commit secrets, API keys, Hugging Face tokens, or private research data. Large downloaded models should remain in local caches, not in the repository. Generated outputs in `results/` should be small, reproducible, and safe to share.
