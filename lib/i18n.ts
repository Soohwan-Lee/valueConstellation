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
  examplesLabel: { ko: '예시', en: 'Examples' },
  orPasteOwn: { ko: '직접 붙여넣기', en: 'Paste your own' },
  transcriptLabel: {
    ko: '회의록 — 한 줄에 한 발언 (김철수: …, [김철수] …, ◯ 김철수 위원 …)',
    en: 'Transcript — one speaker per line (Alice: …, [Alice] …, Kim: …)',
  },
  buildMap: { ko: '지도 만들기', en: 'Build map' },
  analyzing: { ko: '분석 중…', en: 'Analyzing…' },
  back: { ko: '← 예시로 돌아가기', en: '← Back to examples' },

  // Loading stages
  stageParse: { ko: '발언자 구분', en: 'Attributing speakers' },
  stageSegment: { ko: '주장 단위 분리', en: 'Segmenting arguments' },
  stageEmbed: { ko: '의미 임베딩', en: 'Embedding meaning' },
  stageProject: { ko: '2차원 배치', en: 'Projecting to 2D' },

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
    ko: '참여자의 발언이 퍼진 범위를 타원으로',
    en: 'An ellipse covering the spread of that speaker’s statements',
  },
  modeBothHint: {
    ko: '중심 표식과 퍼짐 타원을 함께',
    en: 'Centroid marker together with the spread ellipse',
  },
  methodPcaHint: {
    ko: '선형 투영. 2차원이 원래 공간을 얼마나 담는지 함께 보고합니다',
    en: 'Linear projection; reports how much of the original space the 2D view captures',
  },
  methodMdsHint: {
    ko: '코사인 거리 기반 MDS. 쌍 간 거리를 보존합니다',
    en: 'Metric MDS on cosine distance; preserves pairwise distance',
  },
  displayOptions: { ko: '표시 설정', en: 'Display options' },
  // Korean has no plural marker, so `{s}` appears only in the English form.
  speakersDetected: {
    ko: '{n}명 감지',
    en: '{n} speaker{s} detected',
  },
  newTranscript: { ko: '새 회의록', en: 'New transcript' },
  showAll: { ko: '전체 보기', en: 'Show all' },
  underdeterminedHint: {
    ko: '실질 발언이 {n}개뿐이라 위치가 확정적이지 않습니다',
    en: 'Only {n} substantive statement{s}, so the position is provisional',
  },

  // How to read
  howToRead: { ko: '이 지도 읽는 법', en: 'How to read this map' },
  readMarker: {
    ko: '**표식**은 그 사람의 발언 전체를 요약한 위치입니다.',
    en: '**A marker** is the average position of everything that speaker said.',
  },
  readEllipse: {
    ko: '**타원**은 발언이 흩어진 범위입니다. 넓으면 여러 관점을 오갔고, 좁으면 한 관점으로 일관했습니다.',
    en: '**The ellipse** is how spread out their statements were. Wide means they ranged across framings; narrow means they stayed on one.',
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
    ko: '축에는 이름이 없습니다. 방향 자체에 정해진 의미가 없고, 중요한 것은 **서로 간의 거리**입니다.',
    en: 'The axes are unlabelled: the directions carry no fixed meaning. Only **relative distance** matters.',
  },

  // Detail panel
  selectPrompt: {
    ko: '점을 클릭하면 그 발언의 원문이, 표식을 클릭하면 그 사람의 발언 전체가 나옵니다.',
    en: 'Click a point to read the statement behind it, or a speaker marker to see everything they said.',
  },
  translation: { ko: '번역', en: 'Translation' },
  original: { ko: '원문', en: 'Original' },
  utterances: { ko: '발언', en: 'Statements' },
  mapped: { ko: '지도에 표시', en: 'Mapped' },
  assentProcedural: { ko: '단순 동의 / 진행 발언', en: 'Assent / procedural' },
  position: { ko: '위치', en: 'Position' },
  centroid: { ko: '중심', en: 'Centroid' },
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
  variance: {
    ko: '2개 축이 원래 의미 공간의 분산 중 {pct}%를 담습니다.',
    en: 'The two axes capture {pct}% of the variance in the original meaning space.',
  },
  lowSeparation: {
    ko: '참여자들이 서로 떨어진 거리보다 각자의 발언이 더 넓게 퍼져 있습니다(분리도 {sep}). 이 회의에서는 화자 위치가 참여자를 구분하지 못합니다 — 여러 쟁점을 함께 다뤄서 평균이 모두 가운데로 모인 경우입니다. 쟁점을 하나로 좁혀 다시 만들어 보세요.',
    en: 'Each speaker\'s statements scatter wider than the speakers sit apart (separation {sep}). Here the centroids are not distinguishing anybody — the discussion covered several issues, so averaging pulled everyone to the middle. Try a transcript narrowed to one question.',
  },
  separationLabel: { ko: '분리도', en: 'Separation' },
  varianceSaturated: {
    ko: '발언이 {n}개뿐이라 이 수치({pct}%)는 의미가 없습니다 — 점이 적으면 2차원에 거의 그대로 들어맞습니다. 더 긴 회의록이 필요합니다.',
    en: 'With only {n} statements this figure ({pct}%) carries no information — few points always fit two dimensions almost exactly. A longer transcript is needed.',
  },
  varianceWeak: {
    ko: '나머지는 2차원에 담기지 않았으므로 거리는 참고용으로만 보세요.',
    en: 'The rest does not fit in two dimensions, so read distances as approximate.',
  },
  mdsNote: {
    ko: 'MDS는 쌍 간 거리를 보존하지만 분산 설명력 지표가 없습니다.',
    en: 'MDS preserves pairwise distances but has no explained-variance measure.',
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

/** Renders **bold** spans in a string as React-ready segments. */
export function boldSegments(s: string): { text: string; bold: boolean }[] {
  return s.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((part) =>
    part.startsWith('**') && part.endsWith('**')
      ? { text: part.slice(2, -2), bold: true }
      : { text: part, bold: false },
  )
}
