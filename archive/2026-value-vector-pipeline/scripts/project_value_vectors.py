from __future__ import annotations

import argparse
import json
import os
import re
import urllib.error
import urllib.request
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.decomposition import PCA
from sklearn.manifold import MDS, TSNE, trustworthiness
from sklearn.preprocessing import StandardScaler

try:
    from umap import UMAP
except ImportError:  # pragma: no cover - optional dependency
    UMAP = None


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def openai_label(model: str, loadings: dict[str, list[dict[str, float]]], clusters: list[dict[str, object]]) -> dict[str, object]:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return {}
    prompt = {
        "task": "Name PCA axes and clusters for a 2D projection of Schwartz refined human-value vectors from Korean policy debate arguments.",
        "instructions": [
            "Use concise, interpretive labels.",
            "Do not overclaim causality.",
            "Return only valid JSON with keys: x_axis_label, y_axis_label, clusters.",
            "Each cluster label should be short and based on the provided top values and examples.",
        ],
        "loadings": loadings,
        "clusters": clusters,
    }
    payload = {
        "model": model,
        "input": [
            {"role": "system", "content": "You label value-vector projection axes for HCI research. Return only JSON."},
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

    text_parts: list[str] = []
    for item in data.get("output", []):
        for content in item.get("content", []):
            if content.get("type") in {"output_text", "text"} and content.get("text"):
                text_parts.append(content["text"])
    text = "\n".join(text_parts).strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?", "", text).strip()
        text = re.sub(r"```$", "", text).strip()
    return json.loads(text)


def project_matrix(matrix: np.ndarray, method: str, random_state: int) -> tuple[np.ndarray, dict[str, object]]:
    metrics: dict[str, object] = {"method": method}
    if method == "pca":
        pca = PCA(n_components=2, random_state=random_state)
        coords = pca.fit_transform(matrix)
        metrics["explained_variance_ratio"] = {
            "x": float(pca.explained_variance_ratio_[0]),
            "y": float(pca.explained_variance_ratio_[1]),
            "total": float(pca.explained_variance_ratio_[:2].sum()),
        }
        metrics["components"] = pca.components_.tolist()
    elif method == "mds":
        model = MDS(n_components=2, normalized_stress="auto", random_state=random_state, n_init=8)
        coords = model.fit_transform(matrix)
        metrics["stress"] = float(model.stress_)
    elif method == "tsne":
        perplexity = max(5, min(15, (len(matrix) - 1) // 3))
        model = TSNE(
            n_components=2,
            perplexity=perplexity,
            init="pca",
            learning_rate="auto",
            random_state=random_state,
        )
        coords = model.fit_transform(matrix)
        metrics["perplexity"] = perplexity
        metrics["kl_divergence"] = float(model.kl_divergence_)
    elif method == "umap":
        if UMAP is None:
            raise RuntimeError("umap-learn is not installed.")
        n_neighbors = max(5, min(15, len(matrix) // 2))
        model = UMAP(n_components=2, n_neighbors=n_neighbors, min_dist=0.15, random_state=random_state)
        coords = model.fit_transform(matrix)
        metrics["n_neighbors"] = n_neighbors
        metrics["min_dist"] = 0.15
    else:
        raise ValueError(f"Unsupported method: {method}")

    metrics["trustworthiness_5"] = float(trustworthiness(matrix, coords, n_neighbors=min(5, len(matrix) - 1)))
    return coords, metrics


def kmeans(matrix: np.ndarray, k: int, iterations: int = 50) -> np.ndarray:
    if len(matrix) < k:
        return np.arange(len(matrix))
    centers = matrix[np.linspace(0, len(matrix) - 1, k).round().astype(int)].copy()
    labels = np.zeros(len(matrix), dtype=int)
    for _ in range(iterations):
        distances = ((matrix[:, None, :] - centers[None, :, :]) ** 2).sum(axis=2)
        new_labels = distances.argmin(axis=1)
        if np.array_equal(labels, new_labels):
            break
        labels = new_labels
        for cluster_id in range(k):
            members = matrix[labels == cluster_id]
            if len(members):
                centers[cluster_id] = members.mean(axis=0)
    return labels


def top_loadings(values: list[str], component: np.ndarray, n: int = 5) -> dict[str, list[dict[str, float]]]:
    positive_indexes = np.argsort(component)[-n:][::-1]
    negative_indexes = np.argsort(component)[:n]
    return {
        "positive": [{"value": values[i], "loading": float(component[i])} for i in positive_indexes],
        "negative": [{"value": values[i], "loading": float(component[i])} for i in negative_indexes],
    }


def cluster_summaries(df: pd.DataFrame, value_columns: list[str], k: int) -> list[dict[str, object]]:
    summaries = []
    for cluster_id in sorted(df["cluster_id"].unique()):
        subset = df[df["cluster_id"] == cluster_id]
        means = subset[value_columns].mean().sort_values(key=lambda series: series.abs(), ascending=False)
        summaries.append(
            {
                "cluster_id": int(cluster_id),
                "size": int(len(subset)),
                "top_signed_values": [
                    {"value": column.removeprefix("signed__"), "mean_signed": float(value)}
                    for column, value in means.head(5).items()
                ],
                "examples": subset["korean_text"].head(3).tolist(),
            }
        )
    return summaries


def main() -> None:
    load_env_file(Path(".env"))
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--metadata-output", type=Path, required=True)
    parser.add_argument("--clusters", type=int, default=4)
    parser.add_argument("--method", choices=["pca", "mds", "tsne", "umap", "all"], default="pca")
    parser.add_argument("--random-state", type=int, default=42)
    parser.add_argument("--standardize", action="store_true")
    parser.add_argument("--openai-model", default=os.environ.get("OPENAI_MODEL", "gpt-5.4-mini"))
    parser.add_argument("--label-with-openai", action="store_true")
    args = parser.parse_args()

    df = pd.read_csv(args.input)
    value_columns = [column for column in df.columns if column.startswith("signed__")]
    values = [column.removeprefix("signed__") for column in value_columns]
    matrix = df[value_columns].to_numpy(dtype=float)
    if args.standardize:
        matrix = StandardScaler().fit_transform(matrix)

    methods = ["pca", "mds", "tsne", "umap"] if args.method == "all" else [args.method]
    outputs = []
    metadata: dict[str, object] = {
        "method_note": "Projection is for visualization. Clusters are computed in the original 19D value space and then displayed on the 2D projection.",
        "standardized_input": args.standardize,
        "methods": {},
    }
    vector_space_labels = kmeans(matrix, args.clusters)
    for method in methods:
        coords, method_metrics = project_matrix(matrix, method, args.random_state)
        out = df[["unit_id", "speaker", "time", "korean_text", "english_text", "top_signed_support", "top_signed_constraint"]].copy()
        out["projection_method"] = method
        out["x"] = coords[:, 0]
        out["y"] = coords[:, 1]
        out["cluster_id"] = vector_space_labels
        outputs.append(out)

        projection_df = df.copy()
        projection_df["cluster_id"] = vector_space_labels
        method_metadata: dict[str, object] = {
            "metrics": method_metrics,
            "clusters": cluster_summaries(projection_df, value_columns, args.clusters),
        }
        if method == "pca":
            components = np.array(method_metrics["components"])
            method_metadata["loadings"] = {
                "x_positive_vs_negative": top_loadings(values, components[0]),
                "y_positive_vs_negative": top_loadings(values, components[1]),
            }
        metadata["methods"][method] = method_metadata

    output_df = pd.concat(outputs, ignore_index=True)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    output_df.to_csv(args.output, index=False, encoding="utf-8-sig")

    if args.label_with_openai and "pca" in metadata["methods"]:
        pca_metadata = metadata["methods"]["pca"]
        metadata["llm_labels"] = openai_label(
            args.openai_model,
            pca_metadata["loadings"],
            pca_metadata["clusters"],
        )

    args.metadata_output.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {args.output}")
    print(f"Wrote {args.metadata_output}")


if __name__ == "__main__":
    main()
