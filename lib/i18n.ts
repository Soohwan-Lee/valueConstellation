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
  // Named for the question each one answers, not for what it optimises. "사람 /
  // 이야기 / 거리" was three nouns with no verb: a reader could see that the
  // picture moved and not what had been asked of it.
  methodPeople: { ko: '사람별로 갈라 보기', en: 'Spread the people apart' },
  methodPeopleHint: {
    ko: '참여자들이 서로 가장 크게 갈리는 두 방향을 화면의 가로·세로로 씁니다. 누가 누구와 다른지 보려면 이 배치입니다.',
    en: 'Uses the two directions the participants differ on most as the screen’s across and down. The layout for seeing who differs from whom.',
  },
  methodPca: { ko: '주제별로 갈라 보기', en: 'Spread the topics apart' },
  methodPcaHint: {
    ko: '회의 전체에서 이야기가 가장 크게 갈린 두 방향을 씁니다. 축이 “무엇을 두고 논의했는가”를 가리키므로, 축에 이름이 붙는 배치입니다.',
    en: 'Uses the two directions the discussion as a whole split on, so the axes describe what was argued about — and this is the layout whose axes get names.',
  },
  methodMds: { ko: '거리 그대로 보기', en: 'Keep the distances true' },
  methodMdsHint: {
    ko: '방향은 포기하고, 누가 누구와 얼마나 떨어져 있는지만 최대한 그대로 옮깁니다. 그래서 축에 이름이 없습니다.',
    en: 'Gives up on direction and carries only who is how far from whom, as faithfully as it can. That is why its axes have no names.',
  },
  methodNote: {
    ko: '세 배치는 같은 결과를 화면에 옮기는 방법만 다릅니다. 발언도, 사람도, 사람 사이 관계도 그대로이고 보는 각도만 바뀝니다. 위의 판정은 화면이 아니라 옮기기 전 원래 값에서 재므로 어느 배치를 골라도 같은 수치입니다 — 어떤 배치가 더 갈라 보이게 그리는지와 실제로 갈라져 있는지는 다른 문제이고, 앞의 것으로 뒤의 것을 판단할 수는 없습니다.',
    en: 'The three differ only in how one result is carried onto the screen: same statements, same people, same relationships, a different angle on them. The verdict above is measured before any of that, so it reads the same whichever you pick — how far apart a layout draws people and how far apart they are are different questions, and the first cannot answer the second.',
  },
  secondAxisNote: {
    ko: '참여자가 두 명이라 사람 사이 방향은 하나뿐입니다. 세로축은 대신 각자의 발언이 가장 크게 갈리는 방향을 보여줍니다.',
    en: 'With two participants there is only one direction between them, so the vertical axis shows what varies within each of them instead.',
  },
  displayOptions: { ko: '표시 설정', en: 'Display options' },
  builtWith: { ko: '이 지도를 만든 것', en: 'What made this map' },
  builtWithRead: { ko: '읽기', en: 'Reading' },
  builtWithPlace: { ko: '자리 잡기', en: 'Placing' },
  builtWithMore: {
    ko: '계산 방법과 기준값 전부 보기 →',
    en: 'Every method and threshold →',
  },
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
  stanceHeading: { ko: '이 사람의 주장', en: 'What they argued' },
  themesHeading: { ko: '반복해서 돌아온 지점', en: 'Kept coming back to' },
  anchorTag: { ko: '근거', en: 'Basis' },
  summaryOrigin: {
    ko: '발언 내용을 읽어 정리한 요약입니다. 지도 좌표가 아니라 실제 발언에서 나왔으므로, 배치를 바꿔도 이 요약은 그대로입니다. 아래 “근거” 표시가 붙은 발언이 근거입니다.',
    en: 'Read from what this person said, not from where they sit — switch the layout and this summary does not change. The statements marked “Basis” below are what it rests on.',
  },
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
  // How much to trust this map.
  //
  // A verdict is a headline plus one sentence, in that order and in that
  // weight. These four sentences used to be the whole of it, each opening on
  // its own arithmetic — "hand this map 100 statements with the names removed
  // and 64 of them land nearest the person who actually said them" — so a
  // reader had to finish a clause about a procedure they had not asked about
  // before reaching the answer. The headline says whether to believe the map;
  // the sentence says how that was established, for whoever wants it.
  verdictStrongHead: {
    ko: '이 지도는 참여자를 잘 구분합니다',
    en: 'This map tells the participants apart',
  },
  verdictStrong: {
    ko: '발언에서 이름을 지우고 “누가 한 말인지” 지도에 물어보면 100개 중 {pct}개를 맞힙니다. 찍으면 {chance}개입니다.',
    en: 'Take the names off the statements and ask the map who said each one: it gets {pct} of 100 right, where guessing gets {chance}.',
  },
  verdictWeakHead: {
    ko: '구분은 되지만 뚜렷하지 않습니다',
    en: 'It tells them apart, but only just',
  },
  verdictWeak: {
    ko: '이름을 지운 발언 100개 중 {pct}개를 맞힙니다 — 찍었을 때의 {chance}개보다 낫지만 크게 낫지는 않습니다. 각자 자기 이야기를 하면서도 서로 비슷한 말을 많이 했다는 뜻입니다.',
    en: 'With the names removed it gets {pct} of 100 right, against {chance} for guessing — better, but not by much. They said a lot of similar things alongside their own.',
  },
  verdictNoneHead: {
    ko: '이 지도는 참여자를 구분하지 못합니다',
    en: 'This map cannot tell the participants apart',
  },
  verdictNone: {
    ko: '이름을 지운 발언 100개 중 {pct}개만 맞히는데, 찍어도 {chance}개는 맞습니다. 대개 한 회의에서 여러 안건을 함께 다룬 경우입니다 — 안건이 바뀔 때마다 그 사람의 발언이 딴 자리로 튀고, 그것을 평균 내면 모두가 가운데로 모입니다. 쟁점 하나로 좁혀서 다시 만들어 보세요.',
    en: 'With the names removed it gets only {pct} of 100 right, and guessing gets {chance}. That usually means one meeting covered several agenda items: each change of topic throws a person’s statements somewhere else, and averaging those lands everybody in the middle. Narrow it to one question and run it again.',
  },
  agendaLabel: { ko: '안건', en: 'Agenda' },
  cardPeople: { ko: '{n}명', en: '{n} people' },
  cardStatements: { ko: '발언 {n}개', en: '{n} statements' },
  cardWorks: { ko: '구분됨', en: 'Tells them apart' },
  cardFails: { ko: '구분 실패', en: 'Cannot tell them apart' },
  verdictThinHead: {
    ko: '판정하기에는 발언이 적습니다',
    en: 'Too little was said to judge',
  },
  verdictThin: {
    ko: '한 사람당 {n}개(중앙값)로, 판정하려면 {min}개는 있어야 합니다. 지도는 그대로 읽으셔도 되지만, 참여자가 실제로 갈렸는지는 이 분량으로 말할 수 없습니다 — 회의가 산만했다는 뜻이 아니라 짧았다는 뜻입니다.',
    en: '{n} statements per person at the median, where {min} is the minimum. The map is still worth reading, but whether these people genuinely differ is not something this much material can settle — the meeting was short, not unfocused.',
  },

  // The figures themselves, behind one click, each with the sentence that makes
  // it readable. They used to sit open in a row — "발언 되찾기 64% / 25%,
  // 사람 구분 정도 1.04, 평면에 남은 정도 17%" — three coinages and four bare
  // numbers under a map somebody was still working out how to read. A number
  // nobody can interpret is not transparency; it is noise that looks like
  // transparency.
  trustTitle: { ko: '이 숫자들은 무슨 뜻인가요', en: 'What these numbers mean' },
  attributionTerm: { ko: '누가 말했는지 맞히기', en: 'Who-said-it accuracy' },
  attributionHelp: {
    ko: '이름을 지운 발언 하나를 지도에서 가장 가까운 사람에게 돌려줬을 때 맞은 비율입니다. 괄호 안은 찍었을 때의 확률이고, 두 숫자의 차이가 지도가 실제로 알아낸 몫입니다.',
    en: 'Take one statement, remove its name, and give it to whoever’s centre is nearest: this is how often that is the right person. In brackets is what guessing would get, and the gap between the two is what the map actually knows.',
  },
  separationTerm: { ko: '서로 떨어진 정도', en: 'Apart vs. spread' },
  separationHelp: {
    ko: '두 사람 중심 사이의 평균 거리를, 각자의 발언이 퍼진 평균 폭으로 나눈 값입니다. 1보다 크면 사람 사이 간격이 각자의 폭보다 넓고, 1보다 작으면 서로 겹칩니다.',
    en: 'The average gap between two people’s centres divided by how widely each of them ranged. Above 1 they stand further apart than they are wide; below 1 they overlap.',
  },
  keptTerm: { ko: '화면에 옮긴 정도', en: 'Carried onto the screen' },
  keptPeople: {
    ko: '참여자들이 서로 갈리는 정도 중 {pct}%를 이 화면에 옮겼습니다. 사람을 갈라 보이게 하려고 고른 배치라 이 수치는 원래 높게 나옵니다 — 실제로 갈렸는지는 위의 판정이 답합니다.',
    en: 'This layout carried {pct}% of what separates the participants onto the screen. It was chosen to show them apart, so the figure runs high by construction — whether they really are apart is what the verdict above answers.',
  },
  keptPlain: {
    ko: '발언의 차이는 두 방향보다 훨씬 많은 방향으로 나 있고, 그중 {pct}%를 이 화면에 옮겼습니다. 회의 전체를 담으려는 배치라 보통 10~25%에 그치는데, 화면에 못 담긴 대부분은 누가 말했는지가 아니라 무슨 주제였는지의 차이입니다.',
    en: 'Statements differ in far more than two directions, and this layout carried {pct}% of that onto the screen. A layout holding the whole discussion usually lands between 10 and 25%, and most of what it leaves behind is topic rather than person.',
  },
  mappedTerm: { ko: '지도에 올린 발언', en: 'Statements mapped' },
  mappedHelp: {
    ko: '주장만 지도에 올립니다. 단순 동의 {a}개와 “다음 안건으로 넘어가겠습니다” 같은 진행 발언 {p}개는 입장이 담겨 있지 않아 자리를 흐리므로 뺐습니다.',
    en: 'Only statements that carry a position are placed. {a} bare agreements and {p} procedural lines (“let us move to the next item”) say nothing about where somebody stands and would blur the ones that do, so they are left off.',
  },
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
