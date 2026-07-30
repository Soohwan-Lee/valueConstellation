from __future__ import annotations

import argparse
import json
import os
import re
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import pandas as pd
import torch
from transformers import AutoModelForSeq2SeqLM, AutoModelForSequenceClassification, AutoTokenizer


PRESENCE_MODEL = "VictorYeste/deberta-based-human-value-detection"
STANCE_MODEL = "VictorYeste/deberta-based-human-value-stance-detection"
HF_TRANSLATION_MODEL = "Helsinki-NLP/opus-mt-ko-en"

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

VALUE_SLUGS = {
    value: re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_").replace("self_direction", "self_direction")
    for value in VALUES
}

SPEAKER_COL = "Unnamed: 1"
TIME_COL = "Unnamed: 2"
TEXT_COL = "Unnamed: 3"
MODERATOR = "사회자"

NON_CLAIM_PATTERNS = [
    re.compile(r"^(네|예|감사합니다|이상입니다)[,. ]*$"),
    re.compile(r"^(아|어|음)[,. ]*$"),
]


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


@dataclass
class ClaimUnit:
    unit_id: str
    source_row: int
    speaker: str
    time: str
    claim_index: int
    korean_text: str


def openai_responses_request(model: str, system_prompt: str, user_text: str) -> str:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set.")
    payload = {
        "model": model,
        "input": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_text},
        ],
    }
    request = urllib.request.Request(
        "https://api.openai.com/v1/responses",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"OpenAI request failed: {detail}") from exc

    chunks: list[str] = []
    for item in data.get("output", []):
        for content in item.get("content", []):
            if content.get("type") in {"output_text", "text"} and content.get("text"):
                chunks.append(content["text"])
    text = "\n".join(chunks).strip()
    if not text:
        raise RuntimeError(f"OpenAI request returned no text: {data}")
    return text


def parse_time_to_seconds(value: str) -> int | None:
    if not isinstance(value, str) or ":" not in value:
        return None
    parts = value.strip().split(":")
    try:
        if len(parts) == 2:
            return int(parts[0]) * 60 + int(parts[1])
        if len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
    except ValueError:
        return None
    return None


def read_transcript(path: Path, sheet_name: str) -> pd.DataFrame:
    df = pd.read_excel(path, sheet_name=sheet_name)
    required = [SPEAKER_COL, TIME_COL, TEXT_COL]
    missing = [column for column in required if column not in df.columns]
    if missing:
        raise ValueError(f"Missing expected transcript columns: {missing}")

    df = df.rename(columns={SPEAKER_COL: "speaker", TIME_COL: "time", TEXT_COL: "text"})
    df = df[df["speaker"].notna() & df["text"].notna()].copy()
    df["source_row"] = df.index.astype(int)
    df["speaker"] = df["speaker"].astype(str).str.strip()
    df["time"] = df["time"].astype(str).str.strip()
    df["text"] = df["text"].astype(str).str.strip()
    df["time_seconds"] = df["time"].map(parse_time_to_seconds)
    return df[["source_row", "speaker", "time", "time_seconds", "text"]].reset_index(drop=True)


def split_claims(text: str, max_chars: int) -> list[str]:
    claims: list[str] = []
    for line in re.split(r"\n+", text):
        line = re.sub(r"\s+", " ", line).strip()
        if not line:
            continue
        parts = [
            part.strip()
            for part in re.split(r"(?<=[.!?。])\s+", line)
            if part.strip()
        ]
        for part in parts:
            if len(part) <= max_chars:
                claims.append(part)
                continue
            chunks = re.split(r"(?<=[,，;；])\s+", part)
            claims.extend(chunk.strip() for chunk in chunks if chunk.strip())
    return claims


def is_claim_like(text: str, min_chars: int) -> bool:
    cleaned = re.sub(r"\s+", " ", text).strip()
    if len(cleaned) < min_chars:
        return False
    return not any(pattern.match(cleaned) for pattern in NON_CLAIM_PATTERNS)


def make_claim_units(df: pd.DataFrame, args: argparse.Namespace) -> list[ClaimUnit]:
    filtered = df.copy()
    if not args.include_moderator:
        filtered = filtered[filtered["speaker"] != MODERATOR]
    if args.speakers:
        speakers = {speaker.strip() for speaker in args.speakers.split(",") if speaker.strip()}
        filtered = filtered[filtered["speaker"].isin(speakers)]
    if args.start_time:
        start_seconds = parse_time_to_seconds(args.start_time)
        filtered = filtered[filtered["time_seconds"].fillna(-1) >= start_seconds]
    if args.end_time:
        end_seconds = parse_time_to_seconds(args.end_time)
        filtered = filtered[filtered["time_seconds"].fillna(10**9) <= end_seconds]

    units: list[ClaimUnit] = []
    for row in filtered.itertuples(index=False):
        if args.unit == "turn":
            candidates = [row.text]
        elif args.unit == "argument":
            candidates = segment_arguments(row.text, args.openai_model)
        else:
            candidates = split_claims(row.text, args.max_claim_chars)

        claim_index = 0
        for candidate in candidates:
            if not is_claim_like(candidate, args.min_claim_chars):
                continue
            claim_index += 1
            unit_id = f"row{row.source_row:03d}_claim{claim_index:02d}"
            units.append(
                ClaimUnit(
                    unit_id=unit_id,
                    source_row=int(row.source_row),
                    speaker=row.speaker,
                    time=row.time,
                    claim_index=claim_index,
                    korean_text=candidate,
                )
            )

    if args.limit is not None:
        units = units[: args.limit]
    return units


def segment_arguments(text: str, openai_model: str) -> list[str]:
    system_prompt = (
        "You segment Korean policy-debate speech into argument units for value analysis. "
        "An argument unit may contain multiple adjacent sentences when they form one claim with its reason, warrant, or policy implication. "
        "Do not split merely because there is a sentence boundary. "
        "Do not summarize or paraphrase. Each returned argument_text must be copied verbatim from the input and must be a contiguous span. "
        "Exclude greetings, filler, turn-taking, thanks, and incomplete fragments unless they contain a substantive policy claim. "
        "Return only valid JSON in this exact shape: {\"arguments\":[{\"argument_text\":\"...\"}]}"
    )
    response = openai_responses_request(openai_model, system_prompt, text)
    cleaned = response.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?", "", cleaned).strip()
        cleaned = re.sub(r"```$", "", cleaned).strip()
    data = json.loads(cleaned)
    arguments = []
    for item in data.get("arguments", []):
        argument_text = str(item.get("argument_text", "")).strip()
        if argument_text and argument_text in text:
            arguments.append(argument_text)
    return arguments or split_claims(text, max_chars=900)


class Translator:
    def __init__(self, backend: str, openai_model: str) -> None:
        self.backend = backend
        self.openai_model = openai_model
        self.hf_tokenizer: Any | None = None
        self.hf_model: Any | None = None

        if backend == "auto":
            self.backend = "openai" if os.environ.get("OPENAI_API_KEY") else "hf"

        if self.backend == "openai" and not os.environ.get("OPENAI_API_KEY"):
            raise RuntimeError("OPENAI_API_KEY is not set. Use --translation-backend hf for a local fallback.")
        if self.backend == "hf":
            self.hf_tokenizer = AutoTokenizer.from_pretrained(HF_TRANSLATION_MODEL)
            self.hf_model = AutoModelForSeq2SeqLM.from_pretrained(HF_TRANSLATION_MODEL)
            self.hf_model.eval()

    def translate(self, text: str) -> str:
        if self.backend == "none":
            return text
        if self.backend == "openai":
            return self._translate_openai(text)
        if self.backend == "hf":
            return self._translate_hf(text)
        raise ValueError(f"Unsupported translation backend: {self.backend}")

    def _translate_openai(self, text: str) -> str:
        return openai_responses_request(
            self.openai_model,
            (
                "Translate Korean policy-debate transcript excerpts into English for value classification. "
                "Preserve the speaker's claims, negation, modality, institutional terms, and causal structure. "
                "Do not summarize, omit, explain, or add context. Return only the translation."
            ),
            text,
        )

    def _translate_hf(self, text: str) -> str:
        assert self.hf_tokenizer is not None
        assert self.hf_model is not None
        encoded = self.hf_tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
        with torch.no_grad():
            generated = self.hf_model.generate(**encoded, max_length=512, num_beams=4)
        return self.hf_tokenizer.decode(generated[0], skip_special_tokens=True).strip()


def sigmoid_presence(model: Any, tokenizer: Any, text: str, max_length: int) -> dict[str, float]:
    encoded = tokenizer(text, return_tensors="pt", truncation=True, max_length=max_length)
    with torch.no_grad():
        logits = model(**encoded).logits.squeeze(0)
    probs = torch.sigmoid(logits).cpu().tolist()
    return dict(zip(VALUES, probs, strict=True))


def stance_batch(model: Any, tokenizer: Any, text: str, max_length: int) -> dict[str, dict[str, float]]:
    pair_texts = [f"{text.rstrip()} {value}" for value in VALUES]
    encoded = tokenizer(pair_texts, return_tensors="pt", padding=True, truncation=True, max_length=max_length)
    with torch.no_grad():
        logits = model(**encoded).logits
    probs = torch.softmax(logits, dim=-1).cpu().tolist()
    id2label = model.config.id2label
    return {
        value: {id2label[i].lower(): float(prob) for i, prob in enumerate(row)}
        for value, row in zip(VALUES, probs, strict=True)
    }


def top_items(scores: dict[str, float], n: int = 5) -> str:
    ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    return "; ".join(f"{label}:{score:.3f}" for label, score in ranked[:n])


def score_units(units: list[ClaimUnit], args: argparse.Namespace) -> tuple[pd.DataFrame, pd.DataFrame]:
    translator = Translator(args.translation_backend, args.openai_model)

    presence_tokenizer = AutoTokenizer.from_pretrained(PRESENCE_MODEL)
    presence_model = AutoModelForSequenceClassification.from_pretrained(PRESENCE_MODEL)
    presence_model.eval()

    stance_tokenizer = AutoTokenizer.from_pretrained(STANCE_MODEL)
    stance_model = AutoModelForSequenceClassification.from_pretrained(STANCE_MODEL)
    stance_model.eval()

    raw_rows: list[dict[str, Any]] = []
    vector_rows: list[dict[str, Any]] = []

    for index, unit in enumerate(units, start=1):
        print(f"[{index}/{len(units)}] {unit.unit_id} {unit.speaker} {unit.time}")
        english_text = translator.translate(unit.korean_text)
        presence_scores = sigmoid_presence(presence_model, presence_tokenizer, english_text, args.max_length)
        stance_scores = stance_batch(stance_model, stance_tokenizer, english_text, args.max_length)

        signed_scores: dict[str, float] = {}
        support_scores: dict[str, float] = {}
        constrain_scores: dict[str, float] = {}

        base = {
            "unit_id": unit.unit_id,
            "source_row": unit.source_row,
            "speaker": unit.speaker,
            "time": unit.time,
            "claim_index": unit.claim_index,
            "translation_backend": translator.backend,
            "korean_text": unit.korean_text,
            "english_text": english_text,
        }
        vector_row: dict[str, Any] = dict(base)

        for value in VALUES:
            presence = presence_scores[value]
            attained = stance_scores[value].get("attained", 0.0)
            constrained = stance_scores[value].get("constrained", 0.0)
            direction = attained - constrained
            signed = presence * direction
            support_01 = max(0.0, signed)
            constrain_01 = max(0.0, -signed)

            signed_scores[value] = signed
            support_scores[value] = support_01
            constrain_scores[value] = constrain_01

            slug = VALUE_SLUGS[value]
            vector_row[f"presence__{slug}"] = presence
            vector_row[f"signed__{slug}"] = signed
            vector_row[f"support__{slug}"] = support_01
            vector_row[f"constraint__{slug}"] = constrain_01

            raw_rows.append(
                {
                    **base,
                    "value": value,
                    "value_slug": slug,
                    "presence": presence,
                    "attained": attained,
                    "constrained": constrained,
                    "direction": direction,
                    "signed": signed,
                    "support_01": support_01,
                    "constraint_01": constrain_01,
                }
            )

        vector_row["top_presence"] = top_items(presence_scores)
        vector_row["top_support_01"] = top_items(support_scores)
        vector_row["top_constraint_01"] = top_items(constrain_scores)
        vector_row["top_signed_support"] = top_items(signed_scores)
        vector_row["top_signed_constraint"] = top_items({k: -v for k, v in signed_scores.items()})
        vector_rows.append(vector_row)

    return pd.DataFrame(raw_rows), pd.DataFrame(vector_rows)


def active_value_rows(raw_df: pd.DataFrame, threshold: float) -> pd.DataFrame:
    active = raw_df[(raw_df["support_01"] >= threshold) | (raw_df["constraint_01"] >= threshold)].copy()
    active["stance"] = active["support_01"].ge(active["constraint_01"]).map({True: "support", False: "constraint"})
    active["strength"] = active[["support_01", "constraint_01"]].max(axis=1)
    columns = [
        "unit_id",
        "source_row",
        "speaker",
        "time",
        "value",
        "stance",
        "strength",
        "presence",
        "attained",
        "constrained",
        "signed",
        "korean_text",
        "english_text",
    ]
    return active[columns].sort_values(["unit_id", "strength"], ascending=[True, False])


def main() -> None:
    load_env_file(Path(".env"))

    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=Path("data/koreanPolicyMakingDiscussion.xlsx"))
    parser.add_argument("--sheet-name", default="Contents")
    parser.add_argument("--unit", choices=["claim", "turn", "argument"], default="argument")
    parser.add_argument("--include-moderator", action="store_true")
    parser.add_argument("--speakers", default=None, help="Comma-separated speaker names to include.")
    parser.add_argument("--start-time", default=None, help="Inclusive start time, e.g. 00:50.")
    parser.add_argument("--end-time", default=None, help="Inclusive end time, e.g. 08:36.")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--min-claim-chars", type=int, default=18)
    parser.add_argument("--max-claim-chars", type=int, default=420)
    parser.add_argument("--max-length", type=int, default=256)
    parser.add_argument("--translation-backend", choices=["auto", "openai", "hf", "none"], default="auto")
    parser.add_argument("--openai-model", default=os.environ.get("OPENAI_MODEL", "gpt-5.4-mini"))
    parser.add_argument("--active-threshold", type=float, default=0.20)
    parser.add_argument(
        "--raw-output",
        type=Path,
        default=Path("results/policy_discussion/korean_policy_discussion_values_raw.csv"),
    )
    parser.add_argument(
        "--vectors-output",
        type=Path,
        default=Path("results/policy_discussion/korean_policy_discussion_value_vectors.csv"),
    )
    parser.add_argument(
        "--active-output",
        type=Path,
        default=Path("results/policy_discussion/korean_policy_discussion_active_values.csv"),
    )
    args = parser.parse_args()

    transcript = read_transcript(args.input, args.sheet_name)
    units = make_claim_units(transcript, args)
    if not units:
        raise RuntimeError("No claim units selected. Check speaker/time filters.")

    print(f"Selected {len(units)} {args.unit} units from {args.input}")
    raw_df, vector_df = score_units(units, args)

    args.raw_output.parent.mkdir(parents=True, exist_ok=True)
    raw_df.to_csv(args.raw_output, index=False, encoding="utf-8-sig")
    vector_df.to_csv(args.vectors_output, index=False, encoding="utf-8-sig")
    active_df = active_value_rows(raw_df, args.active_threshold)
    active_df.to_csv(args.active_output, index=False, encoding="utf-8-sig")

    display_cols = [
        "unit_id",
        "speaker",
        "time",
        "top_presence",
        "top_support_01",
        "top_constraint_01",
        "korean_text",
        "english_text",
    ]
    print(vector_df[display_cols].to_markdown(index=False))
    print(f"\nWrote {args.raw_output}")
    print(f"Wrote {args.vectors_output}")
    print(f"Wrote {args.active_output}")


if __name__ == "__main__":
    main()
