# Contextual Value Tensions Prototype

Rough prototype for testing a shift from a value-visualization dashboard to a deliberation aid that extracts context-specific value tensions from the Korean policy discussion data.

## Concept

Instead of showing only Schwartz value scores, this prototype turns existing argument vectors into editable tension cards:

- context-specific poles such as `주민 결정권` vs `국가 조정력`
- evidence trails back to transcript arguments
- bridge prompts that can be used by a facilitator
- a feasibility panel that tracks how many LLM calls the approach needs

The LLM is used once per synthesis pass, not once per utterance. Existing cached value vectors and active-value rows are reused as the substrate.

## Run

```bash
cd prototypes/contextual-value-tensions
npm run dev
```

Open:

```text
http://localhost:5178
```

The server uses `gpt-5.4-mini` by default and looks for `OPENAI_API_KEY` in:

1. current shell environment
2. repo-root `.env`
3. this prototype's `.env`
4. `/Users/soohwanlee/Desktop/soohwan/80 ORGANIZE/82 Tool/.env`

If the API key is unavailable or the model call fails, the UI falls back to deterministic cards so the prototype can still be reviewed.
