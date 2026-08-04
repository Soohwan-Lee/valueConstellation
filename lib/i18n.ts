export type Lang = 'ko' | 'en'

/**
 * UI strings.
 *
 * Chrome only — transcript content is never translated. A participant's words
 * are the evidence behind their position, so they stay in the language they were
 * spoken in; the detail panel shows a translation beside the original when one
 * is available, rather than in place of it.
 */
export const STRINGS = {
  tagline: {
    ko: '실제 발언을 근거로, 각 참여자가 어디에 서 있는지 보여줍니다.',
    en: 'Where each participant stands, derived from what they actually said.',
  },

  // First run
  leadIn: {
    ko: '회의록을 붙여넣으면 참여자별 입장 지도를 만듭니다. 먼저 예시를 열어보세요.',
    en: 'Paste a meeting transcript to map where participants stand. Start with an example.',
  },
  orPasteOwn: { ko: '직접 붙여넣기', en: 'Paste your own' },
  transcriptLabel: {
    ko: '한 줄에 한 발언씩, 앞에 누가 말했는지 적어주세요.',
    en: 'One statement per line, each prefixed with who said it.',
  },
  formatsLabel: { ko: '이런 형식을 인식합니다', en: 'Recognised formats' },
  loadSample: { ko: '예시 회의록 넣기', en: 'Load an example' },
  detectedLabel: { ko: '감지된 참여자', en: 'Detected' },
  noSpeakersYet: {
    ko: '아직 발언자를 찾지 못했습니다. 위 형식 중 하나로 줄을 시작해 보세요.',
    en: 'No speakers found yet. Start each line in one of the formats above.',
  },
  moderatorExcluded: {
    ko: '진행자로 보고 지도에서 제외합니다',
    en: 'read as facilitator, left off the map',
  },
  buildMap: { ko: '지도 만들기', en: 'Build map' },
  analyzing: { ko: '분석 중…', en: 'Analyzing…' },

  // Loading stages
  stageParse: { ko: '누가 말했는지 구분하는 중', en: 'Working out who said what' },
  stageSegment: { ko: '주장 단위로 나누는 중', en: 'Splitting into arguments' },
  stageEmbed: { ko: '뜻이 비슷한 것끼리 모으는 중', en: 'Grouping by meaning' },
  stageProject: { ko: '평면에 펼치는 중', en: 'Laying it out' },

  // Map controls
  speakersLabel: { ko: '참여자 표시', en: 'Speakers' },
  layoutLabel: { ko: '배치', en: 'Layout' },
  modePoint: { ko: '점', en: 'Point' },
  modeRegion: { ko: '범위', en: 'Region' },
  modeBoth: { ko: '둘 다', en: 'Both' },
  modePointHint: {
    ko: '참여자마다 중심 위치에 표식 하나',
    en: 'One marker per speaker at their centroid',
  },
  modeRegionHint: {
    ko: '그 사람의 발언을 감싸는 영역으로',
    en: 'A region wrapping where that speaker’s statements fell',
  },
  modeBothHint: {
    ko: '중심 표식과 영역을 함께',
    en: 'Centroid marker together with the region',
  },
  methodPeople: { ko: '사람', en: 'People' },
  methodPeopleHint: {
    ko: '참여자들이 서로 가장 크게 갈리는 방향으로 펼칩니다. 누가 누구와 다른지 보려면 이 배치입니다',
    en: 'Opens along what separates the participants most. The layout for seeing who differs from whom',
  },
  methodPca: { ko: '이야기', en: 'Topics' },
  methodPcaHint: {
    ko: '회의 전체에서 이야기가 가장 크게 갈린 방향으로 펼칩니다. 무엇을 두고 논의했는지가 축이 됩니다',
    en: 'Opens along what the room as a whole differed on, so the axes describe the discussion',
  },
  methodMds: { ko: '거리', en: 'Distance' },
  methodMdsHint: {
    ko: '누가 누구와 얼마나 떨어져 있는지를 최대한 그대로 옮깁니다. 거리가 더 정확합니다',
    en: 'Keeps who is how far from whom as close to the original as it can',
  },
  methodNote: {
    ko: '같은 발언을 세 가지로 펼친 것입니다. 위의 “사람 구분 정도”는 펼치기 전 원래 값에서 재기 때문에 배치를 바꿔도 변하지 않습니다 — 어떤 배치가 더 갈라 보이게 만드는지와, 실제로 갈라져 있는지는 다른 문제입니다.',
    en: 'Three ways of laying out the same statements. The separation figure above is measured before any of them, so switching does not change it — how far apart a layout draws people and how far apart they are are different questions.',
  },
  secondAxisNote: {
    ko: '참여자가 두 명이라 사람 사이 방향은 하나뿐입니다. 세로축은 대신 각자의 발언이 가장 크게 갈리는 방향을 보여줍니다.',
    en: 'With two participants there is only one direction between them, so the vertical axis shows what varies within each of them instead.',
  },
  displayOptions: { ko: '표시 설정', en: 'Display options' },
  showAll: { ko: '전체 보기', en: 'Show all' },
  // Korean has no plural marker, so `{s}` appears only in the English form.
  underdeterminedHint: {
    ko: '실질 발언이 {n}개뿐이라 위치가 확정적이지 않습니다',
    en: 'Only {n} substantive statement{s}, so the position is provisional',
  },

  // How to read
  howToRead: { ko: '이 지도 읽는 법', en: 'How to read this map' },
  howLink: { ko: '어떻게 작동하나요', en: 'How it works' },
  markLegend: { ko: '기호 하나씩 보기', en: 'What each mark means' },
  readMarker: {
    ko: '**표식**은 그 사람의 발언 전체를 요약한 위치입니다.',
    en: '**A marker** is the average position of everything that speaker said.',
  },
  readRegion: {
    ko: '**영역**은 그 사람의 발언이 실제로 퍼진 자리를 감쌉니다. 넓으면 여러 관점을 오갔고, 좁으면 한 관점으로 일관했습니다. 갈래가 둘로 나뉘면 서로 다른 두 논지를 오간 것입니다.',
    en: '**The region** wraps where that speaker\'s statements actually fell. Wide means they ranged across framings, narrow means they stayed on one, and two lobes mean they argued from two separate positions.',
  },
  readDot: {
    ko: '**작은 점**은 개별 발언입니다. 클릭하면 원문이 나옵니다.',
    en: '**Small dots** are individual statements. Click one to read it.',
  },
  readDistance: {
    ko: '**가까움**은 비슷한 표현과 근거를 썼다는 뜻입니다. 결론이 같다는 뜻은 아닙니다.',
    en: '**Closeness** means similar wording and reasoning — not necessarily the same conclusion.',
  },
  readDashed: {
    ko: '**점선 표식**은 발언이 3개 미만이라 위치를 신뢰하기 어렵다는 표시입니다.',
    en: '**A dashed marker** means fewer than three statements, so the position is provisional.',
  },
  readAxes: {
    ko: '**가로·세로 축**은 이 회의에서 가장 크게 갈린 두 방향입니다. 양 끝 발언을 읽고 붙인 이름이라 참고용이고, 거리를 정확히 옮기는 배치에서는 방향에 뜻이 없어 이름이 붙지 않습니다.',
    en: '**The axes** are the two directions this meeting split on most. The names come from reading the statements at each end, so treat them as a reading aid — the distance-preserving layout has none, because its orientation is arbitrary.',
  },
  readMeasure: {
    ko: '**측정선**은 참여자를 선택하면 그어집니다. 옆의 숫자는 이 지도에서 가장 먼 쌍을 1.00으로 둔 상대 거리입니다.',
    en: '**Measure lines** appear when you select a participant. The number beside each is that gap as a share of the widest gap on this map.',
  },

  // Mark legend, on the plate
  legendMarker: { ko: '그 사람의 중심', en: 'Their centre' },
  legendDot: { ko: '발언 하나', en: 'One statement' },
  legendRegion: { ko: '발언이 퍼진 범위', en: 'Where they ranged' },
  legendMeasure: { ko: '사이 거리 — 참여자를 클릭', en: 'Gap — click a participant' },
  legendAxis: { ko: '가장 크게 갈린 두 방향', en: 'The two biggest splits' },

  // Console rail
  sourceLabel: { ko: '자료', en: 'Source' },
  participantsLabel: { ko: '참여자', en: 'Participants' },
  distanceLabel: { ko: '사이 거리', en: 'Distance' },
  distanceNote: {
    ko: '이 지도에서 가장 먼 두 사람을 1.00으로 둔 상대 거리입니다.',
    en: 'Relative to the widest gap on this map, which is 1.00.',
  },
  measureHint: {
    ko: '참여자를 선택하면 나머지와의 거리를 지도에 긋습니다.',
    en: 'Select a participant to draw their distance to everyone else.',
  },
  backToOverview: { ko: '소개로 돌아가기', en: 'Overview' },
  pasteTitle: { ko: '회의록 붙여넣기', en: 'Paste a transcript' },
  customSource: { ko: '붙여넣은 회의록', en: 'Pasted transcript' },
  cancel: { ko: '취소', en: 'Cancel' },
  close: { ko: '닫기', en: 'Close' },
  toDark: { ko: '어둡게 보기', en: 'Switch to dark' },
  toLight: { ko: '밝게 보기', en: 'Switch to light' },
  hideOnMap: { ko: '지도에서 숨기기', en: 'Hide on map' },
  showOnMap: { ko: '지도에 다시 표시', en: 'Show on map' },

  // Kinds of contribution, as named in the interface rather than in the schema.
  kindClaim: { ko: '주장', en: 'Claim' },
  kindQuestion: { ko: '질문', en: 'Question' },
  kindAgreement: { ko: '동의', en: 'Assent' },
  kindProcedural: { ko: '진행', en: 'Procedural' },

  // Detail panel
  translation: { ko: '번역', en: 'Translation' },
  original: { ko: '원문', en: 'Original' },
  utterances: { ko: '발언', en: 'Statements' },
  mapped: { ko: '지도에 표시', en: 'Mapped' },
  assentProcedural: { ko: '단순 동의 / 진행 발언', en: 'Assent / procedural' },
  offsetLabel: { ko: '이 사람 중심에서', en: 'From their centre' },
  nearestLabel: { ko: '가장 가까운 사람', en: 'Closest to' },
  spreadLabel: { ko: '퍼짐', en: 'Spread' },
  order: { ko: '순서', en: 'Order' },
  excluded: { ko: '제외', en: 'excluded' },

  // Warnings
  provisional: {
    ko: '발언이 적어 위치가 확정적이지 않습니다.',
    en: 'Too few statements for a stable estimate; treat as provisional.',
  },
  notPlaced: {
    ko: '지도에 표시되지 않음 (실질 발언 없음)',
    en: 'Not placed (no substantive statements)',
  },
  // How much to trust this map, in the order a reader needs it: does it tell
  // these people apart at all, and then how much detail the flattening cost.
  verdictStrong: {
    ko: '이름을 가린 발언 100개를 이 지도 위에 놓으면 {pct}개는 실제 발언자에게 돌아갑니다. 아무렇게나 찍으면 {chance}개입니다.',
    en: 'Hand this map 100 statements with the names removed and {pct} of them land nearest the person who actually said them. Guessing would get {chance}.',
  },
  verdictWeak: {
    ko: '이름을 가린 발언 100개 중 {pct}개가 실제 발언자에게 돌아갑니다. 아무렇게나 찍으면 {chance}개이니 우연보다는 낫지만, 크게 낫지는 않습니다 — 각자 자기 이야기를 하면서도 서로 비슷한 말을 많이 했다는 뜻입니다.',
    en: 'Of 100 statements with the names removed, {pct} land nearest the person who said them, against {chance} for guessing. Better than chance, but not by much — they said a lot of similar things alongside their own.',
  },
  verdictNone: {
    ko: '이 지도는 참여자를 구분하지 못합니다. 이름을 가린 발언 100개 중 {pct}개만 실제 발언자에게 돌아가는데, 아무렇게나 찍어도 {chance}개입니다. 대개 한 회의에서 여러 안건을 함께 다룬 경우로, 안건이 바뀔 때마다 발언이 딴 곳으로 튀어 평균이 모두 가운데로 모입니다 — 쟁점 하나로 좁혀서 다시 만들어 보세요.',
    en: 'This map cannot tell the participants apart. Of 100 statements with the names removed only {pct} land nearest the person who said them, and guessing would get {chance}. That usually means one meeting covered several agenda items: every change of topic throws a person’s statements somewhere else and every average lands in the middle. Narrow it to one question and try again.',
  },
  attributionTerm: { ko: '발언 되찾기', en: 'Statements traced back' },
  separationTerm: { ko: '사람 구분 정도', en: 'Separation' },

  keptPeople: {
    ko: '참여자들 사이의 차이 중 {pct}%가 이 평면에 남았습니다. 이 배치는 사람을 갈라 보이게 하려고 고른 것이라 이 수치는 높게 나옵니다 — 실제로 갈라져 있는지는 위의 “사람 구분 정도”가 답합니다.',
    en: '{pct}% of the differences between the participants survived the flattening. This layout was chosen to show them apart, so the figure runs high — whether they really are apart is what the separation figure above answers.',
  },
  keptPlain: {
    ko: '발언들의 차이는 원래 훨씬 여러 방향으로 나 있고, 그중 {pct}%가 이 평면에 남았습니다. 회의 전체를 담으려는 배치라 이 수치는 보통 10~25%로 낮게 나옵니다 — 대부분이 누가 말했는지가 아니라 무슨 주제였는지에 대한 차이이기 때문입니다.',
    en: 'Differences between statements run in many more directions than two, and {pct}% of that survived. A layout that tries to hold the whole discussion usually lands between 10 and 25%, because most of what it is holding is topic rather than who was speaking.',
  },
  keptTerm: { ko: '평면에 남은 정도', en: 'Detail kept' },
  keptFitSaturated: {
    ko: '참여자가 {n}명뿐이라 이 수치는 의미가 없습니다 — 점 세 개는 어떤 평면에도 정확히 들어맞습니다.',
    en: 'With only {n} participants this figure means nothing: three points fit a plane exactly.',
  },
  keptSaturated: {
    ko: '발언이 {n}개뿐이라 이 수치({pct}%)는 아무 뜻이 없습니다. 점이 몇 개 없으면 어떤 평면에도 거의 그대로 들어맞기 때문입니다. 더 긴 회의록이 필요합니다.',
    en: 'With only {n} statements this figure ({pct}%) means nothing — a handful of points fits almost any plane exactly. A longer transcript is needed.',
  },
  keptMds: {
    ko: '이 배치는 사람 사이 거리를 최대한 그대로 옮기는 방식이라, 얼마나 남았는지를 나타내는 수치가 없습니다.',
    en: 'This layout preserves the distances between people as closely as it can, so there is no figure for how much was kept.',
  },
  shapeNote: {
    ko: '참여자가 {n}명으로 구분 가능한 색({max}개)을 넘어, 표식 모양으로 구분합니다.',
    en: '{n} speakers exceeds the {max} distinct colours available, so shape distinguishes the rest.',
  },

  // Errors
  needsKey: {
    ko: '서버에 OPENAI_API_KEY가 설정되지 않았습니다.',
    en: 'OPENAI_API_KEY is not configured on the server.',
  },
} as const

export type StringKey = keyof typeof STRINGS

export function t(key: StringKey, lang: Lang): string {
  return STRINGS[key][lang]
}

/** Fills `{name}` placeholders. */
export function tf(
  key: StringKey,
  lang: Lang,
  vars: Record<string, string | number>,
): string {
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
    t(key, lang),
  )
}

/** Interface name for an utterance kind. */
export function kindLabel(
  kind: 'claim' | 'question' | 'agreement' | 'procedural',
  lang: Lang,
): string {
  const keys = {
    claim: 'kindClaim',
    question: 'kindQuestion',
    agreement: 'kindAgreement',
    procedural: 'kindProcedural',
  } as const
  return t(keys[kind], lang)
}

/** Renders **bold** spans in a string as React-ready segments. */
export function boldSegments(s: string): { text: string; bold: boolean }[] {
  return s.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((part) =>
    part.startsWith('**') && part.endsWith('**')
      ? { text: part.slice(2, -2), bold: true }
      : { text: part, bold: false },
  )
}
