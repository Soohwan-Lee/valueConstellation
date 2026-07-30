/**
 * Built-in example transcripts.
 *
 * Each is synthetic but written to produce a genuinely different map shape, so
 * that clicking through them teaches what the visualisation can show:
 *
 *  - `siting`    — four distinct positions, each on different grounds. The map
 *                  spreads wide; nobody clusters.
 *  - `consensus` — everyone verbally agrees, but their reasons pull apart. The
 *                  map separates people who sound aligned in the transcript.
 *  - `spread`    — one speaker argues from a single consistent frame while
 *                  another ranges across several, so the two ellipses differ in
 *                  size even where the centroids sit close together.
 *
 * A fourth scenario was cut: participants debating two separate agenda items.
 * Every speaker's centroid collapsed toward the middle, because averaging one
 * position on issue A with an opposing position on issue B lands between them.
 * That is a real limit of per-speaker aggregation over heterogeneous topics, not
 * a bug — a single map wants a single question, and multi-issue meetings need
 * per-issue maps. Kept out of the examples rather than shipped as a demo that
 * quietly misrepresents what the method can do.
 *
 * These are analysed by the same pipeline as pasted input: real segmentation,
 * real embeddings, real projection. Nothing here is a precomputed picture.
 */

export interface Scenario {
  id: string
  /** Short label for the chip. */
  title: { ko: string; en: string }
  /** One line on what the resulting map shows. */
  teaser: { ko: string; en: string }
  transcript: string
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'siting',
    title: {
      ko: '발전소 부지 선정',
      en: 'Plant siting',
    },
    teaser: {
      ko: '네 사람이 서로 다른 근거로 갈린다 — 기후, 주민 부담, 절차, 재정',
      en: 'Four people split on different grounds — climate, local burden, process, budget',
    },
    transcript: `사회자: 오늘은 지역 재생에너지 발전소 부지 선정에 대해 논의하겠습니다.
김철수: 저는 이 사업을 조속히 추진해야 한다고 봅니다. 기후 위기가 심각하고, 우리 지역이 에너지 자립을 못 하면 장기적으로 산업 경쟁력을 잃습니다. 단기 비용이 들더라도 미래 세대를 위한 투자입니다.
이영희: 방향에는 동의합니다. 그런데 현장 주민 입장에서는 소음과 경관 훼손이 실제 문제입니다. 우리 마을은 이미 송전탑으로 피해를 봤고, 또 우리가 부담을 지는 건 공정하지 않습니다.
박민수: 네, 맞습니다.
박민수: 저는 절차 문제를 지적하고 싶습니다. 주민 설명회가 두 번밖에 없었고 자료도 늦게 공개됐습니다. 결정 자체보다 과정의 정당성이 먼저 확보돼야 합니다.
김철수: 절차는 보완하면 됩니다. 다만 계속 지연되면 국가 감축 목표를 못 맞춥니다.
최지은: 예산 측면을 봐야 합니다. 초기 투자 대비 회수 기간이 15년입니다. 지방 재정 여건에서 이건 무리한 규모이고, 다른 복지 예산을 잠식할 수 있습니다.
이영희: 최 위원님 말씀에 덧붙이면, 보상 체계가 불투명한 것도 문제입니다. 누가 얼마를 받는지 기준이 없으면 갈등만 커집니다.
박민수: 공청회를 한 번 더 열고, 회의록을 공개하는 것이 최소 조건이라고 생각합니다.
최지은: 재정 검토 자료를 다시 요청드립니다. 회수 기간 추정에 쓰인 전력 단가 가정이 낙관적입니다.
김철수: 저는 그래도 추진이 맞다고 봅니다. 기후 대응은 미룰 수 없습니다.
이영희: 주민 수용성 없이 추진하면 결국 더 늦어집니다.`,
  },

  {
    id: 'consensus',
    title: {
      ko: '합의처럼 보이는 회의',
      en: 'Agreement that is not',
    },
    teaser: {
      ko: '모두 "찬성"이라 말하지만 이유가 다르다 — 말은 모였고 위치는 갈렸다',
      en: 'Everyone says yes for different reasons — words converge, positions do not',
    },
    transcript: `사회자: 재택근무 제도 정규화 안건입니다. 의견 주시죠.
정하늘: 저는 찬성입니다. 통근 시간이 줄면 실질적으로 직원 삶의 질이 올라갑니다. 육아나 간병을 하는 동료들에게는 제도가 아니라 생존 조건입니다.
한지훈: 저도 찬성입니다. 다만 제가 보는 이유는 조금 다릅니다. 사무실 임대료가 연 12억인데, 좌석을 절반으로 줄이면 고정비를 크게 낮출 수 있습니다. 비용 구조 개선이 핵심입니다.
오세라: 찬성합니다. 저는 채용 경쟁력 관점입니다. 지금 시장에서 재택 옵션이 없으면 지원자 풀이 절반으로 줄어듭니다. 경쟁사가 이미 다 하고 있어서 우리만 안 하면 브랜드 이미지가 나빠집니다.
사회자: 좋습니다. 모두 찬성이시네요.
정하늘: 다만 조건이 있습니다. 비용 절감을 목적으로 하면 결국 좌석을 없애고 출근을 눈치 보게 만듭니다. 그러면 제도가 아니라 압박이 됩니다.
한지훈: 반대로 삶의 질만 앞세우면 임대료 절감이 실현되지 않습니다. 좌석 축소가 전제되지 않은 재택은 비용 측면에서 의미가 없습니다.
오세라: 두 분 말씀 다 이해하는데, 채용 시장에서는 제도의 존재 자체가 신호입니다. 좌석을 줄이든 안 줄이든 지원자에게 어떻게 보이는지가 우리 경쟁력입니다.
오세라: 내부 운영 원칙보다 대외 공고에 뭐라고 쓸 수 있는지가 채용에는 더 중요합니다.
정하늘: 그러면 실제 운영 원칙은 아직 합의된 게 아닙니다.
한지훈: 동의합니다. 찬성이라는 단어만 같았습니다.`,
  },

  {
    id: 'spread',
    title: {
      ko: '넓은 사람과 좁은 사람',
      en: 'Narrow and wide',
    },
    teaser: {
      ko: '한 사람은 한 가지 틀로만, 다른 사람은 여러 틀로 말한다 — 타원 크기가 갈린다',
      en: 'One speaker argues from a single frame, another from many — the ellipses differ',
    },
    transcript: `사회자: 학교 급식 조달 방식 변경 안건입니다.
윤태경: 저는 지역 농가 직거래로 바꿔야 한다고 봅니다. 유통 단계를 줄이면 같은 예산으로 더 좋은 식재료를 쓸 수 있습니다.
윤태경: 비용 구조를 보면 현재 중간 유통 마진이 23%입니다. 이걸 없애면 식재료 단가를 20% 이상 올릴 수 있습니다.
윤태경: 결국 예산 효율 문제입니다. 같은 돈으로 더 많은 가치를 뽑아내는 게 조달의 목적입니다.
윤태경: 단가 대비 품질 지표로 평가하면 직거래가 명확히 우위입니다.
서나윤: 저는 아이들 건강이 우선이라고 생각합니다. 잔류 농약 검사 기준을 강화해야 합니다.
서나윤: 그런데 지역 농가 입장도 봐야 합니다. 대형 유통사와 계약하면 단가를 못 받습니다. 지역 경제 문제이기도 합니다.
서나윤: 그리고 조달 절차의 투명성이 중요합니다. 지금은 어떤 기준으로 업체가 선정되는지 학부모가 알 수 없습니다.
서나윤: 급식 노동자 근무 조건도 함께 봐야 합니다. 식재료가 바뀌면 손질 노동량이 크게 늘어납니다.
서나윤: 결국 이건 아이들, 농가, 노동자, 학부모가 다 걸린 문제입니다. 한 가지 기준으로 정할 수 없습니다.
윤태경: 저는 그래도 예산 효율이 판단 기준이어야 한다고 봅니다.`,
  },
]

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id)
}
