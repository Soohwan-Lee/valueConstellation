from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

import pandas as pd
import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from valuesnet_probe import SAMPLES


PRESENCE_MODEL = "VictorYeste/deberta-based-human-value-detection"
STANCE_MODEL = "VictorYeste/deberta-based-human-value-stance-detection"

VALUES = [
    "Self-direction: thought",
    "Self-direction: action",
    "Stimulation",
    "Hedonism",
    "Achievement",
    "Power: dominance",
    "Power: resources",
    "Face",
    "Security: personal",
    "Security: societal",
    "Tradition",
    "Conformity: rules",
    "Conformity: interpersonal",
    "Humility",
    "Benevolence: caring",
    "Benevolence: dependability",
    "Universalism: concern",
    "Universalism: nature",
    "Universalism: tolerance",
]

COARSE_VALUE_GROUPS = {
    "self_direction": ["Self-direction: thought", "Self-direction: action"],
    "stimulation": ["Stimulation"],
    "hedonism": ["Hedonism"],
    "achievement": ["Achievement"],
    "power": ["Power: dominance", "Power: resources", "Face"],
    "security": ["Security: personal", "Security: societal"],
    "tradition": ["Tradition", "Humility"],
    "conformity": ["Conformity: rules", "Conformity: interpersonal"],
    "benevolence": ["Benevolence: caring", "Benevolence: dependability"],
    "universalism": ["Universalism: concern", "Universalism: nature", "Universalism: tolerance"],
}

SCHWARTZ_AXES = {
    "openness_to_change": ["self_direction", "stimulation", "hedonism"],
    "conservation": ["security", "tradition", "conformity"],
    "self_enhancement": ["achievement", "power", "hedonism"],
    "self_transcendence": ["benevolence", "universalism"],
}


def sigmoid_probs(model: Any, tokenizer: Any, text: str, max_length: int) -> dict[str, float]:
    encoded = tokenizer(text, return_tensors="pt", truncation=True, max_length=max_length)
    with torch.no_grad():
        logits = model(**encoded).logits.squeeze(0)
    probs = torch.sigmoid(logits).cpu().tolist()
    return dict(zip(VALUES, probs, strict=True))


def stance_probs(model: Any, tokenizer: Any, text: str, value: str, max_length: int) -> dict[str, float]:
    # Follow the model card's premise/value format: "sentence. Value".
    pair_text = f"{text.rstrip()} {value}"
    encoded = tokenizer(pair_text, return_tensors="pt", truncation=True, max_length=max_length)
    with torch.no_grad():
        logits = model(**encoded).logits.squeeze(0)
    probs = torch.softmax(logits, dim=-1).cpu().tolist()
    id2label = model.config.id2label
    return {id2label[i].lower(): float(prob) for i, prob in enumerate(probs)}


def mean_group(scores: dict[str, float], labels: list[str]) -> float:
    return sum(scores[label] for label in labels) / len(labels)


def top_items(scores: dict[str, float], n: int = 3) -> str:
    ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    return ", ".join(f"{label}:{score:.3f}" for label, score in ranked[:n])


def score_texts(args: argparse.Namespace) -> tuple[pd.DataFrame, pd.DataFrame]:
    presence_tokenizer = AutoTokenizer.from_pretrained(PRESENCE_MODEL)
    presence_model = AutoModelForSequenceClassification.from_pretrained(PRESENCE_MODEL)
    presence_model.eval()

    stance_tokenizer = AutoTokenizer.from_pretrained(STANCE_MODEL)
    stance_model = AutoModelForSequenceClassification.from_pretrained(STANCE_MODEL)
    stance_model.eval()

    samples = SAMPLES[: args.limit] if args.limit is not None else SAMPLES
    raw_rows = []
    summary_rows = []

    for sample in samples:
        text = sample.english
        presence_scores = sigmoid_probs(presence_model, presence_tokenizer, text, args.max_length)
        signed_scores: dict[str, float] = {}
        support_scores: dict[str, float] = {}
        constrain_scores: dict[str, float] = {}

        for value in VALUES:
            stance = stance_probs(stance_model, stance_tokenizer, text, value, args.max_length)
            attained = stance.get("attained", 0.0)
            constrained = stance.get("constrained", 0.0)
            presence = presence_scores[value]
            direction = attained - constrained
            support_01 = presence * attained
            constrain_01 = presence * constrained
            signed = presence * direction

            support_scores[value] = support_01
            constrain_scores[value] = constrain_01
            signed_scores[value] = signed
            raw_rows.append(
                {
                    "sample_id": sample.sample_id,
                    "expected_primary": sample.expected_primary,
                    "expected_direction": sample.expected_direction,
                    "value": value,
                    "presence": presence,
                    "attained": attained,
                    "constrained": constrained,
                    "support_01": support_01,
                    "constrain_01": constrain_01,
                    "signed": signed,
                    "text": text,
                }
            )

        coarse_signed = {
            group: mean_group(signed_scores, labels)
            for group, labels in COARSE_VALUE_GROUPS.items()
        }
        coarse_support = {
            group: mean_group(support_scores, labels)
            for group, labels in COARSE_VALUE_GROUPS.items()
        }

        x_signed = mean_group(coarse_signed, SCHWARTZ_AXES["openness_to_change"]) - mean_group(
            coarse_signed,
            SCHWARTZ_AXES["conservation"],
        )
        y_signed = mean_group(coarse_signed, SCHWARTZ_AXES["self_transcendence"]) - mean_group(
            coarse_signed,
            SCHWARTZ_AXES["self_enhancement"],
        )
        x_support = mean_group(coarse_support, SCHWARTZ_AXES["openness_to_change"]) - mean_group(
            coarse_support,
            SCHWARTZ_AXES["conservation"],
        )
        y_support = mean_group(coarse_support, SCHWARTZ_AXES["self_transcendence"]) - mean_group(
            coarse_support,
            SCHWARTZ_AXES["self_enhancement"],
        )

        summary_rows.append(
            {
                "sample_id": sample.sample_id,
                "expected_primary": sample.expected_primary,
                "expected_direction": sample.expected_direction,
                "top_presence": top_items(presence_scores),
                "top_support_01": top_items(support_scores),
                "top_constrain_01": top_items(constrain_scores),
                "top_signed_support": top_items(signed_scores),
                "top_signed_constraint": top_items({k: -v for k, v in signed_scores.items()}),
                "x_signed_openness_minus_conservation": x_signed,
                "y_signed_transcendence_minus_enhancement": y_signed,
                "x_support_openness_minus_conservation": x_support,
                "y_support_transcendence_minus_enhancement": y_support,
                "text": text,
            }
        )

    return pd.DataFrame(raw_rows), pd.DataFrame(summary_rows)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--max-length", type=int, default=256)
    parser.add_argument("--raw-output", type=Path, default=Path("results/victoryeste_cascade_raw.csv"))
    parser.add_argument(
        "--summary-output",
        type=Path,
        default=Path("results/victoryeste_cascade_summary.csv"),
    )
    args = parser.parse_args()

    raw_df, summary_df = score_texts(args)
    args.raw_output.parent.mkdir(parents=True, exist_ok=True)
    raw_df.to_csv(args.raw_output, index=False)
    summary_df.to_csv(args.summary_output, index=False)

    display_cols = [
        "sample_id",
        "expected_primary",
        "expected_direction",
        "top_presence",
        "top_support_01",
        "top_constrain_01",
        "x_signed_openness_minus_conservation",
        "y_signed_transcendence_minus_enhancement",
    ]
    print(summary_df[display_cols].to_markdown(index=False, floatfmt=".3f"))
    print(f"\nWrote {args.raw_output}")
    print(f"Wrote {args.summary_output}")


if __name__ == "__main__":
    main()
