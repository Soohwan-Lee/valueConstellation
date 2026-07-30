# Value Minority Check-in — 컨셉 구체화

작성: 2026-06-06
입력 문서:
- `260604 -prof.Hajin & prof.Kyungho & Soohwan` (교수님 피드백)
- `@leeInvestigatingLLMPoweredDissenting` (선행 CSCW 논문 — AIGC vs AIMM)
- `260604 VC - Idea2 (Absent Stakeholder)`, `Idea3 (Emergent Value Axis)`
- `VC - Paper Outline (Ver.5.0)` (contestable shared artifact로의 포지셔닝 전환)
- `260605 VC - Minority Support Reframing` (problem 확정)

이 문서는 "예쁜 시각화"를 넘어, **이 시스템이 실제로 value minority를 어떻게 support하는가 / 어떻게 쓰이는가 / 무엇이 차별점인가**를 못 박는다. 구현(`server.mjs`, `public/`)은 이 문서를 따른다.

---

## 0. 한 문장

> Value Minority Check-in은 그룹 숙의의 **체크인 순간**에, 다수 합의에 묻힌 **가치 소수자의 가치극**을 그룹의 언어로 외재화하고 — AI가 그 소수를 *대신 말하지 않고* — 소수가 스스로 말할 수 있는 **조건(scaffolding)**을 만들어, 그룹이 그 가치를 동등하게 보고 함께 판정하도록 돕는다.

---

## 1. 왜 지금 "이해가 안 되는가" — 진짜 원인

현재 프로토타입은 **분석 결과를 보여주지만, "지금 무엇을 하라"를 안 알려준다.** 화면을 본 진행자의 머릿속:

> "축이 3개, 점이 잔뜩, 패널이 여럿. …그래서 나는 뭘 하지?"

이건 시각 디자인 문제가 아니라 **use-flow(행동 경로)의 부재**다. 그리고 선행 연구가 가르쳐준 핵심 메커니즘들이 UI에 없다. 그래서 "그냥 또 하나의 대시보드"로 보인다 — 교수님이 정확히 경고한 그 지점(§passive dashboard는 novelty 약함).

---

## 2. 선행 논문이 못 박은 설계 원칙 (가장 중요)

`@leeInvestigatingLLMPoweredDissenting` (당신의 CSCW 논문)의 실험 결과는 이 시스템의 **나침반**이다:

| 개입 | 무엇 | 결과 |
|---|---|---|
| **AIMM** | AI가 소수 의견을 익명으로 *재표현* (소수를 대신 말함) | ❌ 심리적 안전감↓, 소유권↓, "AI니까 무시"(P6), "내 책임인가 AI 책임인가"(P12) |
| **AIGC** | AI가 자율 반론을 생성해 *분위기*를 바꿈 (소수를 대신 말하지 않음) | ✅ 만족도↑, "나만 튀는 게 아니라는 느낌"(P76), 분위기 유동화 |

→ **세 가지 못박힌 교훈:**

1. **Substitution이 아니라 Scaffolding.** AI가 소수를 *대신* 말하면 소유권·안전감이 무너진다. AI는 소수가 *말할 수 있는 조건*을 만들어야 한다. (P60: "지원 역할이면 쓰겠지만 대체제면 안 쓴다.")
2. **무시된 개입은 오히려 해롭다.** 그래서 **수용 메커니즘(uptake)**이 필수다 (논문 I2). 묻힌 극을 띄우고 끝나면 안 되고, 그룹이 그것을 *처리*하게 해야 한다.
3. **출처 모호화는 실패한다.** 명시적 [AI생성] 라벨 + 인간 입력의 명확한 귀속이 정당성을 높인다 (논문 I5). → contestability + tentative label.

> **이 시스템의 정체성 = AIGC의 성공 원리를 value-minority에 적용한 것.** "AI가 소수를 대변"(AIMM, 실패)이 아니라 "AI가 묻힌 가치극을 그룹 앞에 동등하게 세우고, 소수가 그 자리에서 직접 말하도록 분위기·조건을 만든다"(AIGC 계열, 성공).

---

## 3. "Support"의 구체적 메커니즘 — AI는 정확히 무엇을 하는가

교수님 질문: *"minority에게 도움 되는 mechanism은 무엇인가? group에게 도움인가 individual에게 도움인가?"* → 답:

### 3.1 네 가지 support 행동 (개입 수준 L1–L4 재정의)

기존 L1–L4를 **"AI가 소수를 얼마나 대신하는가"가 아니라 "소수가 말할 자리를 얼마나 강하게 여는가"** 축으로 재정의한다. 핵심: **L1→L4로 갈수록 AI 개입은 세지지만, 항상 소수의 발언권을 AI가 가져가지 않는다.**

| 수준 | AI 행동 | 누구를 support | substitution 위험 회피 방식 |
|---|---|---|---|
| **L1 표시 (Surface)** | 묻힌 가치극에 ⚠ 표시 + 근거 발화 인용 | group(공동 주의) + minority(내 가치가 보임) | AI는 말 안 함. 그냥 *보이게*만. |
| **L2 질문 (Open)** | 진행자가 그룹에 던질 질문 생성 ("검증 관점이 덜 다뤄졌는데 짚을까요?") | group(의제로 승격) | AI가 *답*을 주지 않고 *자리*를 연다. 답은 소수가. |
| **L3 조건문 (What-if)** | "이 극을 동등 반영하면 결정이 이렇게 달라질 수 있음" | group(결과 가시화) | 균형점 *제안 안 함*. 조건적 결과만. 반영 여부는 그룹. |
| **L4 재표현 (Re-voice, grounded)** | 나왔다 묻힌 입장을 *원발화 grounding과 함께* 재표현 | minority(내 말이 정리됨) + group | [AI생성] 명시 + **원화자가 수정/contest 가능** → 소유권 보존. AIMM과 결정적 차이: 익명 마스킹 ❌, 출처 명시 ✅. |

**선행 논문과의 연결**: L1–L2는 AIGC형(분위기·자리 만들기, 성공 검증됨). L4는 AIMM의 실패를 *고친* 버전 — 익명 재표현(실패)이 아니라 **출처 명시 + contestable + 원화자 통제**(논문 I4·I5의 처방 그대로).

### 3.2 수용 메커니즘 (uptake) — 묻힌 극을 띄운 뒤 반드시 따라옴

논문 I2의 처방. 묻힌 극을 표시하고 끝내지 않는다. 그룹은 매 체크인에서 각 묻힌 극을 **명시적으로 처리**한다:

- **탐색(Explore)** → 지금 의제로 올림
- **이월(Defer)** → 다음 체크인 미해결 항목
- **의도적 제외(Set aside)** → 이유를 남김 (정당한 기각도 숙의다)
- **Contest** → AI의 추론·라벨·배치가 틀렸다 → 흔적이 남고 결정 기록에 반영

→ 이 처리 자체가 **결정 rationale**가 된다. "우리가 무엇을 우선했고 무엇을 묻었나"의 기록.

### 3.3 누구에게 도움인가 (교수님 질문에 대한 명시적 답)

- **Minority individual에게**: 내 가치가 *외재화되어 동등하게 보인다*(L1) + 내 말이 grounding과 함께 정리된다(L4, 소유권 유지) + 내가 직접 말할 *자리*가 열린다(L2). → "나만 튀는 게 아니다"(P76 효과)를 가치 차원에서 재현.
- **Group에게**: 묻힌 가치극을 의제로 끌어와 결정의 *포괄성·정당성*↑ + 무엇을 묻었는지 *의식적 기록*. → premature convergence 방지.
- **명시적 비목표**: AI가 결론을 바꾸는 것. (선행 논문에서 두 개입 다 결과는 80% 시니어 일치 — 결과를 못 바꿈. 그래서 우리는 *결과*가 아니라 *과정의 포괄성*을 목표로 한다. 이게 honest한 claim.)

---

## 4. 차별점 (Novelty) — 무엇과 어떻게 다른가

교수님: *"단순 viz는 CSCW/viz 연구와 비교당해 novelty 약함."* → 명확한 4축 차별화:

### 4.1 선행 연구 대비 위치

| 선행 흐름 | 그들이 하는 것 | 우리의 차별 |
|---|---|---|
| **AI facilitation/mediation** (요약·반론·타협안 생성) | AI가 *답/타협안*을 직접 생성 → over-reliance, premature convergence | AI는 답을 안 줌. **묻힌 가치극을 contestable artifact로 외재화**하고 소수가 말할 조건만 만듦. |
| **Reflection dashboard / group awareness** (발언량·turn-taking·sentiment) | 표면적 *과정*을 보여줌 | 발화 *아래의 가치 구조*를, 그것도 **묻힌 minority 극**에 초점. passive 표시가 아니라 uptake 강제(proactive). |
| **NLP value detection** (ValueEval, Schwartz 분류) | offline corpus 분류, *보편* taxonomy | **이 대화의 언어로 맥락 의존 가치극을 귀납 추출**(Idea3), 실시간 그룹 앞에서. 보편축 아님. |
| **AIMC / 소수 대변** (당신 선행 AIMM 포함) | AI가 소수를 *대신* 말함(익명 재표현) → 소유권↓ | **Substitution이 아니라 scaffolding.** 출처 명시 + 원화자 contest. AIMM 실패를 고친 설계. |

### 4.2 한 줄 포지셔닝 (Paper Outline Ver.5.0과 정합)

> AI가 그룹 숙의에 기여하는 방식은 *더 나은 결론을 제안*하는 것이 아니라, 말 속에 묻힌 **가치 소수자의 가치극**을 **공유·의심·수정 가능한(contestable) reflection artifact**로 외재화하고, 그 소수가 스스로 말할 **자리를 여는 것**이다.

### 4.3 핵심 디자인 원칙 (Ver.5.0 DG + 선행 논문 통합)

1. **Issue-first, not person-first.** 사람을 가치 진영으로 고정하지 않는다. 묻힌 *극*과 *쟁점*이 먼저. 사람은 레이어. (FF2: "this cluster emphasizes accountability"는 편안, "Alex values control"은 위협.)
2. **Tentative labels.** "효율이다"가 아니라 "효율로 *읽힐 수 있다*" + 대안 라벨. (DG1)
3. **Coverage = question space, not deficit.** 묻힌 극은 "당신들이 빠뜨린 정답"이 아니라 "짚어볼까요?"라는 질문. (FF4/DG3)
4. **Joint-prompting gate.** AI 출력(L3/L4) 전에 **그룹이 먼저 무엇을 물을지 작성**한다. AI가 분석→권고로 점프하지 않음. (DG5 — cognitive forcing)
5. **Contestability = reflection, not just error-fix.** 라벨을 반박하는 과정에서 소수가 "내가 진짜 뜻한 건 이거"라고 말하게 됨 → 그 자체가 support. (F3)
6. **Scaffolding > substitution.** (§2, 선행 논문) AI는 소수의 발언권을 가져가지 않는다.
7. **Double-edged 명시.** 가치 가시화는 양날. 극화·고정·낙인 위험을 *finding이자 설계 제약*으로. (Ver.5.0 anchoring tension)

---

## 5. 실제 사용 흐름 (Use-Flow) — "어떻게 쓰는가"

이게 UI에 그대로 들어가야 한다. **상시 대시보드 아님. 체크인 순간의 5단계 의식(ritual).**

```
[회의 0–20분] 화면 조용함. 시스템은 발화에 가치극을 누적만.
        │
        ▼
[체크인 호출] 진행자가 의제 전환점/15–20분에 공유 스크린에 띄움.
        │
   ┌────┴───────────────────────────────────────────────┐
   │  STEP 1. READ   "지금 우리 논의가 어떻게 모였나"      │
   │     평면을 본다. 합의 무게중심이 어디 쏠렸나.         │
   │     (아직 AI 라벨/권고 없음 — 그룹이 먼저 본다)       │
   ├──────────────────────────────────────────────────────┤
   │  STEP 2. NOTICE "어떤 가치극이 묻혔나"                │
   │     ⚠ 묻힌 minority 극 표시 + 근거 발화.              │
   │     Buried / Withheld / Latent 중 무엇인지.          │
   ├──────────────────────────────────────────────────────┤
   │  STEP 3. ASK    "그룹이 무엇을 물을지 함께 작성"      │
   │     joint-prompt: AI에 던질 질문을 그룹이 고름/씀.    │
   │     (이 게이트를 통과해야 L3/L4 AI 출력이 열림)        │
   ├──────────────────────────────────────────────────────┤
   │  STEP 4. INTERVENE  AI가 자리를 연다 (L1–L4)          │
   │     질문(L2)/what-if(L3)/재표현(L4). 모두 contestable.│
   │     → 소수가 이 자리에서 직접 말한다.                 │
   ├──────────────────────────────────────────────────────┤
   │  STEP 5. DECIDE "이 극을 어떻게 처리하나"             │
   │     탐색/이월/의도적 제외/Contest → 결정 기록에 남음. │
   └──────────────────────────────────────────────────────┘
        │
        ▼
[회의 재개] 화면 배경으로. 다음 체크인에 누적분 반영.
```

**진행자가 각 단계에서 할 일이 화면에 명시된다.** "그래서 뭘 하지?"에 대한 답이 항상 화면 위에 있다.

---

## 6. 실험 맥락 (교수님: context 구체화)

- **국회 같은 큰 공론장 ❌** → 역할극 기반 hybrid (실제 직군 유지 + 시나리오 고정). 맥락이 정해지면 축은 *덜 변함*(교수님 노트 line 194).
- **value minority = 가치 입장이 소수** (social power 위계 아님 — "turn-taking 도구" 비판 회피). 단, dissertation 마무리로 **social minority(empty chair)**도 future work로 열어둠(아름다운 마무리, 교수님 line 196 — 단 이번 prototype scope에선 minority *가치극* 우선).
- **시나리오**: AI 채용 도구 거버넌스(가치충돌 있되 정답 없음 + compliance류 명확한 문제). Paper Outline Appendix A 후보들.
- **모델**: ValueEval ❌ (결과 나쁨). **LLM naive 먼저** (가치성 판정/쟁점 추출/극 명명/재표현). 교수님 line 198, Idea3 §5.

---

## 7. 이 컨셉이 현재 구현에 요구하는 변경 (→ 구현 반영)

1. **Use-flow를 UI 1급 시민으로**: 5단계 체크인 스텝퍼 + 각 스텝의 "할 일" 명시. (이해 안 됨 직격)
2. **Joint-prompting 게이트**: AI 개입(L3/L4) 전에 그룹이 질문을 작성/선택하는 단계. 지금은 없음.
3. **Scaffolding 프레이밍**: L4 재표현에 "원화자가 수정/contest" 액션을 실제로. AIMM 실패 회피를 UI로 증명.
4. **Uptake 강제**: 묻힌 극마다 탐색/이월/제외/contest를 *해야* 다음으로 — 처리 안 한 극은 "미처리"로 남음.
5. **Tentative label**: 라벨에 "…로 읽힐 수 있음" + 대안 + confidence. contest 버튼.
6. **Issue-first 기본, person 레이어**: 사람 노드는 토글로 끌 수 있게(이미 일부) + 기본 강조는 묻힌 극.
7. **Coverage=question**: 묻힌 극 카피를 "결핍"이 아니라 "짚어볼까요?" 질문형으로.
8. **서버 데이터 계약 확장**: `joint_prompt_suggestions`, label `confidence`/`alternatives`, intervention에 `support_target`(minority/group)·`scaffold_note` 필드. fallback + LLM prompt 동시 갱신.

---

## 8. 한계·정직한 claim (reviewer defense, Ver.5.0 Appendix C 정합)

- "결과(outcome)를 바꾼다"고 주장하지 않는다. 선행 논문에서 결과는 안 바뀜. 우리는 **과정의 포괄성 + 묻힌 가치의 가시성·처리**를 주장.
- "viz가 reflection을 향상"이 아니라 **"묻힌 가치극을 contestable artifact로 만들 때 그룹이 그것을 어떻게 읽고/거부하고/처리하는가"**를 탐구 (designerly inquiry).
- 가치 가시화의 양날(극화·낙인) = 핵심 finding이자 설계 제약. 회피 장치(tentative·issue-first·contest·delayed identity)를 설계에 내장.
