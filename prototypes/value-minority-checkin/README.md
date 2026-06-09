# Value Minority Check-in Prototype

New rough prototype after the 2026-06-04 feedback and the 2026-06-05 minority-support reframing note.

This is intentionally separate from the earlier visualization-first prototypes. It treats the system as a **check-in moment** for proactively supporting value minorities:

- LLM-naive transcript analysis instead of ValueEval / ValueNet.
- Person or party-level value orientation instead of only utterance-level scoring.
- Situated value axes extracted from the conversation language.
- Blind spots defined as `Buried Pole`, `Withheld Voice`, or `Latent Axis`.
- AI intervention levels `L1` to `L4`: display, question, latent utterance, grounded reframe.
- Group decision trace for `탐색`, `의도적 제외`, `이월`, and `Contest`.

## Concept (developed 2026-06-06)

See `CONCEPT.md` for the full reasoning. It synthesizes the 2026-06-04 advisor feedback,
the prior CSCW study (`@leeInvestigatingLLMPoweredDissenting`: AIGC succeeded, AIMM failed),
Idea2/Idea3, and Paper Outline Ver.5.0. Key commitments now reflected in the build:

- **Scaffolding, not substitution.** The prior study showed that AI *re-voicing a minority
  anonymously* (AIMM) lowered psychological safety and ownership. So the AI here never speaks
  *for* the minority — it opens the conditions for the minority to speak. L4 re-voicing keeps an
  explicit `[AI생성]` label, names who it supports, and lets the original speaker edit or reject it.
- **Joint-prompting gate.** AI intervention is locked until the group authors the question it
  wants to ask. This stops the AI from jumping from analysis to recommendation.
- **Uptake is required.** Surfacing a buried pole and stopping is harmful (prior study I2). Each
  buried pole must be explicitly handled (탐색 / 이월 / 의도적 제외 / Contest); the UI shows what
  is still `미처리`.
- **Tentative, contestable labels.** Axis labels carry confidence + alternatives and read as
  "could be read as…", not "is…".
- **What-if, not balance-point.** The AI shows the conditional consequence of reflecting a buried
  pole; it never proposes the answer.

## Interface (redesigned 2026-06-06)

The interface is organized as a **5-step check-in flow** (sticky stepper + a guide bar that says
what to do at each step), so a facilitator always knows the next action:

1. **읽기 (Read)** — see where the consensus mass sits. AI stays silent.
2. **발견 (Notice)** — which value pole is buried? (Buried `✦` / Withheld `◌` / Latent `⌀`)
3. **질문 (Ask)** — the group authors/selects the question for AI. *This gate unlocks step 4.*
4. **개입 (Intervene)** — AI opens a place for the minority to speak (L1–L4), all contestable;
   what-if shows conditional consequences only.
5. **처리 (Decide)** — record how each buried pole is handled; unhandled poles stay visible.


Light editorial look (warm paper, green `#23802e` accent, PT Serif) tuned to read as a focused
**check-in moment**, not an always-on dashboard. See `REDESIGN_PLAN.md` for the rationale.

Layout — **plane-first + slide-in detail**:

- **Topbar**: window/source, cached vs llm mode, `Generate check-in`.
- **Left rail (thin)**: this check-in's one-line summary, value axes (importance-ranked, the
  current X/Y are marked), and blind spots. Blind-spot cards are visually distinguished by type
  — `✦` buried (warm, solid), `◌` withheld (warm, dashed), `⌀` latent (green, dashed).
- **Plane (center, the protagonist)**: the buried minority pole is emphasised, the majority
  **합의 무게중심** is drawn as a large faint mass, each person is a large node with a faint
  **spread halo** (its base x/y radius), utterances are small recessive dots, tensions are dashed
  lines + chips. Axis meaning is labelled at the four edge midpoints; the minority-pole end is
  highlighted. An **X/Y axis selector** re-projects the same nodes onto any axis pair
  client-side (internal multi-axis, 2D view) without a server round-trip.
- **What-if card**: front-and-center under the plane — `만약 [묻힌 극]을 동등 반영하면 …` with an
  explicit `≠ AI는 균형점을 제안하지 않습니다` caveat. Linked to the selected blind spot.
- **AI intervention card**: L1–L4 tabs (`표시 / 질문 / AI 발언 / 재표현`) + the decision row.
- **Slide-in detail panel**: clicking any person / utterance / blind spot / tension / axis opens
  a right panel that consolidates detail + grounded evidence + decision trace.

All rendering lives in `public/` (vanilla HTML/CSS/JS). The `server.mjs` data contract is
unchanged, so both the LLM and the deterministic fallback responses drive the same UI.

## Data

Uses:

```text
data/koreanPolicyMakingDiscussion.txt
```

Default segment:

```text
00:50-08:36
```

## Model

The server uses `gpt-5.4-mini`.

It loads `OPENAI_API_KEY` from:

1. the current shell environment
2. repo root `.env`
3. this prototype's `.env`
4. `/Users/soohwanlee/Desktop/soohwan/80 ORGANIZE/82 Tool/.env`

If the model call fails, the UI shows deterministic fallback content so the prototype remains reviewable.

## Run

```bash
cd prototypes/value-minority-checkin
npm run dev
```

Open:

```text
http://localhost:5181
```
