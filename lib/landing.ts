import type { Lang } from './i18n'

/**
 * Copy for the overview page.
 *
 * Separate from `i18n.ts`, which holds interface chrome — labels, hints and
 * warnings that appear beside controls. This is prose: it is longer, it is
 * edited as paragraphs rather than as strings, and mixing the two would bury
 * forty control labels inside an essay.
 */

export type Bilingual = Record<Lang, string>

export interface MarkEntry {
  /** Which figure to draw beside it. */
  figure: 'dot' | 'marker' | 'region' | 'measure' | 'provisional'
  title: Bilingual
  body: Bilingual
}

export const HERO = {
  eyebrow: {
    ko: '회의록 → 입장 지도',
    en: 'Transcript → map of positions',
  },
  headline: {
    ko: '누가 어디에 서 있는지,\n실제로 한 말에서 읽습니다.',
    en: 'Where everyone stands,\nread from what they said.',
  },
  lead: {
    ko: '회의록을 붙여넣으면 각 참여자의 발언을 주장 단위로 나누고, 의미가 비슷한 발언끼리 가깝게 배치합니다. 누가 누구와 가까운지, 누가 혼자 떨어져 있는지가 한 장에 보입니다.',
    en: 'Paste a transcript. Each participant’s speech is split into argument units and laid out so that statements meaning similar things sit close together — who stands near whom, and who stands alone, on one page.',
  },
  primary: { ko: '회의록 붙여넣기', en: 'Paste a transcript' },
  secondary: { ko: '읽는 법부터 보기', en: 'Learn to read it first' },
  demoCaption: {
    ko: '실제 예시입니다. 위에서 다른 회의를 골라 보거나, 참여자 표식을 클릭해 거리를 재보세요.',
    en: 'A real example. Pick a different meeting above, or click a participant to measure their distance to everyone else.',
  },
  demoOpen: { ko: '이 예시를 도구에서 열기', en: 'Open this one in the studio' },
} satisfies Record<string, Bilingual>

export const TRY_SECTION = {
  eyebrow: { ko: '직접 해보기', en: 'Try it' },
  headline: {
    ko: '가지고 계신 회의록을 그대로 붙여넣어 보세요.',
    en: 'Paste a transcript you already have.',
  },
  lead: {
    ko: '한 줄에 한 발언씩이면 됩니다. 붙여넣는 즉시 누가 발언자로 인식되는지 아래에 표시되고, 그 상태에서 지도를 만듭니다. 회의록은 지도를 만드는 동안에만 서버로 보내고 저장하지 않습니다.',
    en: 'One statement per line is enough. The names it recognises appear underneath as you type, and the map is built from exactly those. The transcript is sent only to build the map, and is not stored.',
  },
  privacy: {
    ko: '민감한 회의록이라면 이름을 A, B, C로 바꿔서 붙여넣어도 결과는 같습니다.',
    en: 'If the meeting is sensitive, replacing names with A, B and C changes nothing about the result.',
  },
} satisfies Record<string, Bilingual>

export const MARKS_SECTION = {
  eyebrow: { ko: '읽는 법', en: 'How to read it' },
  headline: {
    ko: '지도 위의 모든 표시에는 뜻이 있습니다.',
    en: 'Every mark on the map means one thing.',
  },
  lead: {
    ko: '다섯 가지만 알면 됩니다. 축에는 이름이 없습니다 — 위아래·좌우 방향 자체에는 뜻이 없고, 오직 서로 간의 거리만 읽으면 됩니다.',
    en: 'Five things to know. The axes are unlabelled on purpose: up and across carry no meaning, and only the distance between marks is meant to be read.',
  },
} satisfies Record<string, Bilingual>

export const MARKS: MarkEntry[] = [
  {
    figure: 'dot',
    title: { ko: '점 — 발언 하나', en: 'Dot — one statement' },
    body: {
      ko: '한 사람이 한 번에 편 주장 하나입니다. 문장 단위가 아니라 주장 단위라, 근거는 주장에서 떨어지지 않습니다. 클릭하면 원문이 그대로 나옵니다.',
      en: 'One argument, made once. Units are arguments rather than sentences, so a reason never gets separated from the claim it supports. Click one to read it verbatim.',
    },
  },
  {
    figure: 'marker',
    title: { ko: '표식 — 그 사람의 중심', en: 'Marker — their centre' },
    body: {
      ko: '그 사람이 한 모든 발언의 평균 위치입니다. 표식이 클수록 발언이 많습니다. 클릭하면 그 사람이 한 말 전체가 나옵니다.',
      en: 'The average position of everything that speaker said. A bigger marker means more statements behind it. Click it to see all of them.',
    },
  },
  {
    figure: 'region',
    title: { ko: '영역 — 발언이 퍼진 범위', en: 'Region — the ground they covered' },
    body: {
      ko: '넓으면 여러 관점을 오갔고, 좁으면 한 관점으로 일관했습니다. 갈래가 둘로 나뉘면 서로 다른 두 논지를 오간 것이고, 그 사이 빈 곳은 아무도 서지 않은 자리입니다.',
      en: 'Wide means they ranged across framings; narrow means they stayed on one. Two separate shapes mean two separate positions, and the gap between them is ground nobody stood on.',
    },
  },
  {
    figure: 'measure',
    title: { ko: '측정선 — 두 사람 사이 거리', en: 'Measure line — the gap between two people' },
    body: {
      ko: '참여자를 클릭하면 나머지 전원과의 거리가 그어집니다. 숫자는 이 지도에서 가장 먼 두 사람을 1.00으로 둔 상대값입니다 — 지도가 다르면 비교할 수 없는 값이라 절대 거리는 표시하지 않습니다.',
      en: 'Click a participant and the gap to everyone else is drawn. The number is relative to the widest gap on that map, which is 1.00 — absolute distances mean nothing between two maps, so none are shown.',
    },
  },
  {
    figure: 'provisional',
    title: { ko: '점선 — 아직 믿기 이른 위치', en: 'Dashed — not yet a position' },
    body: {
      ko: '실질 발언이 3개 미만인 참여자입니다. 평균을 낼 것이 거의 없어 위치가 흔들립니다. 지도는 이런 경우를 실선과 다르게 그려서, 두 마디로 잡힌 위치가 마흔 마디로 잡힌 위치처럼 보이지 않게 합니다.',
      en: 'Fewer than three substantive statements. There is almost nothing to average, so the position moves easily. It is drawn differently on purpose, so a position built on two statements never looks like one built on forty.',
    },
  },
]

export const REGION_RULE = {
  eyebrow: { ko: '영역은 어떻게 정해지나', en: 'How the region is decided' },
  headline: {
    ko: '지도의 해상도만큼, 발언 주변을 덮습니다.',
    en: 'Each statement claims one resolution of ground.',
  },
  body: {
    ko: '먼저 지도 위 모든 발언에 대해 “가장 가까운 다른 발언까지의 거리”를 재고, 그 중앙값을 이 지도의 해상도로 씁니다. 이보다 가까운 두 발언은 사실상 같은 자리라고 보는 것입니다. 그다음 각 발언이 자기 주변 한 해상도만큼을 차지하고, 겹치는 것끼리 합쳐진 윤곽이 그 사람의 영역이 됩니다.',
    en: 'For every statement on the map, measure how far it is to the nearest other statement, and take the median. That is the map’s resolution: two statements closer than that are not distinguishable positions. Each statement then claims the ground within one resolution of itself, and the outline of everything that overlaps is the speaker’s region.',
  },
  consequences: [
    {
      ko: '주변에 아무것도 없는 발언은 정확히 한 해상도 크기의 원이 됩니다.',
      en: 'A statement with nothing near it draws a circle of exactly one resolution.',
    },
    {
      ko: '해상도의 약 2.6배 안에 있는 발언끼리는 하나로 합쳐지고, 그보다 멀면 따로 남습니다.',
      en: 'Statements within about 2.6 resolutions merge; further apart, they stay separate.',
    },
    {
      ko: '해상도는 화자별이 아니라 지도 전체에서 한 번만 잽니다. 그래야 두 사람의 영역 크기를 그대로 비교할 수 있습니다.',
      en: 'The resolution is measured once for the whole map, not per speaker, so two regions can be compared directly.',
    },
  ],
  steps: [
    {
      ko: '지도 위 모든 발언에 대해, 가장 가까운 다른 발언까지의 거리를 잽니다. 그 값들의 중앙값이 이 지도의 해상도입니다.',
      en: 'For every statement, measure the distance to the nearest other one. The median of those is the map’s resolution.',
    },
    {
      ko: '각 발언이 자기 주변으로 딱 한 해상도만큼을 차지합니다. 여기서는 왼쪽 넷이 서로 닿고, 오른쪽 둘은 닿지 않습니다.',
      en: 'Each statement claims exactly one resolution around itself. Here the four on the left touch; the two on the right do not.',
    },
    {
      ko: '닿은 것끼리 합친 윤곽이 그 사람의 영역입니다. 닿지 않은 발언은 따로 남고, 그 사이 빈 곳은 아무도 서지 않은 자리입니다.',
      en: 'The outline of everything that touches is the region. What did not touch stays separate, and the space between is ground nobody stood on.',
    },
  ] as [Bilingual, Bilingual, Bilingual],
  stepsNote: {
    ko: '위 세 그림은 실제로 지도를 그리는 코드가 그대로 계산한 것입니다. 설명을 위해 따로 그린 그림이 아닙니다.',
    en: 'The three panels are computed by the code that draws the real thing, not redrawn for the explanation.',
  },
  note: {
    ko: '조절 가능한 값이 없습니다. 보기 좋으라고 고른 숫자가 하나도 들어가지 않았다는 뜻이고, 그래서 이 그림이 왜 이 모양인지 항상 설명할 수 있습니다.',
    en: 'There is nothing to tune. No number in this was chosen because the picture looked better with it, which is what makes the shape explainable.',
  },
  rejected: {
    ko: '흔히 쓰는 타원은 쓰지 않았습니다. 타원은 어떤 점 분포든 하나의 매끈한 타원으로 덮기 때문에, 서로 다른 두 논지를 오간 사람도 그 사이 빈 자리까지 차지한 것처럼 그립니다.',
    en: 'The usual covariance ellipse is not used. An ellipse covers any set of points with one smooth oval, so somebody who argued from two separate positions is drawn as having occupied the empty ground between them too.',
  },
}

export const PIPELINE_SECTION = {
  eyebrow: { ko: '만들어지는 과정', en: 'How it is built' },
  headline: {
    ko: '붙여넣기부터 지도까지 네 단계.',
    en: 'Four steps from paste to map.',
  },
} satisfies Record<string, Bilingual>

export const PIPELINE: { title: Bilingual; body: Bilingual }[] = [
  {
    title: { ko: '발언자 구분', en: 'Attribute speakers' },
    body: {
      ko: '규칙 기반으로 여섯 가지 회의록 형식을 인식합니다. 모델을 부르지 않아 즉시 끝나고, 같은 사람의 다른 표기(“김철수 위원”, “김철수님”)는 한 사람으로 묶습니다.',
      en: 'Rule-based, across six transcript formats. No model call, so it is instant, and different spellings of the same person are merged.',
    },
  },
  {
    title: { ko: '주장 단위로 나누기', en: 'Split into arguments' },
    body: {
      ko: '한 번의 발언을 주장 단위로 나눕니다. 근거는 주장에서 떼지 않습니다. 원문에 없는 문장이 만들어지면 그 단위는 버리고 개수를 보고합니다.',
      en: 'A turn becomes argument units, and a reason is never separated from its claim. Any unit whose text does not occur in the transcript is dropped and counted.',
    },
  },
  {
    title: { ko: '뜻이 비슷한 것끼리 모으기', en: 'Group by what they mean' },
    body: {
      ko: '각 주장을 뜻을 나타내는 숫자 목록으로 바꿉니다. 비슷한 말을 한 주장끼리는 이 숫자들이 서로 가까워집니다. 사람의 위치는 이 단계에서 평균을 내고, 그 다음에 지도로 옮깁니다.',
      en: 'Each argument becomes a long list of numbers standing for its meaning, so arguments that say similar things end up near each other. A person’s position is averaged here, before anything is flattened.',
    },
  },
  {
    title: { ko: '평면에 펼치기', en: 'Flatten it onto a page' },
    body: {
      ko: '그 숫자들은 방향이 아주 많아서 종이 한 장에 그대로 옮길 수 없습니다. 두 가지 방식으로 눌러 펼치고, 그 과정에서 얼마나 남았는지를 지도 아래에 적습니다.',
      en: 'Those numbers point in far more directions than a page has, so the layout squashes them two different ways and prints how much survived underneath the map.',
    },
  },
]

export const EXAMPLES_SECTION = {
  eyebrow: { ko: '예시', en: 'Examples' },
  headline: {
    ko: '지도가 무엇을 보여줄 수 있는지 먼저 확인하세요.',
    en: 'See what the map can and cannot show.',
  },
  lead: {
    ko: '세 가지 예시는 모두 실제 파이프라인을 그대로 거친 결과입니다. 미리 그려둔 그림이 아닙니다.',
    en: 'All three ran through the real pipeline. None of them is a picture drawn in advance.',
  },
  open: { ko: '이 예시 열기', en: 'Open this example' },
} satisfies Record<string, Bilingual>

export const LIMITS_SECTION = {
  eyebrow: { ko: '한계', en: 'Limits' },
  headline: {
    ko: '이 지도가 말하지 않는 것.',
    en: 'What this map does not say.',
  },
}

export const LIMITS: { title: Bilingual; body: Bilingual }[] = [
  {
    title: { ko: '가깝다 = 동의한다, 가 아닙니다', en: 'Close does not mean agreed' },
    body: {
      ko: '가깝다는 것은 비슷한 표현과 비슷한 근거를 썼다는 뜻입니다. 정반대 결론을 같은 언어로 말한 두 사람은 가깝게 놓입니다.',
      en: 'Closeness means similar wording and similar reasoning. Two people who reached opposite conclusions in the same language will sit close together.',
    },
  },
  {
    title: { ko: '한 지도에는 한 쟁점만', en: 'One map wants one question' },
    body: {
      ko: '실제 57분짜리 5당 토론에서 다섯 정당이 서로 겹쳐버렸습니다. 한 회의에서 여러 안건을 다루면 각자의 평균이 모두 가운데로 모입니다. 지도는 이 상태를 직접 재서, 사람을 구분하지 못할 때는 지도 아래에 그렇다고 적습니다. 네 번째 예시가 바로 이 경우입니다.',
      en: 'On a real 57-minute five-party debate, all five parties landed on top of each other: covering several agenda items pulls every average toward the middle. The map measures that directly and says under itself when it cannot tell people apart. The fourth example is exactly this case.',
    },
  },
  {
    title: { ko: '발언이 적으면 위치가 아닙니다', en: 'Few statements are not a position' },
    body: {
      ko: '점이 몇 개 없으면 어떤 평면에도 거의 그대로 들어맞습니다. 그래서 발언이 여섯 개 미만인 지도는 아무리 좋아 보여도 근거가 없고, 그 사실을 지도가 먼저 말합니다. 사람별로도 발언 세 개 미만이면 표식을 점선으로 그립니다.',
      en: 'A handful of points fits almost any plane exactly, so a map built on fewer than six statements looks convincing and shows nothing — and says so first. Per person, fewer than three statements gets a dashed marker.',
    },
  },
  {
    title: { ko: '거리 값 자체는 대략입니다', en: 'The exact distances are approximate' },
    body: {
      ko: '발언들의 차이는 원래 훨씬 여러 방향으로 나 있어서, 평면 한 장에 옮기면 보통 10~25%만 남습니다. 누가 가깝고 누가 먼지는 읽을 수 있지만, 0.62와 0.58의 차이는 읽지 마세요.',
      en: 'Differences between statements run in many more directions than a page has, so flattening usually keeps 10 to 25% of them. Near and far are readable; the difference between 0.62 and 0.58 is not.',
    },
  },
]

export const FOOTER = {
  builtWith: {
    ko: '연구용 프로토타입입니다. 결과를 인용하기 전에 위 한계를 먼저 읽어주세요.',
    en: 'A research prototype. Read the limits above before citing anything it produces.',
  },
  how: { ko: '어떻게 작동하나요', en: 'How it works' },
  repo: { ko: '소스 보기', en: 'Source' },
} satisfies Record<string, Bilingual>
