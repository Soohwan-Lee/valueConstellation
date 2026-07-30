# 2026-05-21 First Topic Argument Pipeline Review

## What This Run Covers

- Source file: `data/koreanPolicyMakingDiscussion.xlsx`
- Segment used: `00:50~08:36`
- Important correction: this is not an automatically detected "first topic." The transcript itself starts with the moderator saying "두 번째 토론 주제." The selected range is the opening common-answer segment for that topic, before the moderated free debate begins.
- Unit mode: `argument`
- Translation: OpenAI `gpt-5.4-mini`
- Value models:
  - Presence: `VictorYeste/deberta-based-human-value-detection`
  - Direction: `VictorYeste/deberta-based-human-value-stance-detection`

## Current Pipeline

```text
Korean transcript
→ filter speaker/time/topic segment
→ segment each non-moderator turn into argument units
→ translate each Korean argument unit into English
→ estimate 19-value presence
→ estimate attained/constrained direction for each value
→ compute signed/support/constraint scores
→ optionally filter active value references by threshold
→ optionally project 19D vectors to 2D
```

## Argument Unit Segmentation

The previous run used sentence/line-like splitting. That was too fine-grained because a policy argument often spans multiple adjacent sentences: claim, reason, proposed mechanism, and expected implication.

The current `argument` mode asks OpenAI to segment each Korean turn into contiguous argument units while preserving exact Korean text. It should keep adjacent sentences together when they form one policy claim with reasons or implications. It does not paraphrase during segmentation.

Counts for the selected segment:

- Old sentence/line-like mode: 62 units
- New argument mode: 38 units

This is a better unit for the HCI prototype, but it is still a model-assisted segmentation. A small human check is needed before treating it as final.

## Threshold

Current active-value threshold: `0.20`

This is an exploratory review threshold, not a validated cutoff. It means:

```text
include a claim-value pair if support_01 >= 0.20 or constraint_01 >= 0.20
```

Reason for using `0.20` now:

- It is low enough to surface candidate values for manual inspection.
- It is high enough to hide most near-zero dimensions.
- It should not be used as a final system threshold without calibration.

Recommended next calibration:

- Hand-label about 30-50 argument units.
- For each unit, mark which of the 19 values are actually supported or constrained.
- Compare thresholds such as `0.20`, `0.30`, `0.40`.
- Pick the threshold based on prototype need: higher precision for cleaner visualization, or higher recall for exploratory review.

## Output Files

- `first_topic_argument_raw.csv`
  - 38 argument units x 19 values = 722 rows.
  - One row per argument-value pair.

- `first_topic_argument_vectors.csv`
  - One row per argument unit.
  - Wide 19D vector columns:
    - `presence__*`
    - `signed__*`
    - `support__*`
    - `constraint__*`

- `first_topic_argument_active_values.csv`
  - 40 active rows at threshold `0.20`.
  - This is the easiest file to inspect manually.

- `first_topic_argument_projection.csv`
  - PCA 2D projection from 19 signed value dimensions.
  - Includes `x`, `y`, and `cluster_id`.

- `first_topic_argument_projection_metadata.json`
  - PCA explained variance, axis loadings, cluster summaries, and LLM-suggested labels.

## Quick Quality Review

Several outputs look plausible:

- 정의당: "지역 소멸은 대한민국의 존립 기반을 위협" -> `Security: societal` constrained. This is sensible because the statement frames social/national stability as threatened.
- 정의당: "지역 간 격차를 줄이는 컨트롤타워" -> `Universalism: concern` support. This is plausible because it emphasizes reducing disparities.
- 정의당: "재정 입법권 이양... 주민 결정권" -> `Self-direction: action` support. This is plausible for autonomy and self-governance.
- 민주당: "20조 원 재정 지원, 투자..." -> `Power: resources` support. This is plausible because the argument centers on material resources and institutional capacity.
- 개혁신당: "산업과 재정의 구조를 바꾸는 것" -> `Self-direction: action`, `Power: resources`, `Stimulation` support. This is broadly plausible as restructuring, autonomy, and economic capacity.
- 조국혁신당: "중앙집권적 개발 국가 체제를 극복하고 분권과 자치" -> `Self-direction: action` support. This is plausible.

Some outputs are suspicious or need review:

- Very generic transition sentences can still receive high values, e.g. "지방을 살리기 위해서는 다음의 조건이 필수적입니다." -> `Stimulation` support. This is probably too much for such a setup sentence.
- Some model labels are unintuitive for Korean policy discourse after translation. Example: `Universalism: nature` can appear on regional extinction/balanced-development language even when environmental nature is not the main meaning.
- Direction is still noisy. Some "problem diagnosis" statements become constrained, which can be useful, but the prototype should show them as model suggestions rather than ground truth.
- The stance model often returns near-zero constraints except in clearly negative/problem-framing cases. That makes support-heavy maps likely unless thresholds and review rules are tuned.

## 2D Projection Review

Current comparison:

```text
19 signed value dimensions
→ PCA / metric MDS / t-SNE / UMAP
→ compare local-neighborhood trustworthiness
→ use projection only as a visualization layer
→ cluster/group arguments in the original 19D vector space
```

PCA explained variance in this first run:

- X: about 0.199
- Y: about 0.177
- Total: about 0.376

This is enough for exploratory visualization, not enough to claim the 2D plane fully represents the 19D value structure.

Projection comparison from `first_topic_argument_projection_compare_metadata.json`:

| Method | Main metric |
| --- | --- |
| PCA | total explained variance: `0.375` / trustworthiness@5: `0.757` |
| metric MDS | stress: `27.020` / trustworthiness@5: `0.859` |
| t-SNE | KL divergence: `0.212` / trustworthiness@5: `0.830` |
| UMAP | trustworthiness@5: `0.785` |

Current recommendation:

- Use PCA when axis interpretability matters.
- Use metric MDS as the default map layout candidate for the prototype because it preserves local neighborhoods best in this small run while still being conceptually easier to explain than t-SNE.
- Use t-SNE/UMAP only as exploratory alternatives. They can show clearer clusters, but their axes and inter-cluster distances should not be interpreted literally.
- Cluster in the original 19D vector space, not on t-SNE/UMAP coordinates.
- Keep the original 19D vector available in the UI. The 2D view should be a navigational map, not the actual measurement.

LLM-suggested labels from this run:

- X axis: "보편주의·지역균형 vs 자극·자원/성과"
- Y axis: "자율적 개혁·권한이양 vs 자원/치안·통제 중심"
- Cluster labels:
  - 0: "지역생존 경고"
  - 1: "균형개발 개혁론"
  - 2: "권한이양·분권"
  - 3: "자치확대·제도개편"

These labels are useful as prototype-facing interpretive labels, but should be displayed as generated summaries, not as theoretically fixed dimensions.

## Practical Recommendation

For the CHI prototype, the simplest workable path is:

1. Use `argument` mode, not sentence mode, for the visualized points.
2. Store the 19D signed/support/constraint vector for every argument.
3. Use the active-value file to let the researcher inspect which values drove each point.
4. Use 2D MDS/PCA/UMAP-style projection for the map, but expose the top contributing values for every point.
5. Let LLM-generated axis/cluster labels help users read the map, but keep them editable or clearly marked as generated.

## References Checked

- Argument mining survey, Computational Linguistics: https://direct.mit.edu/coli/article/45/4/765/93362/Argument-Mining-A-Survey
- IBM corpus-wide claim detection: https://research.ibm.com/publications/unsupervised-corpus-wide-claim-detection
- IAM integrated argument mining dataset: https://huggingface.co/papers/2203.12257
- Touché Human Value Detection 2024: https://touche.webis.de/clef24/touche24-web/human-value-detection.html
