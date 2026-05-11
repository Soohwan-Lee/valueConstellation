# Repository Guidelines

## Project Structure & Module Organization

This repository is an early research prototype for Value Constellation. Keep the structure simple and explicit:

- `README.md`: project overview.
- `CLAUDE.md`: local agent/context notes for this repository.
- `scripts/`: standalone research or evaluation scripts, such as `scripts/valuesnet_probe.py`.
- `results/`: generated experiment outputs, such as CSV summaries.
- `LICENSE`: project license.

Add source modules only when shared logic emerges. Prefer `src/` for reusable Python code and `tests/` for automated tests once the prototype grows beyond standalone scripts.

## Build, Test, and Development Commands

There is no package build step yet. The current reproducible environment is a conda environment:

```bash
conda activate valueconstellation-valuesnet
python scripts/valuesnet_probe.py
```

Run the ValuesNet probe and write the CSV output:

```bash
conda run -n valueconstellation-valuesnet python scripts/valuesnet_probe.py
```

If recreating the environment, install the current runtime dependencies:

```bash
python -m pip install transformers torch sentencepiece protobuf safetensors pandas tabulate
```

## Coding Style & Naming Conventions

Use Python 3.11+ and keep scripts readable, typed where practical, and self-contained. Follow PEP 8 conventions:

- 4-space indentation.
- `snake_case` for functions, variables, and file names.
- `UPPER_CASE` for constants.
- Prefer `pathlib.Path` over raw path manipulation.

Do not add broad abstractions until multiple scripts share the same logic.

## Testing Guidelines

No formal test framework is configured yet. For now, treat script execution as the smoke test and verify generated outputs in `results/`.

When tests are added, use `pytest`, place files under `tests/`, and name them `test_<module>.py`. Keep fixtures small and avoid downloading large models during default test runs; use mocks or cached sample outputs where possible.

## Commit & Pull Request Guidelines

Git history currently contains only the initial commit, so no repository-specific convention has been established. Use concise, imperative commit messages, preferably Conventional Commits:

```text
feat: add valuesnet probe script
docs: summarize model evaluation results
```

Pull requests should include a short purpose statement, changed files or workflows, commands run, and any generated artifacts. For visualization or Obsidian-facing changes, include screenshots or note paths when relevant.

## Security & Configuration Tips

Do not commit secrets, API keys, Hugging Face tokens, or private research data. Large downloaded models should remain in local caches, not in the repository. Generated outputs in `results/` should be small, reproducible, and safe to share.
