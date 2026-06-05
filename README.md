# Value Constellation

Value Constellation is an early research prototype for mapping multi-stakeholder
policy deliberation into value-space representations.

The current work focuses on a Korean policy discussion transcript. The pipeline
splits speech into argument units, translates Korean claims to English, extracts
19 refined Schwartz value signals, and projects the resulting value vectors into
2D layouts for inspection.

## Current Components

- `scripts/`: research scripts for model probes, transcript processing, value
  vector extraction, projection, and plotting.
- `results/`: generated CSV/JSON/HTML outputs from the current experiments.
- `frontend/`: React + Vite interface for inspecting value-map outputs.
- `prototypes/`: small Node.js concept prototypes for value tensions, absent
  stakeholders, blind spots, and decision-rationale support.

## Run Examples

Process a transcript segment:

```bash
conda run -n valueconstellation-valuesnet python scripts/policy_discussion_value_pipeline.py --start-time 00:50 --end-time 08:36
```

Project value vectors:

```bash
conda run -n valueconstellation-valuesnet python scripts/project_value_vectors.py --input results/policy_discussion/first_topic_argument_vectors.csv --output results/policy_discussion/first_topic_argument_projection_compare.csv --metadata-output results/policy_discussion/first_topic_argument_projection_compare_metadata.json --method all --label-with-openai
```

Run the main frontend:

```bash
cd frontend
npm install
npm run dev
```

Run the absent-stakeholder prototype:

```bash
cd prototypes/absent-stakeholder-blindspot
npm run dev
```

## Status

This repository is still exploratory. The value vectors and projections are
research artifacts, not validated measurements. Current next steps are manual
review, small gold-label calibration, threshold comparison, and continued UI
prototyping around argument points, value contributions, and cluster labels.
