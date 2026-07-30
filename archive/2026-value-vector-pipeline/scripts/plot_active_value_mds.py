from __future__ import annotations

import argparse
import html
import json
import os
import re
import urllib.error
import urllib.request
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from matplotlib import font_manager
from sklearn.manifold import MDS, trustworthiness

from project_value_vectors import kmeans


PARTY_COLORS = {
    "민주당": "#2563eb",
    "국민의힘": "#dc2626",
    "정의당": "#eab308",
    "개혁신당": "#f97316",
    "조국혁신당": "#7c3aed",
}

MARKERS = ["o", "s", "^", "D", "P", "X", "v", "*"]


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def configure_korean_font() -> None:
    font_path = Path("/System/Library/Fonts/AppleSDGothicNeo.ttc")
    if font_path.exists():
        font_manager.fontManager.addfont(str(font_path))
        plt.rcParams["font.family"] = "Apple SD Gothic Neo"
    plt.rcParams["axes.unicode_minus"] = False


def value_label_from_slug(slug: str) -> str:
    special = {
        "self_direction": "Self-direction",
        "power": "Power",
        "security": "Security",
        "conformity": "Conformity",
        "benevolence": "Benevolence",
        "universalism": "Universalism",
    }
    parts = slug.split("_")
    if len(parts) >= 2:
        prefix = "_".join(parts[:2]) if "_".join(parts[:2]) in special else parts[0]
        rest = parts[2:] if prefix in {"self_direction"} else parts[1:]
        title = special.get(prefix, prefix.title())
        if rest:
            return f"{title}: {' '.join(rest).title()}"
    return slug.replace("_", " ").title()


def sentence_case(text: str) -> str:
    return text[:1].upper() + text[1:] if text else text


def truncate(text: str, max_chars: int) -> str:
    text = re.sub(r"\s+", " ", str(text)).strip()
    if len(text) <= max_chars:
        return text
    return text[: max_chars - 3].rstrip() + "..."


def active_value_summary(row: pd.Series, threshold: float, max_items: int = 4) -> str:
    signed_columns = [column for column in row.index if column.startswith("signed__")]
    items: list[tuple[float, str]] = []
    for signed_column in signed_columns:
        slug = signed_column.removeprefix("signed__")
        support = float(row.get(f"support__{slug}", 0.0))
        constraint = float(row.get(f"constraint__{slug}", 0.0))
        strength = max(support, constraint)
        if strength < threshold:
            continue
        stance = "support" if support >= constraint else "constraint"
        sign = "+" if stance == "support" else "-"
        label = value_label_from_slug(slug)
        items.append((strength, f"{label} {sign}{strength:.2f}"))
    items.sort(reverse=True, key=lambda item: item[0])
    return "; ".join(item for _, item in items[:max_items]) or "No active value"


def top_signed_items(series: pd.Series, n: int = 6) -> list[dict[str, float | str]]:
    ordered = series.sort_values(key=lambda values: values.abs(), ascending=False).head(n)
    return [
        {
            "value": value_label_from_slug(column.removeprefix("signed__")),
            "mean_signed": round(float(value), 4),
        }
        for column, value in ordered.items()
    ]


def edge_summary(active_df: pd.DataFrame, signed_columns: list[str], axis: str, direction: str, n: int = 12) -> dict[str, object]:
    subset = active_df.nsmallest(n, axis) if direction == "negative" else active_df.nlargest(n, axis)
    return {
        "axis": axis,
        "direction": direction,
        "top_mean_signed_values": top_signed_items(subset[signed_columns].mean()),
        "party_counts": subset["speaker"].value_counts().to_dict(),
        "examples": [
            {
                "speaker": str(row.speaker),
                "time": str(row.time),
                "active_values": str(row.active_value_summary),
                "text": truncate(str(row.korean_text), 180),
            }
            for row in subset.head(5).itertuples(index=False)
        ],
    }


def cluster_summaries_for_llm(active_df: pd.DataFrame, signed_columns: list[str]) -> list[dict[str, object]]:
    summaries = []
    for cluster_id in sorted(active_df["cluster_id"].unique()):
        subset = active_df[active_df["cluster_id"] == cluster_id].copy()
        subset["distance_to_center"] = np.sqrt(
            (subset["x"] - subset["x"].mean()) ** 2 + (subset["y"] - subset["y"].mean()) ** 2
        )
        examples = subset.sort_values(["distance_to_center", "max_active_strength"], ascending=[True, False]).head(5)
        summaries.append(
            {
                "cluster_id": int(cluster_id),
                "size": int(len(subset)),
                "party_counts": subset["speaker"].value_counts().to_dict(),
                "top_mean_signed_values": top_signed_items(subset[signed_columns].mean()),
                "examples": [
                    {
                        "speaker": str(row.speaker),
                        "time": str(row.time),
                        "active_values": str(row.active_value_summary),
                        "text": truncate(str(row.korean_text), 220),
                    }
                    for row in examples.itertuples(index=False)
                ],
            }
        )
    return summaries


def request_llm_labels(active_df: pd.DataFrame, signed_columns: list[str], model: str) -> dict[str, object]:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return {}

    prompt = {
        "task": "Interpret an active-only 2D metric MDS projection of 19D signed human-value vectors from a Korean policy debate.",
        "important_caveat": (
            "MDS axes are layout coordinates inferred from pairwise distances, not theoretical latent variables. "
            "Name axes only as heuristic readings from extreme points."
        ),
        "desired_language": "Korean",
        "required_json_schema": {
            "x_axis_label": "short label for x axis as 'left pole ↔ right pole'",
            "x_negative_label": "short label for low-x side",
            "x_positive_label": "short label for high-x side",
            "y_axis_label": "short label for y axis as 'bottom pole ↔ top pole'",
            "y_negative_label": "short label for low-y side",
            "y_positive_label": "short label for high-y side",
            "axis_caveat": "one concise Korean caveat",
            "clusters": [
                {
                    "cluster_id": 0,
                    "label": "2-5 Korean words",
                    "meaning": "one concise Korean sentence",
                    "caveat": "one concise Korean caveat if needed",
                }
            ],
        },
        "axis_extremes": {
            "x_negative": edge_summary(active_df, signed_columns, "x", "negative"),
            "x_positive": edge_summary(active_df, signed_columns, "x", "positive"),
            "y_negative": edge_summary(active_df, signed_columns, "y", "negative"),
            "y_positive": edge_summary(active_df, signed_columns, "y", "positive"),
        },
        "clusters": cluster_summaries_for_llm(active_df, signed_columns),
    }
    payload = {
        "model": model,
        "input": [
            {
                "role": "system",
                "content": (
                    "You label value-vector maps for an HCI research prototype. "
                    "Return only valid JSON. Do not overclaim. Use concise Korean labels."
                ),
            },
            {"role": "user", "content": json.dumps(prompt, ensure_ascii=False)},
        ],
    }
    request = urllib.request.Request(
        "https://api.openai.com/v1/responses",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"OpenAI label request failed: {detail}") from exc

    chunks: list[str] = []
    for item in data.get("output", []):
        for content in item.get("content", []):
            if content.get("type") in {"output_text", "text"} and content.get("text"):
                chunks.append(content["text"])
    text = "\n".join(chunks).strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?", "", text).strip()
        text = re.sub(r"```$", "", text).strip()
    return json.loads(text)


def cluster_label_map(metadata: dict[str, object]) -> dict[int, str]:
    labels = {}
    interpretation = metadata.get("llm_interpretation", {})
    if not isinstance(interpretation, dict):
        return labels
    for item in interpretation.get("clusters", []):
        if isinstance(item, dict) and "cluster_id" in item and item.get("label"):
            labels[int(item["cluster_id"])] = str(item["label"])
    return labels


def axis_label(metadata: dict[str, object], axis: str, fallback: str) -> str:
    interpretation = metadata.get("llm_interpretation", {})
    if isinstance(interpretation, dict):
        value = interpretation.get(f"{axis}_axis_label")
        if value:
            return str(value)
    return fallback


def prepare_active_projection(df: pd.DataFrame, threshold: float, clusters: int, random_state: int) -> tuple[pd.DataFrame, dict[str, object], list[str]]:
    signed_columns = [column for column in df.columns if column.startswith("signed__")]
    support_columns = [column for column in df.columns if column.startswith("support__")]
    constraint_columns = [column for column in df.columns if column.startswith("constraint__")]
    if not signed_columns:
        raise ValueError("No signed__ value columns found.")

    max_active = df[support_columns + constraint_columns].max(axis=1)
    active_df = df[max_active >= threshold].copy()
    if len(active_df) < 3:
        raise ValueError(f"Only {len(active_df)} active units found at threshold {threshold}.")

    matrix = active_df[signed_columns].to_numpy(dtype=float)
    labels = kmeans(matrix, clusters)
    model = MDS(n_components=2, normalized_stress="auto", random_state=random_state, n_init=8, init="random")
    coords = model.fit_transform(matrix)

    active_df["x"] = coords[:, 0]
    active_df["y"] = coords[:, 1]
    active_df["cluster_id"] = labels
    active_df["active_value_summary"] = active_df.apply(lambda row: active_value_summary(row, threshold), axis=1)
    active_df["max_active_strength"] = max_active.loc[active_df.index].to_numpy()

    metadata = {
        "threshold": threshold,
        "input_units": int(len(df)),
        "active_units": int(len(active_df)),
        "active_rule": "keep units where any support__value or constraint__value is >= threshold",
        "projection": "metric MDS recomputed on active units only, using 19 signed__ value dimensions",
        "clustering": f"k-means with k={clusters}, computed in the active subset's original 19D signed-value space",
        "stress": float(model.stress_),
        "trustworthiness_5": float(trustworthiness(matrix, coords, n_neighbors=min(5, len(matrix) - 1))),
    }
    return active_df, metadata, signed_columns


def write_png(active_df: pd.DataFrame, metadata: dict[str, object], output: Path, title: str) -> None:
    configure_korean_font()
    fig, ax = plt.subplots(figsize=(10, 7.5), dpi=180)
    speakers = sorted(active_df["speaker"].dropna().unique())
    clusters = sorted(active_df["cluster_id"].unique())
    labels = cluster_label_map(metadata)

    for speaker in speakers:
        speaker_df = active_df[active_df["speaker"] == speaker]
        color = PARTY_COLORS.get(speaker, "#64748b")
        for cluster_id in clusters:
            subset = speaker_df[speaker_df["cluster_id"] == cluster_id]
            if subset.empty:
                continue
            marker = MARKERS[int(cluster_id) % len(MARKERS)]
            ax.scatter(
                subset["x"],
                subset["y"],
                s=34 + subset["max_active_strength"] * 34,
                c=color,
                marker=marker,
                edgecolor="white",
                linewidth=0.5,
                alpha=0.82,
            )

    for cluster_id in clusters:
        subset = active_df[active_df["cluster_id"] == cluster_id]
        ax.text(
            subset["x"].mean(),
            subset["y"].mean(),
            f"C{cluster_id}\n{labels.get(int(cluster_id), '')}".strip(),
            fontsize=8,
            weight="bold",
            ha="center",
            va="center",
            bbox={"boxstyle": "round,pad=0.25", "facecolor": "white", "edgecolor": "#cbd5e1", "alpha": 0.86},
        )

    speaker_handles = [
        plt.Line2D([0], [0], marker="o", color="none", label=speaker, markerfacecolor=PARTY_COLORS.get(speaker, "#64748b"), markersize=7)
        for speaker in speakers
    ]
    cluster_handles = [
        plt.Line2D(
            [0],
            [0],
            marker=MARKERS[int(cluster_id) % len(MARKERS)],
            color="#334155",
            label=f"C{cluster_id} {labels.get(int(cluster_id), '')}".strip(),
            linestyle="None",
            markersize=7,
        )
        for cluster_id in clusters
    ]
    first_legend = ax.legend(handles=speaker_handles, title="party/speaker", loc="upper left", frameon=False)
    ax.add_artist(first_legend)
    ax.legend(handles=cluster_handles, title="cluster", loc="lower left", frameon=False)

    ax.set_title(title, loc="left", fontsize=13, weight="bold")
    ax.set_xlabel(f"MDS dimension 1: {axis_label(metadata, 'x', 'low x ↔ high x')}")
    ax.set_ylabel(f"MDS dimension 2: {axis_label(metadata, 'y', 'low y ↔ high y')}")
    ax.text(
        0.01,
        -0.12,
        metadata.get(
            "axis_caveat",
            "Color = party/speaker, marker = 19D cluster, size = strongest active value. MDS axes are layout coordinates, not theoretical axes.",
        ),
        transform=ax.transAxes,
        fontsize=8,
        color="#475569",
    )
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.grid(True, color="#e2e8f0", linewidth=0.7)
    output.parent.mkdir(parents=True, exist_ok=True)
    fig.tight_layout()
    fig.savefig(output, bbox_inches="tight")
    plt.close(fig)


def write_html(active_df: pd.DataFrame, metadata: dict[str, object], output: Path, title: str) -> None:
    width = 1100
    height = 760
    pad = 54
    x_min, x_max = active_df["x"].min(), active_df["x"].max()
    y_min, y_max = active_df["y"].min(), active_df["y"].max()
    x_span = x_max - x_min or 1.0
    y_span = y_max - y_min or 1.0

    def sx(value: float) -> float:
        return pad + (float(value) - x_min) / x_span * (width - 2 * pad)

    def sy(value: float) -> float:
        return height - pad - (float(value) - y_min) / y_span * (height - 2 * pad)

    points = []
    labels = cluster_label_map(metadata)
    for row in active_df.itertuples(index=False):
        text = truncate(getattr(row, "korean_text"), 520)
        english = truncate(getattr(row, "english_text"), 360)
        cluster_label = labels.get(int(row.cluster_id), "")
        tooltip = (
            f"<strong>{html.escape(str(row.speaker))} · {html.escape(str(row.time))} · C{int(row.cluster_id)} {html.escape(cluster_label)}</strong>"
            f"<br><em>{html.escape(str(row.active_value_summary))}</em>"
            f"<br><br>{html.escape(text)}"
            f"<br><br><span class='en'>{html.escape(english)}</span>"
        )
        points.append(
            {
                "cx": sx(row.x),
                "cy": sy(row.y),
                "r": 4.5 + float(row.max_active_strength) * 5,
                "color": PARTY_COLORS.get(str(row.speaker), "#64748b"),
                "cluster": int(row.cluster_id),
                "speaker": str(row.speaker),
                "tooltip": tooltip,
            }
        )

    circles = "\n".join(
        (
            f'<circle class="point cluster-{point["cluster"]}" cx="{point["cx"]:.2f}" cy="{point["cy"]:.2f}" '
            f'r="{point["r"]:.2f}" fill="{point["color"]}" data-speaker="{html.escape(point["speaker"])}" '
            f'data-cluster="C{point["cluster"]}" data-tooltip="{html.escape(point["tooltip"], quote=True)}" />'
        )
        for point in points
    )
    speakers = sorted(active_df["speaker"].dropna().unique())
    clusters = sorted(active_df["cluster_id"].unique())
    speaker_legend = "\n".join(
        f'<button class="legend-chip" data-filter-type="speaker" data-filter-value="{html.escape(str(speaker))}"><span style="background:{PARTY_COLORS.get(str(speaker), "#64748b")}"></span>{html.escape(str(speaker))}</button>'
        for speaker in speakers
    )
    cluster_legend = "\n".join(
        f'<button class="legend-chip" data-filter-type="cluster" data-filter-value="C{int(cluster_id)}">C{int(cluster_id)} {html.escape(labels.get(int(cluster_id), ""))}</button>'
        for cluster_id in clusters
    )
    cluster_labels = "\n".join(
        f'<text x="{sx(subset["x"].mean()):.2f}" y="{sy(subset["y"].mean()):.2f}" class="cluster-label">C{int(cluster_id)} {html.escape(labels.get(int(cluster_id), ""))}</text>'
        for cluster_id in clusters
        for subset in [active_df[active_df["cluster_id"] == cluster_id]]
    )
    cluster_cards = "\n".join(
        (
            f"<li><strong>C{int(item.get('cluster_id'))} {html.escape(str(item.get('label', '')))}</strong>: "
            f"{html.escape(str(item.get('meaning', '')))}"
            f"<span>{html.escape(str(item.get('caveat', '')))}</span></li>"
        )
        for item in metadata.get("llm_interpretation", {}).get("clusters", [])
        if isinstance(item, dict)
    )
    x_axis_text = axis_label(metadata, "x", "low x ↔ high x")
    y_axis_text = axis_label(metadata, "y", "low y ↔ high y")
    axis_caveat = metadata.get("axis_caveat", "MDS axes are layout coordinates, not theoretical value axes.")
    html_text = f"""<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{html.escape(title)}</title>
<style>
  body {{ margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #0f172a; background: #f8fafc; }}
  main {{ max-width: 1240px; margin: 24px auto; padding: 0 20px 28px; }}
  h1 {{ margin: 0 0 6px; font-size: 22px; letter-spacing: 0; }}
  .meta {{ color: #475569; font-size: 13px; margin-bottom: 14px; }}
  .toolbar {{ display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0 16px; align-items: center; }}
  .legend-chip {{ border: 1px solid #cbd5e1; background: white; color: #0f172a; border-radius: 999px; padding: 6px 10px; font-size: 13px; cursor: pointer; }}
  .legend-chip span {{ display: inline-block; width: 10px; height: 10px; border-radius: 999px; margin-right: 6px; vertical-align: -1px; }}
  .legend-chip.active {{ background: #0f172a; color: white; border-color: #0f172a; }}
  .panel {{ background: white; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }}
  .interpretation {{ display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr); gap: 14px; margin: 14px 0; }}
  .interpretation section {{ background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; }}
  .interpretation h2 {{ font-size: 14px; margin: 0 0 8px; }}
  .interpretation p {{ margin: 0 0 6px; color: #334155; font-size: 13px; line-height: 1.45; }}
  .interpretation ul {{ margin: 0; padding-left: 18px; color: #334155; font-size: 13px; line-height: 1.45; }}
  .interpretation li {{ margin: 0 0 5px; }}
  .interpretation li span {{ color: #64748b; margin-left: 4px; }}
  svg {{ display: block; width: 100%; height: auto; }}
  .axis {{ stroke: #cbd5e1; stroke-width: 1; }}
  .point {{ stroke: white; stroke-width: 1.2; opacity: 0.82; cursor: pointer; transition: opacity .12s, stroke-width .12s; }}
  .point:hover {{ opacity: 1; stroke: #0f172a; stroke-width: 2.2; }}
  .point.dimmed {{ opacity: 0.12; }}
  .cluster-label {{ font-size: 13px; font-weight: 700; text-anchor: middle; dominant-baseline: central; paint-order: stroke; stroke: white; stroke-width: 5px; fill: #334155; }}
  #tooltip {{ position: fixed; z-index: 10; max-width: 560px; pointer-events: none; background: #0f172a; color: white; border-radius: 8px; padding: 12px 14px; font-size: 13px; line-height: 1.45; box-shadow: 0 16px 40px rgba(15, 23, 42, .24); display: none; }}
  #tooltip em {{ color: #bae6fd; font-style: normal; }}
  #tooltip .en {{ color: #cbd5e1; }}
  .note {{ color: #475569; font-size: 12px; margin-top: 10px; }}
</style>
</head>
<body>
<main>
  <h1>{html.escape(title)}</h1>
  <div class="meta">Active rule: any support/constraint score &gt;= {metadata["threshold"]}. {metadata["active_units"]} active units out of {metadata["input_units"]}. Hover points to inspect utterances.</div>
  <div class="interpretation">
    <section>
      <h2>Axis reading</h2>
      <p><strong>X:</strong> {html.escape(x_axis_text)}</p>
      <p><strong>Y:</strong> {html.escape(y_axis_text)}</p>
      <p>{html.escape(str(axis_caveat))}</p>
    </section>
    <section>
      <h2>Cluster labels</h2>
      <ul>{cluster_cards}</ul>
    </section>
  </div>
  <div class="toolbar">
    <button class="legend-chip active" data-filter-type="all" data-filter-value="all">All</button>
    {speaker_legend}
    {cluster_legend}
  </div>
  <div class="panel">
    <svg viewBox="0 0 {width} {height}" role="img" aria-label="{html.escape(title)}">
      <line class="axis" x1="{pad}" y1="{height - pad}" x2="{width - pad}" y2="{height - pad}" />
      <line class="axis" x1="{pad}" y1="{pad}" x2="{pad}" y2="{height - pad}" />
      {circles}
      {cluster_labels}
      <text x="{width / 2}" y="{height - 16}" text-anchor="middle" fill="#64748b" font-size="12">MDS dimension 1: {html.escape(x_axis_text)}</text>
      <text x="18" y="{height / 2}" text-anchor="middle" fill="#64748b" font-size="12" transform="rotate(-90 18 {height / 2})">MDS dimension 2</text>
    </svg>
  </div>
  <div class="note">Color = party/speaker. Cluster labels C0-C{max(clusters)} are computed in 19D signed-value space, then displayed on an active-only MDS layout. Axes are layout coordinates, not theoretical value axes.</div>
</main>
<div id="tooltip"></div>
<script>
const tooltip = document.getElementById('tooltip');
const points = [...document.querySelectorAll('.point')];
const buttons = [...document.querySelectorAll('.legend-chip')];
for (const point of points) {{
  point.addEventListener('mousemove', event => {{
    tooltip.innerHTML = point.dataset.tooltip;
    tooltip.style.display = 'block';
    const margin = 18;
    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;
    let left = event.clientX + margin;
    let top = event.clientY + margin;
    if (left + width > window.innerWidth) left = event.clientX - width - margin;
    if (top + height > window.innerHeight) top = event.clientY - height - margin;
    tooltip.style.left = `${{Math.max(8, left)}}px`;
    tooltip.style.top = `${{Math.max(8, top)}}px`;
  }});
  point.addEventListener('mouseleave', () => {{ tooltip.style.display = 'none'; }});
}}
for (const button of buttons) {{
  button.addEventListener('click', () => {{
    buttons.forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    const type = button.dataset.filterType;
    const value = button.dataset.filterValue;
    points.forEach(point => {{
      const keep = type === 'all' || point.dataset[type] === value;
      point.classList.toggle('dimmed', !keep);
    }});
  }});
}}
</script>
</body>
</html>
"""
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(html_text, encoding="utf-8")


def main() -> None:
    load_env_file(Path(".env"))
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=Path("results/policy_discussion/full_argument_vectors.csv"))
    parser.add_argument("--output-csv", type=Path, default=Path("results/policy_discussion/full_argument_active_mds_projection.csv"))
    parser.add_argument("--output-metadata", type=Path, default=Path("results/policy_discussion/full_argument_active_mds_projection_metadata.json"))
    parser.add_argument("--output-png", type=Path, default=Path("results/policy_discussion/figures/full_argument_active_mds_party_cluster.png"))
    parser.add_argument("--output-html", type=Path, default=Path("results/policy_discussion/figures/full_argument_active_mds_party_cluster.html"))
    parser.add_argument("--threshold", type=float, default=0.20)
    parser.add_argument("--clusters", type=int, default=6)
    parser.add_argument("--random-state", type=int, default=42)
    parser.add_argument("--openai-model", default=os.environ.get("OPENAI_MODEL", "gpt-5.4-mini"))
    parser.add_argument("--skip-openai-labels", action="store_true")
    args = parser.parse_args()

    df = pd.read_csv(args.input)
    active_df, metadata, signed_columns = prepare_active_projection(df, args.threshold, args.clusters, args.random_state)
    title = f"Active-only MDS map of Korean policy discussion value vectors (threshold {args.threshold:.2f})"

    if not args.skip_openai_labels:
        try:
            llm_interpretation = request_llm_labels(active_df, signed_columns, args.openai_model)
            if llm_interpretation:
                metadata["llm_interpretation"] = llm_interpretation
                metadata["axis_caveat"] = llm_interpretation.get(
                    "axis_caveat",
                    "MDS 축 라벨은 양끝 발화 기반의 해석 보조값이며 이론적 잠재축은 아님.",
                )
        except Exception as exc:  # noqa: BLE001 - keep plotting even if labeling fails.
            metadata["llm_interpretation_error"] = str(exc)

    labels = cluster_label_map(metadata)
    if labels:
        active_df["cluster_label"] = active_df["cluster_id"].map(lambda value: labels.get(int(value), ""))
    else:
        active_df["cluster_label"] = ""

    keep_columns = [
        "unit_id",
        "speaker",
        "time",
        "korean_text",
        "english_text",
        "x",
        "y",
        "cluster_id",
        "cluster_label",
        "max_active_strength",
        "active_value_summary",
        "top_signed_support",
        "top_signed_constraint",
    ]
    active_df[keep_columns].to_csv(args.output_csv, index=False, encoding="utf-8-sig")
    args.output_metadata.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
    write_png(active_df, metadata, args.output_png, title)
    write_html(active_df, metadata, args.output_html, title)

    print(f"Active units: {metadata['active_units']} / {metadata['input_units']}")
    print(f"MDS stress: {metadata['stress']:.6f}")
    print(f"Trustworthiness@5: {metadata['trustworthiness_5']:.6f}")
    if metadata.get("llm_interpretation"):
        print("LLM labels: yes")
    else:
        print(f"LLM labels: no ({metadata.get('llm_interpretation_error', 'OPENAI_API_KEY missing')})")
    print(f"Wrote {args.output_csv}")
    print(f"Wrote {args.output_metadata}")
    print(f"Wrote {args.output_png}")
    print(f"Wrote {args.output_html}")


if __name__ == "__main__":
    main()
