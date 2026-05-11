from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path

import pandas as pd
import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer


MODEL_NAME = "nharrel/Valuesnet_DeBERTa_v3"
VALUES = [
    "BENEVOLENCE",
    "UNIVERSALISM",
    "SELF-DIRECTION",
    "STIMULATION",
    "HEDONISM",
    "ACHIEVEMENT",
    "POWER",
    "SECURITY",
    "CONFORMITY",
    "TRADITION",
]


@dataclass(frozen=True)
class Sample:
    sample_id: str
    expected_primary: str
    expected_direction: str
    english: str
    korean: str


SAMPLES = [
    Sample(
        "benevolence",
        "BENEVOLENCE",
        "support",
        "In this budget, we should first protect the residents who will be hurt the most and make sure nobody is left alone.",
        "이번 예산에서는 가장 큰 피해를 입을 주민들을 먼저 보호하고 누구도 혼자 남겨지지 않게 해야 합니다.",
    ),
    Sample(
        "universalism",
        "UNIVERSALISM",
        "support",
        "The policy should treat migrants, disabled citizens, and local residents with equal dignity and protect the environment they share.",
        "이 정책은 이주민, 장애 시민, 지역 주민을 동등한 존엄성으로 대하고 모두가 공유하는 환경을 보호해야 합니다.",
    ),
    Sample(
        "self_direction",
        "SELF-DIRECTION",
        "support",
        "Each neighborhood should be allowed to design its own solution instead of being forced into one central plan.",
        "각 동네가 하나의 중앙 계획을 강요받기보다 스스로 해법을 설계할 수 있어야 합니다.",
    ),
    Sample(
        "stimulation",
        "STIMULATION",
        "support",
        "We should test a bold pilot program because the current process is too predictable and cannot reveal new opportunities.",
        "현재 절차는 너무 예측 가능해서 새로운 기회를 드러내지 못하니 과감한 시범 사업을 실험해야 합니다.",
    ),
    Sample(
        "hedonism",
        "HEDONISM",
        "support",
        "The public space should also be enjoyable, with music, food, and places where people can relax after work.",
        "공공 공간은 퇴근 후 사람들이 쉬고 음악과 음식을 즐길 수 있는 즐거운 장소이기도 해야 합니다.",
    ),
    Sample(
        "achievement",
        "ACHIEVEMENT",
        "support",
        "The project should set measurable targets and reward the teams that deliver the strongest results.",
        "이 프로젝트는 측정 가능한 목표를 세우고 가장 뛰어난 성과를 내는 팀에 보상해야 합니다.",
    ),
    Sample(
        "power",
        "POWER",
        "support",
        "The city needs clear authority over the process so it can control resources and enforce the final decision.",
        "시는 자원을 통제하고 최종 결정을 집행할 수 있도록 절차에 대한 분명한 권한을 가져야 합니다.",
    ),
    Sample(
        "security",
        "SECURITY",
        "support",
        "Before expanding the service, we need strict safeguards so families know their data and safety are protected.",
        "서비스를 확대하기 전에 가족들이 자신의 데이터와 안전이 보호된다고 알 수 있도록 엄격한 보호 장치가 필요합니다.",
    ),
    Sample(
        "conformity",
        "CONFORMITY",
        "support",
        "Participants should follow the agreed rules even when they disagree, otherwise the process will lose legitimacy.",
        "참여자들은 동의하지 않더라도 합의된 규칙을 따라야 하며, 그렇지 않으면 절차의 정당성이 무너집니다.",
    ),
    Sample(
        "tradition",
        "TRADITION",
        "support",
        "The redevelopment should preserve the old market rituals and respect the practices that elders kept alive.",
        "재개발은 오래된 시장 의례를 보존하고 어르신들이 지켜 온 관습을 존중해야 합니다.",
    ),
    Sample(
        "anti_security",
        "SECURITY",
        "oppose",
        "We should ignore privacy and safety concerns if removing safeguards lets us launch faster.",
        "보호 장치를 없애서 더 빨리 출시할 수 있다면 개인정보와 안전 우려는 무시해야 합니다.",
    ),
    Sample(
        "anti_benevolence",
        "BENEVOLENCE",
        "oppose",
        "The vulnerable families should handle the disruption themselves; helping them would only slow the project.",
        "취약한 가족들은 혼란을 스스로 감당해야 하며, 그들을 돕는 것은 프로젝트를 늦출 뿐입니다.",
    ),
    Sample(
        "anti_tradition",
        "TRADITION",
        "oppose",
        "Old rituals and inherited customs should not influence this decision at all.",
        "오래된 의례와 물려받은 관습은 이번 결정에 전혀 영향을 주어서는 안 됩니다.",
    ),
    Sample(
        "anti_conformity",
        "CONFORMITY",
        "oppose",
        "People should break the agreed rules whenever the rules make negotiation inconvenient.",
        "합의된 규칙이 협상을 불편하게 만들 때마다 사람들은 그 규칙을 깨도 됩니다.",
    ),
    Sample(
        "neutral_schedule",
        "NONE",
        "neutral",
        "The meeting starts at three o'clock and the agenda has four items.",
        "회의는 세 시에 시작하고 안건은 네 가지입니다.",
    ),
]


def score_text(model, tokenizer, text: str, max_length: int) -> dict[str, float]:
    scores: dict[str, float] = {}
    for value in VALUES:
        encoded = tokenizer(
            f"[{value}] {text}",
            padding="max_length",
            truncation=True,
            max_length=max_length,
            return_tensors="pt",
        )
        with torch.no_grad():
            logits = model(**encoded).logits
        scores[value] = float(torch.tanh(logits).squeeze().cpu())
    return scores


def strongest(scores: dict[str, float], n: int = 3) -> str:
    ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    return ", ".join(f"{value}:{score:+.3f}" for value, score in ranked[:n])


def weakest(scores: dict[str, float], n: int = 3) -> str:
    ranked = sorted(scores.items(), key=lambda item: item[1])
    return ", ".join(f"{value}:{score:+.3f}" for value, score in ranked[:n])


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-length", type=int, default=128)
    parser.add_argument("--output", type=Path, default=Path("results/valuesnet_probe_results.csv"))
    args = parser.parse_args()

    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)
    model.eval()

    rows = []
    for sample in SAMPLES:
        for language, text in [("en", sample.english), ("ko", sample.korean)]:
            scores = score_text(model, tokenizer, text, args.max_length)
            primary_score = None if sample.expected_primary == "NONE" else scores[sample.expected_primary]
            top_value, top_score = max(scores.items(), key=lambda item: item[1])
            row = {
                "sample_id": sample.sample_id,
                "language": language,
                "expected_primary": sample.expected_primary,
                "expected_direction": sample.expected_direction,
                "expected_score": primary_score,
                "top_value": top_value,
                "top_score": top_score,
                "top3": strongest(scores),
                "bottom3": weakest(scores),
                "text": text,
            }
            row.update({value: scores[value] for value in VALUES})
            rows.append(row)

    df = pd.DataFrame(rows)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(args.output, index=False)

    display_cols = [
        "sample_id",
        "language",
        "expected_primary",
        "expected_score",
        "top_value",
        "top_score",
        "top3",
    ]
    print(df[display_cols].to_markdown(index=False, floatfmt=".3f"))
    print(f"\nWrote {args.output}")


if __name__ == "__main__":
    main()
