# Value Minority Check-in — 인터페이스 대폭 개선 계획

작성: 2026-06-06
근거 문서: `260605 VC - Minority Support Reframing.md` (problem statement, §3 blind spot 정의, §4 화면/개입, §5 파이프라인)
대상: `prototypes/value-minority-checkin/` (현재 light-mode 3-rail 콘솔)

---

## 0. 결정 사항 (사용자 확정)

| 항목 | 결정 |
|---|---|
| 비주얼 | **Light editorial** — warm paper `#faf8f4`, accent green `#23802e`, PT Serif / PT Mono. 논문 figure 친화. |
| 2D 평면 | **묻힌 극 중심 별자리** — minority 묻힌 극이 주인공, majority 무게중심은 큰 흐릿 덩어리, 사람=큰 점+spread, 발언=작은 점, 축 의미는 양 끝에 또렷이. |
| 레이아웃 | **평면 우선 + 슬라이드 패널** — 얇은 좌측 rail(axes/blind), 큰 평면 중앙 + 그 아래 AI 개입 카드, 우측 상세는 클릭 시 슬라이드인. |
| 구체화 기능 | **blind spot 3종 시각 구분** + **what-if를 전면 카드로**. |
| 유지(확장 안 함) | L1~L4 개입 탭 구조 / Contest 동작 — 기능은 그대로, 시각만 새 토큰에 맞게 정리. |

비파괴 원칙: `server.mjs` 데이터 계약(API 응답 schema)은 건드리지 않는다. 전부 `public/` (HTML/CSS/JS) 안에서 끝낸다. fallback / LLM 양쪽 모두 새 UI에서 동작해야 함.

---

## 1. 현재 문제 진단 (스크린샷 + 코드 기준)

1. **2D 평면이 시스템의 핵심인데 가장 약함.**
   - 사람/발언/blind spot/tension chip이 전부 비슷한 작은 원 → 위계 없음.
   - 축 라벨이 모서리에 떠 있는 박스 → 좌/우가 무슨 뜻인지 즉시 안 읽힘.
   - 하드코딩된 4분면 캡션(`소수 가치가 버티는 영역` 등)이 실제 LLM 축과 무관 → 오해 유발.
   - **묻힌 minority 극**(시스템의 주인공, §3·§4.1)에 시각적 우선순위 없음.
   - **합의 무게중심**(§4.1)이 눈에 안 띄는 작은 링.
   - 사람의 **옅은 spread 영역**(§4.1 "한 사람을 한 가치로 환원하지 않되 무게중심은 보임") 미구현.

2. **3-rail + 하단 그리드 = 한 화면 ~10패널, 전부 동일 무게.** 노트는 이것을 상시 대시보드가 아니라 **체크인 "순간"**(§4.1)으로 규정 → 집중된 개입처럼 보여야 함.

3. **시각이 사용자 취향과 어긋남.** (light/orange/non-serif → 확정대로 light/green/serif로.)

4. **애매한 기능들**
   - blind spot 3종(Buried Pole / Withheld Voice / Latent Axis)이 §3에선 서로 다른 신호인데 UI에선 동일하게 보임.
   - what-if(§4.2의 "AI는 균형점을 제안 않고 조건문만")가 우측 회색 한 줄로 묻힘.

---

## 2. 디자인 토큰 (새 `styles.css` 상단)

```
--paper        #faf8f4   /* 배경: warm paper */
--surface      #ffffff   /* 카드 */
--surface-2    #f3efe7   /* 옅은 면 */
--ink          #232220   /* 본문 텍스트 (따뜻한 먹) */
--muted        #6b665d
--faint        #a39d90
--line         #e4ded2
--line-strong  #cfc7b6
--accent       #23802e   /* green = 사용자 Obsidian accent */
--accent-soft  #e3efe4
--minority     #b8541f   /* 묻힌 극 강조(따뜻한 주황) — 평면의 '주인공'에만 */
--minority-soft#f6e6da
--majority     #8a8madj  /* 무게중심 덩어리: 차분한 회녹 */
--sans  "PT Serif Caption", "PT Serif", "Apple SD Gothic Neo", serif  /* 인터페이스도 serif */
--serif "PT Serif", Georgia, serif
--mono  "PT Mono", "SF Mono", ui-monospace, monospace
```

- 본문/제목은 serif(PT Serif)로 통일 → Obsidian 느낌. 라벨/수치/축 좌표는 mono.
- accent = green(구조·중립 정보), minority = warm(묻힌 극 단 하나의 강조색). 두 색의 역할을 엄격히 분리해 "주인공"이 한눈에.

---

## 3. 레이아웃 재구성 (HTML 구조 변경)

```
┌── topbar ───────────────────────────────────────────────┐
│ Value Constellation · Minority Check-in   [window 00:50–08:36] │
│                         [cached/llm]  [Generate check-in]      │
├── rail(좁게 260px) ──┬── stage (flex-1) ───────────────────┤
│ ▸ 체크인 한 줄 요약    │  ┌ 축 셀렉터 (x/y 무엇인지 한 줄) ┐  │
│ ▸ Value axes (중요도순)│  │                              │  │
│   - axis card ×3      │  │      [ 큰 별자리 평면 ]        │  │
│ ▸ Blind spots (3종)   │  │  묻힌 극 = 주인공             │  │
│   - 색/아이콘 구분     │  └──────────────────────────────┘  │
│                       │  ┌ what-if 전면 카드 ───────────┐  │
│                       │  │ "만약 [묻힌 극]을 동등 반영하면…"│  │
│                       │  └──────────────────────────────┘  │
│                       │  ┌ AI 개입 (L1–L4 탭 + 본문 + 결정)┐ │
│                       │  └──────────────────────────────┘  │
└───────────────────────┴────────────────────────────────────┘
        + 우측 슬라이드 패널(기본 숨김): 사람/발언/blind/tension/axis 클릭 시 인.
          상세 + 근거 발화 + (해당 시) 결정 trace를 한 패널에 묶음.
```

- 좌측 rail은 "지금 무엇이 묻혔나"의 목록만 → 항상 보이는 정보 최소화.
- 우측 슬라이드 패널이 현재의 detail+evidence+decision 3패널을 흡수 → 동시에 보이는 패널 수 절반.
- tension은 별도 패널 대신 (a) 평면 위 선 + (b) 클릭 시 슬라이드 패널에서 설명. 하단 점유 제거.

---

## 4. 2D 평면 재설계 (핵심 작업)

### 4.1 시각 위계 (큰→작은, 밝은→흐린)
1. **묻힌 minority 극** = 평면 끝에 큰 글로우 라벨(✦ 마커 + warm `--minority`). "주인공". Buried/Withheld면 여기 강조.
2. **majority 무게중심** = 큰 흐릿한 회녹 덩어리(radial-gradient blob). 합의가 쏠린 곳(§4.1 "합의 무게중심").
3. **사람** = 큰 점 + 그 사람 발언 분산 기반 **옅은 타원 spread**(§4.1 미구현분 구현). 색=정당. 켜고 끌 수 있음(토글).
4. **발언** = 작은 점. 화자 색. hover/클릭 시만 번호·원문.
5. **tension** = 두 사람 큰 점 사이 점선. 클릭 시 슬라이드 패널.

### 4.2 축 의미를 또렷이
- 모서리 떠 있는 박스 제거 → **평면 네 변 중앙에 축 극 라벨**을 베이스라인에 붙여 "왼쪽=빠른 도입 / 오른쪽=충분한 검증" 형태로 직접 읽히게.
- 하드코딩된 4분면 캡션 **삭제**(실제 축과 무관·오해 유발). 대신 minority 극 방향에만 옅은 영역 음영.
- 상단 축 셀렉터: 현재 x/y가 어느 축인지 한 줄(`x: 빠른 도입 ↔ 충분한 검증 · y: 운영 단순화 ↔ 지원자 고지`) + 다른 축으로 교체(노트 §4.1 "축 셀렉터로 교체, 내부는 다축 보기는 2D").
  - 교체 시 server 재호출 없이 클라이언트에서 좌표 재계산(현재는 axes[0],axes[1] 고정 → axes[i],axes[j] 선택 가능하게). 단, 좌표는 현재 participants.x/y가 이미 평면값이므로, MVP는 "축 라벨만 교체 + 강조"로 두고, 완전한 재투영은 후속(아래 6번)으로 표시.

### 4.3 blind spot 3종 시각 구분 (확정 기능)
| type | 색/형태 | 평면 위치 | 의미(§3) |
|---|---|---|---|
| Buried Pole | warm 채움 ✦ | 해당 축의 묻힌 극 끝 | 한 극이 minority에게만 의존 |
| Withheld Voice | warm 점선 테두리 ◌ | 그 사람 점 근처 | 체현할 극에 그의 발화가 빠짐 |
| Latent Axis | green 점선 + ⌀ | 평면 가장자리(아직 안 띄운 축) | majority가 안 꺼낸 축 |
- 좌측 rail의 blind 카드도 같은 색/아이콘 체계로 일치 → 목록↔평면 매핑 학습 쉬움.

---

## 5. what-if 전면 카드 (확정 기능)

- 평면 바로 아래, AI 개입 위에 독립 카드.
- 구조: `만약 [묻힌 극]을 동등 반영하면 →` + 결과 문장 + 작은 "이건 제안이 아니라 조건문" 주석(§4.2 원칙 명시).
- 현재 선택된 blind spot에 연동(blind 클릭하면 what-if도 그 극 기준으로 강조). 데이터는 기존 `state.checkin.what_if` 사용(스키마 불변). 향후 blind별 what-if 분기는 6번.

---

## 6. 후속(이번 범위 밖, 문서에만 표시)

- blind별 개별 what-if / 축 완전 재투영(서버 좌표 재계산) → `server.mjs` 스키마 확장 필요하므로 별도.
- L1→L4 에스컬레이션 시각화, Contest 실제 동작 → 사용자가 이번에 미선택. 추후.
- 실시간 점 누적(§5 실시간 루프) → 데모용 애니메이션은 후속.

---

## 7. 작업 단위 (구현 순서)

1. `styles.css` 전면 교체 — 새 토큰(2장), serif/green, 카드/타이포 정리.
2. `index.html` 구조 변경 — topbar + 좁은 rail + stage(축셀렉터/평면/what-if/개입) + 우측 슬라이드 패널.
3. `app.js`
   a. 평면 렌더 재작성: 위계(4.1), 축 끝 라벨(4.2), spread 타원, majority blob, blind 3종(4.3).
   b. 우측 슬라이드 패널: detail+evidence+decision 통합, 열기/닫기.
   c. what-if 카드 렌더(5장) + blind 연동.
   d. 축 셀렉터(라벨 교체 + 강조).
   기존 데이터 접근 함수/이벤트 로직은 최대 재사용.
4. 검증: fallback 모드로 스크린샷(playwright) 비교, 클릭 인터랙션(사람/발언/blind/tension/axis→슬라이드 패널) 동작 확인, 반응형 1280/1024 확인.
5. `README.md` 갱신(새 UI 설명), 이 계획 문서 결과 반영.

산출물: `public/index.html`, `public/styles.css`, `public/app.js` 교체. 서버·데이터 불변.
```
```
```
```

검토 후 진행하라고 하면 7장 순서대로 구현하겠습니다.
