# Value Extraction Model Selection

Date: 2026-05-20

## Short Recommendation

For the CHI prototype, use a simple two-stage extractor:

```text
Korean utterance
-> translate to English
-> split into claim-level units
-> VictorYeste presence model
-> VictorYeste stance model
-> signed 19-value vector
```

Recommended score:

```text
presence_i = P(value_i expressed)
direction_i = (P(attained_i) - P(constrained_i)) / (P(attained_i) + P(constrained_i) + eps)
raw_signed_i = presence_i * direction_i
support_i = max(0, raw_signed_i)
constraint_i = max(0, -raw_signed_i)
```

This gives each value both a signed score in `[-1, 1]` and one-sided visualization scores in `[0, 1]`. Positive means the claim frames the value as attained/supported; negative means the claim frames it as constrained/violated/opposed; near zero means weak or absent evidence.

## Recommended Default

Use `VictorYeste/human-value-detection-deberta-baseline` for value presence.

Reasons:

- It directly outputs 19 refined Schwartz value probabilities.
- It is text-only, simpler than the LIWC-22 model.
- The model card explicitly says `attained` and `constrained` are collapsed into one expressed/not-expressed label.
- Local tests showed low scores on neutral English statements, which is important for deliberation transcripts.

Use `VictorYeste/deberta-based-human-value-stance-detection` as the current lightweight direction model.

Reasons:

- Its model card describes the exact two-subtask cascade: presence first, then attained/constrained stance.
- It uses `sentence + value name` input and returns `attained` / `constrained`.
- It runs quickly enough for local prototype iteration.
- Existing local tests show anti-value and negation cases remain unstable, so it should not be trusted alone.

Keep `valueeval24-hierocles-of-alexandria` as a later comparison path, not the default. It is a direct ValueEval-style attained/constrained candidate, but the XLM-R XL model is too heavy for quick Windows CPU iteration.

## Avoid As Primary Path

Do not use `nharrel/Valuesnet_DeBERTa_v3` as the main vector engine.

Local results showed:

- strong score saturation across many values,
- poor neutral filtering,
- unreliable Korean direct input,
- useful anti-value behavior in some English cases but not enough for the prototype backbone.

Do not use Korean direct inference with the current public models. Translate Korean utterances to English before value extraction.

Do not treat model scores as ground truth about a stakeholder's stable values. Treat them as contestable interpretation candidates tied to evidence spans.

Do not interpret `presence` as support. ValueEval-style presence collapses `attained` and `constrained`, so anti-value text can still have high presence for the value it rejects or frames as constrained.

## Minimal CHI-Grade Prototype Contract

For each claim, store:

```json
{
  "claim_id": "...",
  "speaker_id": "...",
  "original_text": "...",
  "english_text": "...",
  "values": {
    "Security: personal": {
      "presence": 0.91,
      "attained": 0.10,
      "constrained": 0.78,
      "direction": -0.77,
      "signed": -0.70,
      "evidence": "privacy and safety concerns"
    }
  },
  "needs_review": false
}
```

Flag `needs_review = true` when:

- top values disagree across direction models,
- a high-presence value has weak direction confidence,
- negation or anti-value patterns are detected,
- the model assigns high `Humility` from Hierocles without clear evidence.

## Next Experiments

1. Add one script that combines presence and direction into one CSV: `scripts/value_vector_probe.py`.
2. Use the current script `scripts/victoryeste_cascade_probe.py` as the lightweight working baseline.
3. Compare three direction formulas:
   - `attained - constrained`
   - `(attained - constrained) / (attained + constrained + eps)`
   - VictorYeste stance probability difference.
4. Build a small hand-labeled validation sheet with 100-300 deliberation-style claims.
5. Calibrate thresholds per value, not globally.
6. Use the 19-value signed vector for extraction, then aggregate to 10 Schwartz values or 2D higher-order axes only for visualization.

## Source Check

- VictorYeste baseline model card: https://huggingface.co/VictorYeste/human-value-detection-deberta-baseline
- VictorYeste detection model card: https://huggingface.co/VictorYeste/deberta-based-human-value-detection
- VictorYeste stance model card: https://huggingface.co/VictorYeste/deberta-based-human-value-stance-detection
- Touché ValueEval 2024 task page: https://touche.webis.de/clef24/touche24-web/human-value-detection.html
- Hierocles package: https://pypi.org/project/valueeval24-hierocles-of-alexandria/
- Values ML paper page: https://research.hva.nl/en/publications/values-ml-a-new-multilingual-dataset-for-values-detection-in-news-2/
