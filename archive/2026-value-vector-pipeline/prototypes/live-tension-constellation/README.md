# Live Tension Constellation Prototype

A temporal, inspectable map of the **situated values** that actually drive a
multi-stakeholder policy discussion — not a static dashboard of abstract
Schwartz dimensions.

> Don't ask people to reason about "Security" or "Self-direction." Show them the
> concrete values this room is actually fighting over — 지역 생존, 주민 결정권,
> 국가 조정력 — and let them watch those values grow, collide, and shift as the
> debate unfolds.

## What a first-time viewer sees

The primary audience is a **user-study participant who gets no verbal
explanation**, so the interface has to teach itself:

1. **Onboarding (3 steps, first run only)** — what this is, how to read it, what
   to try. Stored in `localStorage` (`vc_onboarded`); clear it to replay.
2. **The constellation is the star.** Eight situated-value nodes are laid out so
   the five tension pairs sit roughly opposite each other. As the discussion
   replays, a node **grows** when its value is invoked and the **edge between two
   nodes thickens** when both are pressed at once.
3. **Always-on legend** explains node size, edge weight, and the speaker dots.
4. **Click any node → "들여다보기" inspector**: what the value means in this
   debate, whether it was mostly **defended (지지)** or **under threat (위협)**,
   how many times it came up, and the single clearest Korean quote behind it.
5. **Seismograph timeline** marks where collisions spiked; click a bar to jump.
6. **가장 강한 충돌** card surfaces the current sharpest pair plus a facilitator
   bridge question, and flashes when a strong new spike appears.

## Why this is the more meaningful HCI direction

A static value map can make group differences salient but cannot show *when* or
*how* tensions form. This temporal replay gives process-level evidence: whose
claim intensified a tension, which values persisted, and where a facilitator
could intervene before positions harden into polarization.

## LLM feasibility

No per-utterance LLM calls during replay. The visual state is driven entirely by
**cached pipeline outputs** (argument segmentation, translation, 19D value
vectors, active-value rows). The LLM is reserved for low-frequency synthesis —
the **✦ 이름 다듬기** button asks `gpt-5.4-mini` once to refine the situated
value labels. In a live deployment this would run on a rolling buffer every few
minutes while the map updates immediately from cheap cached annotations.

## Data flow

```text
results/policy_discussion/full_argument_vectors.csv        (events + text)
results/policy_discussion/full_argument_active_values.csv  (per-value stance)
        │
        ├─ deterministic rules (VALUE_TO_CONCEPT + keyword boosts)  → server.mjs
        ▼
8 situated value concepts  ×  per-concept stats (mentions / support /
constraint / orientation / strongest evidence quote / top speakers)
        ▼
GET /api/data  →  replayed in the browser as a rolling value field
```

The eight situated concepts and their mapping back to Schwartz values live in
`server.mjs` (`CONCEPTS`, `TENSION_PAIRS`, `VALUE_TO_CONCEPT`). They are
deterministic and editable — the intended next step is to let the LLM propose
*new* candidate values, *merges*, and *mislabel* fixes on a rolling buffer, used
as a group-editable boundary object rather than an extraction oracle.

## Run

```bash
cd prototypes/live-tension-constellation
npm run dev
```

Open <http://localhost:5179>.

The server uses `gpt-5.4-mini` and reads `.env` from this folder, the repo root,
or `/Users/soohwanlee/Desktop/soohwan/80 ORGANIZE/82 Tool/.env`. Without an
`OPENAI_API_KEY`, everything works except **이름 다듬기**, which falls back to the
deterministic labels.
