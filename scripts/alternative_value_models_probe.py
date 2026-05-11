from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

import pandas as pd
import torch
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    RobertaForSequenceClassification,
    RobertaTokenizer,
)

from valuesnet_probe import SAMPLES


SCHWARTZ_MODEL = "devnote5676/schwartz-values-classifier"
MORAL_MODEL = "MMADS/MoralFoundationsClassifier"
VALUEEVAL24_MODEL = "VictorYeste/human-value-detection-deberta-liwc-22"

SCHWARTZ_VALUES = [
    "security",
    "power",
    "achievement",
    "hedonism",
    "stimulation",
    "self-direction",
    "universalism",
    "benevolence",
    "conformity",
    "tradition",
]

SCHWARTZ_MAP = {
    "SECURITY": "security",
    "POWER": "power",
    "ACHIEVEMENT": "achievement",
    "HEDONISM": "hedonism",
    "STIMULATION": "stimulation",
    "SELF-DIRECTION": "self-direction",
    "UNIVERSALISM": "universalism",
    "BENEVOLENCE": "benevolence",
    "CONFORMITY": "conformity",
    "TRADITION": "tradition",
}

MORAL_LABELS = [
    "care_virtue",
    "care_vice",
    "fairness_virtue",
    "fairness_vice",
    "loyalty_virtue",
    "loyalty_vice",
    "authority_virtue",
    "authority_vice",
    "sanctity_virtue",
    "sanctity_vice",
]

VALUEEVAL24_LABELS = [
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

VALUEEVAL24_GROUPS = {
    "SELF-DIRECTION": ["Self-direction: thought", "Self-direction: action"],
    "STIMULATION": ["Stimulation"],
    "HEDONISM": ["Hedonism"],
    "ACHIEVEMENT": ["Achievement"],
    "POWER": ["Power: dominance", "Power: resources"],
    "SECURITY": ["Security: personal", "Security: societal"],
    "TRADITION": ["Tradition"],
    "CONFORMITY": ["Conformity: rules", "Conformity: interpersonal"],
    "BENEVOLENCE": ["Benevolence: caring", "Benevolence: dependability"],
    "UNIVERSALISM": ["Universalism: concern", "Universalism: nature", "Universalism: tolerance"],
}


def positive_probability(logits: torch.Tensor) -> float:
    logits = logits.squeeze(0)
    if logits.numel() == 1:
        return float(torch.sigmoid(logits).cpu())
    return float(torch.softmax(logits, dim=-1)[-1].cpu())


def top_items(scores: dict[str, float], n: int = 3) -> str:
    ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    return ", ".join(f"{label}:{score:.3f}" for label, score in ranked[:n])


def score_schwartz(texts: list[dict[str, str]]) -> list[dict[str, Any]]:
    tokenizer = AutoTokenizer.from_pretrained(SCHWARTZ_MODEL)
    model = AutoModelForSequenceClassification.from_pretrained(SCHWARTZ_MODEL)
    model.eval()

    rows = []
    for item in texts:
        scores = {}
        for value in SCHWARTZ_VALUES:
            encoded = tokenizer(
                f"<{value}> [SEP] {item['text']}",
                return_tensors="pt",
                truncation=True,
                max_length=256,
            )
            with torch.no_grad():
                logits = model(**encoded).logits
            scores[value] = positive_probability(logits)
        top_label, top_score = max(scores.items(), key=lambda kv: kv[1])
        expected = SCHWARTZ_MAP.get(item["expected_primary"])
        rows.append(
            {
                **item,
                "model": SCHWARTZ_MODEL,
                "label_space": "schwartz_10_binary_presence",
                "expected_model_label": expected,
                "expected_score": None if expected is None else scores[expected],
                "top_label": top_label,
                "top_score": top_score,
                "top3": top_items(scores),
                **{f"score_{k}": v for k, v in scores.items()},
            }
        )
    return rows


def score_moral_foundations(texts: list[dict[str, str]]) -> list[dict[str, Any]]:
    tokenizer = RobertaTokenizer.from_pretrained(MORAL_MODEL)
    model = RobertaForSequenceClassification.from_pretrained(MORAL_MODEL)
    model.eval()

    rows = []
    for item in texts:
        encoded = tokenizer(
            item["text"],
            return_tensors="pt",
            truncation=True,
            padding=True,
            max_length=512,
        )
        with torch.no_grad():
            logits = model(**encoded).logits.squeeze(0)
        probs = torch.sigmoid(logits).cpu().tolist()
        scores = dict(zip(MORAL_LABELS, probs, strict=False))
        top_label, top_score = max(scores.items(), key=lambda kv: kv[1])
        rows.append(
            {
                **item,
                "model": MORAL_MODEL,
                "label_space": "moral_foundations_10_multilabel",
                "expected_model_label": None,
                "expected_score": None,
                "top_label": top_label,
                "top_score": top_score,
                "top3": top_items(scores),
                **{f"score_{k}": v for k, v in scores.items()},
            }
        )
    return rows


def score_valueeval24_dummy_liwc(texts: list[dict[str, str]]) -> list[dict[str, Any]]:
    tokenizer = AutoTokenizer.from_pretrained(VALUEEVAL24_MODEL)
    model = AutoModelForSequenceClassification.from_pretrained(
        VALUEEVAL24_MODEL,
        trust_remote_code=True,
    )
    model.eval()
    liwc_dim = model.config.num_categories

    rows = []
    for item in texts:
        encoded = tokenizer(item["text"], return_tensors="pt", truncation=True, max_length=512)
        liwc_tensor = torch.zeros((1, liwc_dim), dtype=torch.float32)
        with torch.no_grad():
            logits = model(**encoded, lexicon_features=liwc_tensor).logits.squeeze(0)
        probs = torch.sigmoid(logits).cpu().tolist()
        scores = dict(zip(VALUEEVAL24_LABELS, probs, strict=False))
        top_label, top_score = max(scores.items(), key=lambda kv: kv[1])
        expected_group = VALUEEVAL24_GROUPS.get(item["expected_primary"])
        expected_score = None
        expected_model_label = None
        if expected_group:
            expected_model_label = " | ".join(expected_group)
            expected_score = max(scores[label] for label in expected_group)
        rows.append(
            {
                **item,
                "model": VALUEEVAL24_MODEL,
                "label_space": "valueeval24_19_dummy_liwc",
                "expected_model_label": expected_model_label,
                "expected_score": expected_score,
                "top_label": top_label,
                "top_score": top_score,
                "top3": top_items(scores),
                **{f"score_{k}": v for k, v in scores.items()},
            }
        )
    return rows


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("results/alternative_value_models_probe.csv"))
    parser.add_argument(
        "--models",
        nargs="+",
        default=["schwartz", "moral", "valueeval24"],
        choices=["schwartz", "moral", "valueeval24"],
    )
    args = parser.parse_args()

    texts = []
    for sample in SAMPLES:
        for language, text in [("en", sample.english), ("ko", sample.korean)]:
            texts.append(
                {
                    "sample_id": sample.sample_id,
                    "language": language,
                    "expected_primary": sample.expected_primary,
                    "expected_direction": sample.expected_direction,
                    "text": text,
                }
            )

    rows: list[dict[str, Any]] = []
    if "schwartz" in args.models:
        rows.extend(score_schwartz(texts))
    if "moral" in args.models:
        rows.extend(score_moral_foundations(texts))
    if "valueeval24" in args.models:
        rows.extend(score_valueeval24_dummy_liwc(texts))

    df = pd.DataFrame(rows)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(args.output, index=False)

    display = df[
        [
            "model",
            "sample_id",
            "language",
            "expected_primary",
            "expected_direction",
            "expected_model_label",
            "expected_score",
            "top_label",
            "top_score",
            "top3",
        ]
    ]
    print(display.to_markdown(index=False, floatfmt=".3f"))
    print(f"\nWrote {args.output}")


if __name__ == "__main__":
    main()
