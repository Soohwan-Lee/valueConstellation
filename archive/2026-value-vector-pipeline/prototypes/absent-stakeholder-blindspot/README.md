# Absent Stakeholder & Value Blind Spot Prototype

Rough concept prototype for the 2026-06-04 idea note:

`260604 VC - Idea2 - Absent Stakeholder and Value Blind Spot`

This is intentionally separate from `frontend/`. It reuses the current policy discussion outputs:

- `results/policy_discussion/full_argument_projection_compare.csv`
- `results/policy_discussion/full_argument_vectors.csv`
- `results/policy_discussion/full_argument_projection_compare_metadata.json`
- `results/policy_discussion/figures/full_argument_active_mds_party_cluster.html`

## Concept

The existing Value Constellation view shows what has already been discussed.
This prototype adds an interrogative layer:

- axis end-point labels are placed in the outer margin (outside the plot frame) so they never overlap data points
- sparse value-space zones can be clicked as possible blind spots
- sparse zones are found as geometrically empty regions of the 2D MDS layout, but each zone is additionally annotated with the **19D values that are weakest among its nearby arguments** — the 2D gap only says *where to look*, the 19D weakness is the actual measurement (per `CLAUDE.md`, the 19D signed vector is canonical, the 2D projection is just a view)
- the weak-19D-values are shown in the zone tooltip and in the probe result, and are sent to the LLM so its interpretation is grounded in the measured weakness, not only the empty 2D space
- periodic check-in suggests absent stakeholders
- party and cluster chips work as filters and include compact explanations
- sparse-zone probes generate an explicit facilitator question with target audience, rationale, and delivery mode
- the current question can be sent back to the LLM to simulate possible group answers
- the LLM can suggest additional Empty Chair stakeholders
- selected absent stakeholders can speak through an AI-generated, clearly labeled Empty Chair utterance
- Empty Chair utterances are added back onto the map as dashed diamond markers

### Decision trace

The Decision trace is a general audit register for how the group handles **every probe
question** — blind spot, cluster tension, check-in, or empty chair. For the single question
currently shown in **Question delivery**, the group records whether to `Explore` it now,
`Defer` it, or `Intentionally exclude` it. Each entry shows the decision badge, a `kind` tag
(Blind spot / Tension / Check-in / Empty Chair), a timestamp, the source probe, and the exact
question.

It is keyed by question text, so re-deciding the same question **updates the existing row in
place** instead of appending a new one. If the decision changes (e.g. `Explore` → `Exclude`),
the previous decision is preserved under "이전 결정". Entries can be removed with the `×` button.
This is what keeps the trace from only ever growing.

## Boundary-object features (from `260529 VC - Boundary Object and Decision Support Ideation`)

These move the prototype from a reflection dashboard toward an interactive boundary object for
negotiating value trade-offs and constructing a decision rationale.

### Tension Probe (cluster vs cluster)

Click two cluster centroids (C0, C1, …) on the map. A dashed red connector links them and the
system reads their **top 19D signed Schwartz values** to name the value tension between them.
The probe does not resolve the conflict; it asks whether this is a real value conflict or just
two different time-horizons/scopes, and whether to resolve it or **record it as a trade-off**.
The resulting question flows into the Decision trace like any other probe.

### Rationale Composer + Unresolved Tension Register

`Compose decision rationale` gathers the recorded decisions, the surfaced Empty Chair
utterances, and the active clusters, and drafts a six-part decision rationale:

- 우리가 내리려는 결정 (hedged, never authoritative)
- 우리가 우선한 가치
- 우리가 감수한 trade-off
- **남겨둔 unresolved tension** — a separate, preserved register
- 정당화 맥락
- 재검토가 필요한 조건

Critically, anything the group marked `Defer`, plus any genuine value conflict, is kept in the
Unresolved Tension Register rather than collapsed into false consensus — the core boundary-object
property. The draft is editable as plain markdown (`Edit as text`) so the group can revise it
and paste it into their own minutes. An explicit caveat marks it as an AI-drafted artifact, not
an authoritative decision.

### Not yet implemented (designed, deferred)

- Multi-Perspective Annotation + Negotiated Label (per-stakeholder interpretations of the same
  cluster; AI / participant / group-agreed label layers).

## Run

```bash
cd prototypes/absent-stakeholder-blindspot
npm run dev
```

Open:

```text
http://localhost:5177
```

The server uses `gpt-5.4-mini` by default and looks for `OPENAI_API_KEY` in:

1. the current shell environment
2. repo-root `.env`
3. this prototype's `.env`
4. `/Users/soohwanlee/Desktop/soohwan/80 ORGANIZE/82 Tool/.env`

If no API key is available or the API call fails, the UI falls back to deterministic prototype text so the interaction can still be reviewed.
