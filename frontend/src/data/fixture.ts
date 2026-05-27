/**
 * Sample fixture data for the prototype.
 *
 * Derived from:
 *   results/policy_discussion/full_argument_vectors.csv
 *   results/policy_discussion/full_argument_projection_compare.csv
 *   results/policy_discussion/full_argument_projection_compare_metadata.json
 *
 * PCA coordinates: actual values from CSV.
 * MDS / t-SNE / UMAP coordinates: simulated approximations (clearly marked).
 *   → Real coordinates available in full_argument_projection_compare.csv
 *   → Load from CSV for production use.
 *
 * Value vectors: actual signed scores for active values; near-zero for others.
 */

import type { Argument, ValueKey, ProjectionMethod, Point2D } from '../types'
import { VALUE_KEYS } from '../types'

// ─── Projection Simulation ────────────────────────────────────────────────────
// For the prototype, only PCA coordinates come from the real CSV.
// MDS/t-SNE/UMAP are simulated transforms so the projection toggle works.

const clusterTsneCenters: Record<number, Point2D> = {
  0: { x: -1.8, y: 1.4 },
  1: { x: -1.5, y: -1.6 },
  2: { x: 1.8, y: 1.2 },
  3: { x: -1.2, y: -0.2 },
  4: { x: 0.1, y: -0.1 },
  5: { x: 1.3, y: 1.8 },
}

function simulateProjections(
  pca: Point2D,
  cluster_id: number,
): Record<ProjectionMethod, Point2D> {
  // MDS: slight rotation + gentle scaling (trustworthiness ~0.84, similar to PCA)
  const mds: Point2D = {
    x: pca.x * 0.92 - pca.y * 0.08,
    y: pca.x * 0.08 + pca.y * 0.92,
  }

  // t-SNE: cluster separation amplified (trustworthiness ~0.94)
  const center = clusterTsneCenters[cluster_id] ?? { x: 0, y: 0 }
  const tsne: Point2D = {
    x: center.x + pca.x * 0.35,
    y: center.y + pca.y * 0.35,
  }

  // UMAP: moderate separation + different rotation
  const umap: Point2D = {
    x: center.x * 0.7 + pca.x * 0.6 + pca.y * 0.15,
    y: center.y * 0.7 - pca.x * 0.15 + pca.y * 0.6,
  }

  return { pca, mds, tsne, umap }
}

// ─── Value Vector Helpers ─────────────────────────────────────────────────────

type SparseScores = Partial<Record<ValueKey, number>>

/** Build a full 19D ValueScore record from sparse signed scores.
 *  Values not specified default to near-zero (realistic noise). */
function makeValues(sparse: SparseScores): Argument['values'] {
  const result = {} as Argument['values']
  for (const key of VALUE_KEYS) {
    const signed = sparse[key] ?? 0
    result[key] = {
      presence: Math.abs(signed) + 0.0005,
      signed,
      support: Math.max(0, signed),
      constraint: Math.max(0, -signed),
    }
  }
  return result
}

// ─── Fixture Arguments ────────────────────────────────────────────────────────

const RAW: Array<{
  unit_id: string
  speaker: string
  time: string
  korean_text: string
  english_text: string
  pca: Point2D
  cluster_id: number
  signed: SparseScores
}> = [
  // ── Cluster 0: 지역 소멸·생존 위기 ───────────────────────────────────────
  {
    unit_id: 'row004_claim01',
    speaker: '정의당',
    time: '00:50',
    korean_text:
      '네, 국민 여러분 지역 소멸은 이제 대한민국의 존립 기반을 위협받고 있습니다.',
    english_text:
      "Yes, the extinction of local areas is now threatening the very basis of the Republic of Korea's existence.",
    pca: { x: -0.306, y: 0.100 },
    cluster_id: 0,
    signed: {
      universalism_nature: -0.624,
      security_societal: -0.263,
      universalism_concern: -0.004,
    },
  },
  {
    unit_id: 'row007_claim02',
    speaker: '민주당',
    time: '02:25',
    korean_text:
      '아 이와 같은 현상은 지역에는 소멸의 공포를 가져오고 수도권에는 과일의 고통을 가중시키고 있습니다.',
    english_text:
      'Such a phenomenon brings the fear of extinction to the regions and intensifies the hardship of the metropolitan area.',
    pca: { x: -0.261, y: 0.068 },
    cluster_id: 0,
    signed: {
      universalism_nature: -0.415,
      security_societal: -0.226,
      universalism_concern: -0.008,
    },
  },

  // ── Cluster 1: 안전사고·재정 위기 ────────────────────────────────────────
  {
    unit_id: 'row_c1_ex1',
    speaker: '정의당',
    time: '03:15',
    korean_text:
      '우리 아리셀 함사 화재 참사 보고 있지 않습니까? 또 얼마 전에 대전의 안전공업에서 지금 14명이나 죽는 화재 참사가 발생했어요.',
    english_text:
      "Aren't we witnessing the Aricel fire disaster? Just recently, a fire disaster occurred at a safety industry in Daejeon, killing 14 people.",
    pca: { x: -0.18, y: -0.22 },
    cluster_id: 1,
    signed: {
      security_societal: -0.748,
      power_resources: -0.095,
      conformity_interpersonal: -0.022,
      power_dominance: -0.020,
    },
  },
  {
    unit_id: 'row_c1_ex2',
    speaker: '민주당',
    time: '03:45',
    korean_text:
      '결국 지방 재정에 심각한 영향을 미치고 결국 지역 균형 발전에 심각한 해를 끼친 것이 바로 국민의 힘과 윤석열 정부였던 것입니다.',
    english_text:
      'In the end, it was the People Power Party and the Yoon Seok-yeol government that seriously damaged local finances and regional balanced development.',
    pca: { x: -0.22, y: -0.18 },
    cluster_id: 1,
    signed: {
      security_societal: -0.680,
      power_resources: -0.090,
      power_dominance: -0.015,
    },
  },

  // ── Cluster 2: 분권 개혁·구조 전환 ───────────────────────────────────────
  {
    unit_id: 'row004_claim09',
    speaker: '정의당',
    time: '00:50',
    korean_text:
      '셋째, 실질적 자치를 뒷받침하는 연방제 수준의 재정 입법권 이양과 읍면동 단위까지 주민 결정권을 보장하는 헌법 개정이 반드시 필요합니다.',
    english_text:
      'Third, a constitutional amendment is absolutely necessary to transfer fiscal and legislative powers at the federal level and to guarantee residents\' decision-making rights down to the eup, myeon, and dong levels.',
    pca: { x: 0.206, y: 0.344 },
    cluster_id: 2,
    signed: {
      self_direction_action: 0.669,
      conformity_rules: 0.077,
      universalism_concern: 0.024,
      power_dominance: 0.023,
      self_direction_thought: 0.022,
    },
  },
  {
    unit_id: 'row010_claim04',
    speaker: '개혁신당',
    time: '04:01',
    korean_text:
      '더 근본적인 문제를 직시해야 합니다. 서울의 기능을 옥죄고 강제로 이전하면 지방이 살아난다는 환상 이것을 끝내야 합니다.',
    english_text:
      'We need to face the more fundamental problem. We must end the illusion that squeezing Seoul\'s functions and forcibly relocating them will revive the regions.',
    pca: { x: 0.207, y: 0.295 },
    cluster_id: 2,
    signed: {
      self_direction_action: 0.666,
      power_resources: 0.028,
      security_societal: 0.019,
      stimulation: 0.016,
    },
  },
  {
    unit_id: 'row011_claim01',
    speaker: '개혁신당',
    time: '04:54',
    korean_text:
      '서울은 대한민국 경제의 심장으로서 제 기능을 다하게 하고 동시에 전국 각 지역이 고유한 산업 생태계로 자립하는 구조를 만드는 것, 이것이 진정한 균형 발전의 정책입니다.',
    english_text:
      "Making Seoul fully function as the heart of Korea's economy while creating self-reliant regional industrial ecosystems—this is the policy of true balanced development.",
    pca: { x: 0.333, y: 0.083 },
    cluster_id: 2,
    signed: {
      self_direction_action: 0.386,
      power_resources: 0.304,
      self_direction_thought: 0.278,
      stimulation: 0.222,
      universalism_concern: 0.110,
    },
  },

  // ── Cluster 3: 중앙집권 반대·절차 비판 ──────────────────────────────────
  {
    unit_id: 'row_c3_ex1',
    speaker: '정의당',
    time: '05:10',
    korean_text:
      '이는 충분히 수기 없이 중앙에서 졸속적으로 추진해서 발생하고 있는 문제라고 생각하는데 어떻게 생각하십니까?',
    english_text:
      'I think this is a problem arising from being hastily pushed forward from the center without sufficient preparation. What do you think?',
    pca: { x: -0.12, y: 0.14 },
    cluster_id: 3,
    signed: {
      self_direction_action: -0.440,
      power_dominance: -0.027,
      security_societal: -0.018,
      benevolence_dependability: -0.017,
    },
  },
  {
    unit_id: 'row_c3_ex2',
    speaker: '국민의힘',
    time: '06:00',
    korean_text:
      '그런데 이것 없이 중앙에서 결정된 내용을 가지고 일방적으로 밀어붙이기 식으로 진행되고 있는 것은 실제 지방자치라든가 지방자치권을 오히려 훼손하고 있는 절차라고 저희들은 매우 강하게 비판한 바가 있습니다.',
    english_text:
      'We have very strongly criticized the process of unilaterally pushing forward content decided from the center—without this—as actually undermining local autonomy.',
    pca: { x: -0.15, y: 0.11 },
    cluster_id: 3,
    signed: {
      self_direction_action: -0.390,
      power_dominance: -0.027,
      security_societal: -0.015,
    },
  },

  // ── Cluster 5: 제도화·규칙 강조 ──────────────────────────────────────────
  {
    unit_id: 'row008_claim01',
    speaker: '민주당',
    time: '03:33',
    korean_text:
      '또한 이 모든 과정을 통합 특별시가 정책을 결정하고 집행할 수 있도록 법적 행정적 위상을 보장할 것입니다.',
    english_text:
      'In addition, we will ensure the legal and administrative status so that the integrated special city can decide and implement all of these processes.',
    pca: { x: 0.130, y: 0.233 },
    cluster_id: 5,
    signed: {
      conformity_rules: 0.440,
      self_direction_action: 0.331,
      power_dominance: 0.022,
      universalism_concern: 0.010,
    },
  },
  {
    unit_id: 'row_c5_ex2',
    speaker: '국민의힘',
    time: '07:10',
    korean_text:
      '가장 중요한 것은 결국 선거의 필요성을 높이는 제도 개선이 필요합니다.',
    english_text:
      'Most importantly, institutional reforms that increase the need for elections are necessary.',
    pca: { x: 0.09, y: 0.28 },
    cluster_id: 5,
    signed: {
      conformity_rules: 0.576,
      self_direction_action: 0.068,
      power_dominance: 0.068,
      universalism_concern: 0.031,
    },
  },

  // ── Cluster 4: 일반적 정책 논쟁 (various speakers) ────────────────────────
  {
    unit_id: 'row004_claim02',
    speaker: '정의당',
    time: '00:50',
    korean_text:
      '정부는 초강력 행정통합을 해답으로 내놓고 있지만 우리는 본질적인 질문을 던져야 합니다.',
    english_text:
      'The government is putting forward a super-strong administrative integration as the answer, but we must ask the fundamental question.',
    pca: { x: 0.236, y: -0.130 },
    cluster_id: 4,
    signed: {
      security_societal: 0.288,
      self_direction_thought: 0.161,
      stimulation: 0.124,
      power_dominance: 0.069,
      self_direction_action: 0.058,
    },
  },
  {
    unit_id: 'row004_claim07',
    speaker: '정의당',
    time: '00:50',
    korean_text:
      '둘째, 지역의 부가 수도권으로 유출되는 구조를 바꿔야 합니다.',
    english_text:
      'Second, we need to change the structure in which local wealth flows out to the metropolitan area.',
    pca: { x: 0.149, y: -0.393 },
    cluster_id: 4,
    signed: {
      power_resources: 0.810,
      stimulation: 0.051,
      self_direction_action: 0.030,
      security_societal: 0.017,
    },
  },
  {
    unit_id: 'row004_claim11',
    speaker: '정의당',
    time: '00:50',
    korean_text:
      '노동권과 환경권, 의료, 공공성 같은 국민의 기본권은 전국 어디서나 차별 없이 균등하게 보장되어야 합니다.',
    english_text:
      'Basic rights such as labor rights, environmental rights, healthcare, and public services must be equally guaranteed without discrimination anywhere in the country.',
    pca: { x: 0.375, y: 0.412 },
    cluster_id: 4,
    signed: {
      universalism_concern: 0.964,
      benevolence_caring: 0.016,
      security_personal: 0.006,
      conformity_rules: 0.006,
    },
  },
  {
    unit_id: 'row007_claim04',
    speaker: '민주당',
    time: '02:25',
    korean_text:
      '변화는 이미 시작되었습니다. 말만 있던 어 해수부의 부산 이전을 지난해 이미 완료했습니다.',
    english_text:
      'The change has already begun. We already completed the relocation of the Ministry of Oceans and Fisheries to Busan last year.',
    pca: { x: 0.126, y: 0.006 },
    cluster_id: 4,
    signed: {
      stimulation: 0.936,
      universalism_nature: 0.024,
      hedonism: 0.012,
      power_resources: 0.009,
    },
  },
  {
    unit_id: 'row007_claim05',
    speaker: '민주당',
    time: '02:25',
    korean_text:
      '또한 부산, 강원, 전북 제주 특별법 등 지방 주도 성장을 선도할 법안들이 아 곧 국회 통과를 앞두고 있습니다.',
    english_text:
      'In addition, bills leading region-led growth, such as special acts for Busan, Gangwon, Jeonbuk, and Jeju, are approaching passage in the National Assembly.',
    pca: { x: 0.210, y: -0.477 },
    cluster_id: 4,
    signed: {
      power_resources: 0.891,
      security_societal: 0.094,
      self_direction_action: 0.014,
    },
  },
  {
    unit_id: 'row007_claim08',
    speaker: '민주당',
    time: '02:25',
    korean_text:
      '통합 특별시에는 4년간 총 20조 원의 재정 지원, 투자, 환경 보증, 광역 교통 투자 등 집중 지원이 이루어질 것입니다.',
    english_text:
      'The integrated special city will receive concentrated support including 20 trillion won in financial support, investment, environmental guarantees, and metropolitan transportation investment over four years.',
    pca: { x: 0.201, y: -0.445 },
    cluster_id: 4,
    signed: {
      power_resources: 0.873,
      universalism_nature: 0.350,
      benevolence_caring: 0.293,
      stimulation: 0.068,
    },
  },
  {
    unit_id: 'row008_claim03',
    speaker: '민주당',
    time: '03:33',
    korean_text:
      '전국 어디서나 다 잘 살 수 있는 민주당과 이재명 정부가 책임지고 해 나가겠습니다.',
    english_text:
      'The Democratic Party and the Lee Jae-myung government will take responsibility and carry this out so that people can live well anywhere in the country.',
    pca: { x: 0.487, y: 0.341 },
    cluster_id: 4,
    signed: {
      universalism_concern: 0.929,
      security_societal: 0.153,
      power_dominance: 0.076,
      conformity_rules: 0.033,
    },
  },
  {
    unit_id: 'row010_claim01',
    speaker: '개혁신당',
    time: '04:01',
    korean_text: '아 선거철이 돌아올 때마다 지도 위의 선이 다시 그려집니다.',
    english_text:
      'Ah, every time election season comes around, the lines on the map are drawn again.',
    pca: { x: -0.043, y: -0.055 },
    cluster_id: 4,
    signed: {
      power_dominance: 0.006,
      security_societal: 0.002,
      achievement: 0.002,
    },
  },
  {
    unit_id: 'row011_claim04',
    speaker: '개혁신당',
    time: '04:54',
    korean_text:
      '개혁신당은 정치가 아닌 정책으로 이 나라의 미래를 말하도록 하겠습니다.',
    english_text:
      "The New Reform Party will speak about this country's future through policy, not politics.",
    pca: { x: 0.074, y: 0.050 },
    cluster_id: 4,
    signed: {
      self_direction_thought: 0.630,
      stimulation: 0.256,
      self_direction_action: 0.067,
      universalism_concern: 0.009,
    },
  },
  {
    unit_id: 'row013_claim01',
    speaker: '국민의힘',
    time: '05:30',
    korean_text:
      '국가 균형 발전을 위한 지방자치 제도가 시작된 지가 30년이 지났습니다. 그러나 수도권 일극 체제는 고착되고 불평등과 불균형은 더욱 심화되고 있습니다.',
    english_text:
      'It has been 30 years since the system of local self-government for balanced national development began. However, the Seoul metropolitan single-center system has become entrenched, and inequality is deepening.',
    pca: { x: -0.06, y: -0.05 },
    cluster_id: 4,
    signed: {
      security_societal: -0.150,
      self_direction_action: 0.080,
      universalism_concern: 0.060,
      power_dominance: -0.015,
    },
  },
  {
    unit_id: 'row007_claim03',
    speaker: '민주당',
    time: '02:25',
    korean_text:
      '이재명 정부와 더불어민주당은 수도권 중심 성장이 아닌 지방 주도 성장으로 대한민국의 재도약을 이끌어 나가겠습니다.',
    english_text:
      "The Lee Jae-myung administration and the Democratic Party will lead South Korea's leap forward with region-led growth, not growth centered on the Seoul metropolitan area.",
    pca: { x: -0.026, y: -0.048 },
    cluster_id: 4,
    signed: {
      achievement: 0.228,
      self_direction_action: 0.021,
      power_dominance: 0.010,
    },
  },
]

// ─── Build Final Fixture ───────────────────────────────────────────────────────

export const FIXTURE_ARGUMENTS: Argument[] = RAW.map((r) => ({
  unit_id: r.unit_id,
  speaker: r.speaker,
  time: r.time,
  korean_text: r.korean_text,
  english_text: r.english_text,
  cluster_id: r.cluster_id,
  values: makeValues(r.signed),
  projections: simulateProjections(r.pca, r.cluster_id),
}))

export const ALL_SPEAKERS = [...new Set(FIXTURE_ARGUMENTS.map((a) => a.speaker))]
