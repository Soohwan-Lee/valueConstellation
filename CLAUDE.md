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

For Korean stakeholder dialogue, the current prototype direction is:

```text
Korean utterance
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
- `valueeval24-hierocles-of-alexandria` is the most direct public candidate for value polarity because it outputs value-level `attained` and `constrained`. It still has artifacts and failure cases, especially `Humility` around 0.5 on neutral text.
- Korean direct input is not reliable for these public models. Use English translation first.

## Entry Points

- `scripts/valuesnet_probe.py`: probes `nharrel/Valuesnet_DeBERTa_v3`.
- `scripts/alternative_value_models_probe.py`: probes Schwartz, Moral Foundations, and VictorYeste ValueEval-style models.
- `scripts/hierocles_probe.py`: probes Hierocles attained/constrained outputs and writes raw plus summary CSVs.

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
```

Use `--limit` on `hierocles_probe.py` for quick smoke tests:

```bash
conda run -n valueconstellation-valuesnet python scripts/hierocles_probe.py --limit 4
```

## Development Notes

- Keep scripts standalone until shared logic clearly emerges.
- Do not commit downloaded Hugging Face model caches.
- Do not commit `.omc/`, `.DS_Store`, or `__pycache__/`.
- Treat generated CSVs in `results/` as small, reproducible research artifacts.
- If adding automated tests later, avoid model downloads in default tests; use mocked logits or small cached sample outputs.
