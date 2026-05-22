# Full Korean Policy Discussion Value-Vector Review

## Scope

- Source: `data/koreanPolicyMakingDiscussion.xlsx`
- Segment: full non-moderator transcript for the Korean policy discussion file
- Unit mode: `argument`
- Selected argument units: 256
- Value dimensions: 19 refined Schwartz values
- Translation: OpenAI path from inherited `OPENAI_API_KEY` environment variable
- Presence model: `VictorYeste/deberta-based-human-value-detection`
- Direction model: `VictorYeste/deberta-based-human-value-stance-detection`

Generated files:

- `full_argument_raw.csv`: 256 argument units x 19 values = 4,864 argument-value rows
- `full_argument_vectors.csv`: one row per argument unit with 19D presence/signed/support/constraint vectors
- `full_argument_active_values.csv`: active value rows at threshold 0.20
- `full_argument_projection_compare.csv`: PCA, metric MDS, t-SNE, UMAP coordinates
- `full_argument_projection_compare_metadata.json`: projection metrics, cluster summaries, and generated labels
- `full_argument_mds_llm_interpretation.json`: LLM-generated MDS axis and cluster interpretation, with caveats
- `full_argument_party_cluster_counts.csv`: cluster by party count table
- `figures/full_argument_projection_methods.png`: four-method projection comparison
- `figures/full_argument_mds_clusters.png`: recommended MDS view with 19D-space clusters
- `figures/full_argument_mds_party_color_cluster_marker.png`: MDS view with party colors and cluster marker shapes

## Environment Notes

The conda environment is `/opt/miniconda3/envs/valueconstellation-valuesnet`.

Missing packages were installed into that environment during this run:

- `openpyxl`
- `scikit-learn`
- `umap-learn`
- `matplotlib`

The repo root did not contain a `.env` file during this run. `OPENAI_API_KEY` was available from the parent shell process, so the run succeeded. For reproducibility, add a repo-local `.env` or document where the shell-level key is set.

## Active-Value Distribution

At threshold 0.20:

- Active rows: 201
- Active units: 156 / 256

Most frequent active labels:

| Value / stance | Count |
| --- | ---: |
| `Self-direction: action` support | 36 |
| `Stimulation` support | 19 |
| `Conformity: rules` support | 18 |
| `Power: resources` support | 16 |
| `Security: societal` constraint | 15 |
| `Universalism: concern` support | 13 |
| `Self-direction: thought` support | 10 |
| `Security: societal` support | 10 |

Threshold comparison:

| Threshold | Active rows | Active units | Use |
| ---: | ---: | ---: | --- |
| 0.20 | 201 | 156 | Broad candidate review; too noisy for presentation highlights |
| 0.30 | 148 | 131 | Reasonable exploratory default |
| 0.40 | 123 | 116 | Better meeting-view threshold |
| 0.50 | 89 | 87 | Cleaner high-confidence examples |
| 0.70 | 53 | 52 | Strong examples only |

Recommendation: show `0.40` or `0.50` examples in the professor meeting, while keeping `0.20` as a researcher-facing recall-oriented review mode.

## Manual Spot Check

Overall judgment: suitable for exploratory discussion, not yet suitable as ground-truth measurement without calibration.

Plausible outputs:

- "노동권과 환경권, 의료, 공공성 같은 국민의 기본권은 전국 어디서나 차별 없이 균등하게 보장되어야 합니다." -> `Universalism: concern` support 0.964. Strongly plausible.
- "6대 거점 도시에 집중적으로 투자를 하겠다는 거죠." -> `Power: resources` support 0.960. Plausible.
- "중동에서의 전쟁이 우리의 경제와 국민의 안전에 심각한 영향을 미치고 있습니다." -> `Security: societal` constraint 0.943. Plausible.
- "유가 급등은 생필품 가격 상승으로 이어지고 고용을 위협하고 있습니다." -> `Security: societal` constraint 0.942. Plausible.
- "전국 어디서나 다 잘 살 수 있는..." -> `Universalism: concern` support 0.929. Plausible.
- "정개특위에 이 부분과 관련돼서 더 적극적으로 임하도록 하겠습니다." -> `Self-direction: action` support 0.907. Broadly plausible as agency/action, though the policy substance is thin.
- "대법원 대구 이전... 헌법 위반 논란이 없다..." -> `Conformity: rules` support 0.887. Plausible legal/procedural label.
- "절차적 정당성이 있는가..." -> `Conformity: rules` support 0.887. Plausible.
- "지방자치권을 오히려 훼손..." -> `Self-direction: action` constraint 0.466. Plausible direction.

Suspicious or noisy outputs:

- "지방을 살리기 위해서는 다음의 조건이 필수적입니다." -> `Stimulation` support 0.766. This is mostly a transition/setup sentence, not a substantive value claim.
- "주거 혁신의 제7공화국 비전에는 지역 균형 발전이 포함돼 있습니다." -> `Stimulation` support 0.928. Likely over-triggered by "혁신" / "vision"; value interpretation is weak.
- "변화는 이미 시작되었습니다..." -> `Stimulation` support 0.936. Reasonable if framed as change, but may overstate value content.
- "지역 소멸" cases sometimes map to `Universalism: nature` constraint. This is probably a lexical artifact: "local extinction" is not environmental nature.
- Some questions or rhetorical prompts receive strong value scores even when the utterance is mainly interactional, not a full policy position.
- Direction remains noisy. Problem diagnosis statements often become constraints, which is useful, but they should be displayed as model suggestions.

## Projection Quality

Projection comparison from `full_argument_projection_compare_metadata.json`:

| Method | Main metric | Interpretation |
| --- | --- | --- |
| PCA | explained variance total 0.336; trustworthiness@5 0.791 | Interpretable axes, but only about one third of 19D variance is captured |
| metric MDS | stress 862.9; trustworthiness@5 0.842 | Best default for an explainable navigational map |
| t-SNE | KL 0.366; trustworthiness@5 0.943 | Strong local neighborhoods, but axes and inter-cluster distances are not interpretable |
| UMAP | trustworthiness@5 0.920 | Strong local neighborhoods, but layout is more algorithm-dependent |

Recommendation:

- Use 19D vectors as the measurement.
- Use metric MDS as the default 2D map for the prototype.
- Keep PCA as an optional interpretability view.
- Treat t-SNE and UMAP as exploratory views only.
- Cluster in original 19D vector space, not on projected coordinates.

## Cluster Review

Current run used 6 clusters in the original 19D signed-value space. Sizes:

| Cluster | Size | Working label | Review |
| ---: | ---: | --- | --- |
| 0 | 3 | 지역 소멸 / extinction framing | Small and partly distorted by `Universalism: nature`; inspect manually |
| 1 | 12 | societal security threats | Coherent: war, oil shock, safety accidents, fiscal harm |
| 2 | 32 | decentralization / self-governance reform | Coherent and useful for prototype |
| 3 | 2 | constrained local autonomy / top-down process criticism | Coherent but too small |
| 4 | 191 | broad mixed policy discussion | Too large and heterogeneous; needs better clustering or thresholding |
| 5 | 16 | legal/procedural/institutional rule framing | Coherent and useful |

Generated labels from metadata:

- X axis: "사회적 안전·집단 보호 ↔ 자율·변화 지향"
- Y axis: "집단 안전·권위 관리 ↔ 자율·보편주의·참여"
- Cluster labels:
  - 0: "지역 소멸·생존 위기"
  - 1: "안전사고·재정 위기"
  - 2: "분권 개혁·구조 전환"
  - 3: "중앙집권 반대·절차 비판"
  - 4: "일반적 정책 논쟁"
  - 5: "제도화·규칙 강조"

The labels are good as editable prototype labels, not as fixed theoretical dimensions.

## Party-Colored MDS View

The party-colored view uses:

- color: party / speaker
- marker shape: 19D value-vector cluster
- text label: cluster center and LLM-generated cluster name

This is the better meeting figure when discussing whether parties occupy different regions of the value map. It avoids using color for both party and cluster at the same time.

Party x cluster counts:

| Cluster | 개혁신당 | 국민의힘 | 민주당 | 정의당 | 조국혁신당 |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 0 | 0 | 0 | 2 | 1 | 0 |
| 1 | 1 | 3 | 2 | 6 | 0 |
| 2 | 4 | 2 | 10 | 4 | 12 |
| 3 | 0 | 0 | 0 | 2 | 0 |
| 4 | 36 | 40 | 48 | 40 | 27 |
| 5 | 2 | 0 | 5 | 3 | 6 |

LLM-generated MDS reading aid:

- X axis heuristic: "분권·기본권 강조 ↔ 제도·규범 정당화"
- Y axis heuristic: "위기·안전 압박 ↔ 투자·변화 활성화"

Important caveat: MDS axes are not theoretical latent variables. These labels are based on extreme points and should be treated as reading aids. The pairwise distance between points is more meaningful than the absolute x/y axis meaning.

LLM-generated cluster meanings:

| Cluster | Label | Meaning | Caveat |
| ---: | --- | --- | --- |
| 0 | 지방소멸 경고 | 지역 소멸과 인구 감소를 국가적 위협으로 진술 | Very small cluster |
| 1 | 민생위기·안보불안 | 전쟁, 유가, 화재, 고용, 지방소멸 등 사회적 위기와 안전 문제 | Coherent, but event types differ |
| 2 | 분권·행동촉구 | 자치, 분권, 주민결정권, 정치개혁 실행 촉구 | Reform and action cues are mixed |
| 3 | 중앙강행 비판 | 중앙의 일방 추진과 지방자치권 훼손 비판 | Only two examples |
| 4 | 균형발전·투자 | 지역균형발전, 재정투자, 특별법, 협의체, 형평성 | Too large and internally heterogeneous |
| 5 | 절차·헌법근거 | 헌법, 법률, 절차적 정당성, 위헌 논란 | Do not simplify as conservative/legalism only |

## Meeting Recommendation

Bring the following claim to the professor meeting:

> The pipeline can convert the full Korean policy discussion into 19D value vectors and produces interpretable clusters for security threats, decentralization/self-governance, resources/investment, and legal-procedural framing. However, the current model over-assigns some values to transition sentences and lexical cues, especially `Stimulation` and `Universalism: nature`. The right next step is not to trust the scores directly, but to use them as candidate annotations and calibrate thresholds/directions on 30-50 hand-reviewed argument units.

Concrete discussion points:

1. Whether argument-level units are the right visualization points.
2. Whether to display support/constraint separately rather than a single signed score.
3. Whether `0.40` or `0.50` should be the default active-value threshold in the prototype.
4. Whether cluster labels should be editable/generated summaries.
5. Whether a 30-50 item gold sheet should be labeled by value presence and support/constraint direction before further UI claims.

## Immediate Next Step

Create a calibration sheet with 30-50 argument units sampled from:

- high-confidence plausible rows,
- suspicious high-score rows,
- each of the 6 clusters,
- low/no-active-value rows.

Columns should include:

- `unit_id`
- `speaker`
- `time`
- `korean_text`
- `english_text`
- model top support / constraint
- human supported values
- human constrained values
- segmentation quality
- notes
