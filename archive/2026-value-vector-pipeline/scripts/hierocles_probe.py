from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd
import torch
import transformers

from alternative_value_models_probe import VALUEEVAL24_GROUPS
from valuesnet_probe import SAMPLES
from valueeval24_hierocles_of_alexandria.multi_head_model import MultiHead_MultiLabel_XL, lang_dict
from valueeval24_hierocles_of_alexandria.value_classifier import label_thresholds, labels, model_name


OUTPUT_RAW = Path("results/hierocles_probe_raw.csv")
OUTPUT_SUMMARY = Path("results/hierocles_probe_summary.csv")
ATTAINED_SUFFIX = " attained"
CONSTRAINED_SUFFIX = " constrained"
values = [
    label.removesuffix(ATTAINED_SUFFIX)
    for label in labels
    if label.endswith(ATTAINED_SUFFIX)
]


def top_items(scores: dict[str, float], n: int = 3) -> str:
    return ", ".join(
        f"{label}:{score:+.3f}"
        for label, score in sorted(scores.items(), key=lambda item: item[1], reverse=True)[:n]
    )


def map_to_confidence(x: float, threshold: float) -> float:
    if x >= threshold:
        return (x - threshold) / (threshold - 1) * (-0.5) + 0.5
    return x / threshold * 0.5


def predict_fast(inputs: list[dict[str, object]], max_length: int) -> list[dict[str, object]]:
    tokenizer = transformers.AutoTokenizer.from_pretrained(model_name)
    model = MultiHead_MultiLabel_XL.from_pretrained(model_name, problem_type="multi_label_classification")
    model.eval()

    predictions = []
    for item in inputs:
        encoded = tokenizer(
            str(item["Text"]),
            padding="max_length",
            max_length=max_length,
            truncation=True,
            return_tensors="pt",
        )
        language = torch.tensor([lang_dict[str(item["Language"])]], dtype=torch.long)
        with torch.no_grad():
            logits = model(**encoded, language=language).logits.squeeze(0).cpu().numpy()
        sigmoid = 1 / (1 + np.exp(-logits))
        confidence = [
            map_to_confidence(float(score), threshold)
            for score, threshold in zip(sigmoid.tolist(), label_thresholds, strict=True)
        ]
        prediction = {
            "Text-ID": item["Text-ID"],
            "Sentence-ID": item["Sentence-ID"],
            "Text": item["Text"],
            "Language": item["Language"],
        }
        prediction.update(dict(zip(labels, confidence, strict=True)))
        predictions.append(prediction)
    return predictions


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None, help="Limit samples for quick CPU smoke tests.")
    parser.add_argument("--max-length", type=int, default=128)
    args = parser.parse_args()

    inputs = [
        {
            "Text-ID": sample.sample_id,
            "Sentence-ID": 1,
            "Language": "EN",
            "Text": sample.english,
            "expected_primary": sample.expected_primary,
            "expected_direction": sample.expected_direction,
        }
        for sample in SAMPLES
    ]
    if args.limit is not None:
        inputs = inputs[: args.limit]

    predictions = predict_fast(inputs, max_length=args.max_length)

    raw_rows = []
    summary_rows = []
    for item, prediction in zip(inputs, predictions, strict=True):
        signed_scores: dict[str, float] = {}
        presence_scores: dict[str, float] = {}

        for value in values:
            attained = float(prediction[f"{value} attained"])
            constrained = float(prediction[f"{value} constrained"])
            presence = max(attained, constrained)
            signed = attained - constrained
            presence_scores[value] = presence
            signed_scores[value] = signed
            raw_rows.append(
                {
                    "sample_id": item["Text-ID"],
                    "language": item["Language"],
                    "expected_primary": item["expected_primary"],
                    "expected_direction": item["expected_direction"],
                    "value": value,
                    "attained": attained,
                    "constrained": constrained,
                    "presence": presence,
                    "signed_score": signed,
                    "text": item["Text"],
                }
            )

        expected_group = VALUEEVAL24_GROUPS.get(item["expected_primary"], [])
        expected_presence = None
        expected_signed = None
        if expected_group:
            expected_presence = max(presence_scores[value] for value in expected_group)
            expected_signed = max(
                signed_scores[value] if item["expected_direction"] != "oppose" else -signed_scores[value]
                for value in expected_group
            )

        summary_rows.append(
            {
                "sample_id": item["Text-ID"],
                "language": item["Language"],
                "expected_primary": item["expected_primary"],
                "expected_direction": item["expected_direction"],
                "expected_presence": expected_presence,
                "expected_directional_fit": expected_signed,
                "top_presence": top_items(presence_scores),
                "top_signed_support": top_items(signed_scores),
                "top_signed_constraint": top_items({label: -score for label, score in signed_scores.items()}),
                "text": item["Text"],
            }
        )

    OUTPUT_RAW.parent.mkdir(parents=True, exist_ok=True)
    pd.DataFrame(raw_rows).to_csv(OUTPUT_RAW, index=False)
    summary_df = pd.DataFrame(summary_rows)
    summary_df.to_csv(OUTPUT_SUMMARY, index=False)

    display_cols = [
        "sample_id",
        "expected_primary",
        "expected_direction",
        "expected_presence",
        "expected_directional_fit",
        "top_presence",
        "top_signed_support",
        "top_signed_constraint",
    ]
    print(summary_df[display_cols].to_markdown(index=False, floatfmt=".3f"))
    print(f"\nWrote {OUTPUT_RAW}")
    print(f"Wrote {OUTPUT_SUMMARY}")


if __name__ == "__main__":
    main()
