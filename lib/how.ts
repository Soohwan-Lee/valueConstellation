import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL, MODEL } from './models'
import type { Bilingual } from './landing'

/**
 * Content for the technical reference page.
 *
 * Nobody needs this to use the tool, which is why it is not on the overview.
 * It exists because somebody eventually asks what the numbers came from —
 * a reviewer, a colleague being shown a result, or the person who has to
 * decide whether a map is quotable — and "it uses AI" is not an answer.
 *
 * Every figure here is a value the code actually uses. When one changes in
 * `lib/`, it changes here.
 */

export interface Entry {
  term: Bilingual
  value?: string
  body: Bilingual
}

export interface Group {
  title: Bilingual
  intro?: Bilingual
  entries: Entry[]
}

export const HOW_HEAD = {
  eyebrow: { ko: '참고 문서', en: 'Reference' },
  headline: { ko: '어떻게 작동하나요', en: 'How this works' },
  lead: {
    ko: '지도를 읽는 데 필요한 내용은 아닙니다. 결과를 인용하거나 검토해야 하는 분들을 위해, 실제로 쓰인 모델과 계산 방법, 그리고 판단에 쓰이는 기준값을 그대로 적어둡니다.',
    en: 'None of this is needed to read a map. It is here for anybody who has to quote or review a result: the models actually used, how the numbers are computed, and every threshold the tool makes a judgement on.',
  },
  back: { ko: '← 소개로', en: '← Overview' },
} satisfies Record<string, Bilingual>

export const GROUPS: Group[] = [
  {
    title: { ko: '쓰이는 모델', en: 'Models used' },
    intro: {
      ko: '두 번 호출합니다. 발언자 구분은 규칙 기반이라 모델을 쓰지 않습니다.',
      en: 'Two calls. Attributing speakers is rule-based and uses no model.',
    },
    entries: [
      {
        term: { ko: '주장 단위 분리', en: 'Segmentation' },
        value: MODEL,
        body: {
          ko: '한 사람의 발언을 주장 단위로 나눕니다. 한 번에 15개 턴씩, 최대 8개 요청을 동시에 보냅니다. 결과는 원문 순서로 다시 이어 붙입니다.',
          en: 'Splits a turn into argument units. Fifteen turns per call, up to eight calls in flight, reassembled in transcript order.',
        },
      },
      {
        term: { ko: '의미 좌표', en: 'Embedding' },
        value: `${EMBEDDING_MODEL} · ${EMBEDDING_DIMENSIONS}d`,
        body: {
          ko: '각 주장을 1536개 숫자로 바꿉니다. 이 숫자들 사이의 거리가 지도상 거리의 근거입니다.',
          en: 'Turns each argument into 1536 numbers. Distances between those are what every distance on the map comes from.',
        },
      },
      {
        term: { ko: '번역', en: 'Translation' },
        value: '',
        body: {
          ko: '한국어 발언에는 영어 번역이 함께 생성되어 상세 패널에 원문과 나란히 표시됩니다. 좌표는 항상 원문으로 계산합니다.',
          en: 'Korean statements carry an English rendering, shown beside the original in the inspector. Coordinates are always computed from the original.',
        },
      },
    ],
  },
  {
    title: { ko: '평면으로 펼치는 방법', en: 'Flattening to two dimensions' },
    intro: {
      ko: `${EMBEDDING_DIMENSIONS}개 방향을 종이 한 장에 옮기는 방법은 하나가 아닙니다. 세 가지를 모두 계산해 두고 전환할 수 있게 했습니다. 어느 것을 골라도 아래의 신뢰 수치는 변하지 않습니다.`,
      en: `${EMBEDDING_DIMENSIONS} directions do not fit on a page one way, so all three are computed and you can switch. The trust figures below read the same whichever you pick.`,
    },
    entries: [
      {
        term: { ko: '사람 배치', en: 'People layout' },
        value: 'centroid PCA · √n weighted',
        body: {
          ko: '기본값입니다. 발언이 아니라 사람의 중심점들에 평면을 맞춥니다 — 지도가 답하려는 질문이 “누가 누구와 다른가”이기 때문입니다. 발언 수의 제곱근으로 가중치를 줘서, 세 번 말한 사람이 마흔 번 말한 사람만큼 방향을 끌지 못하게 합니다. 사람 사이 차이 중 얼마가 남았는지가 계산되고, 실제 회의록에서는 76~100%가 남습니다. 참여자가 세 명 이하면 세 점은 언제나 한 평면에 정확히 놓이므로 이 수치는 산수의 결과일 뿐이고, 그럴 때는 그렇다고 표시합니다.',
          en: 'The default. Fits the plane to the speaker centroids rather than to the statements, because the question the map exists for is who differs from whom. Weighted by the square root of statement count, so somebody who spoke three times does not steer the direction as hard as somebody who spoke forty. How much of the *between-speaker* difference survived is computable and runs 76-100% on real transcripts. With three or fewer participants that figure is arithmetic — three points always lie in a plane exactly — and is marked as such.',
        },
      },
      {
        term: { ko: 'PCA', en: 'PCA' },
        value: 'power iteration',
        body: {
          ko: '발언들이 가장 크게 갈리는 방향 두 개를 찾아 그 방향으로 펼칩니다. 가로·세로에 뜻이 생겨서, 회의가 무엇을 두고 갈렸는지 읽을 때 씁니다. 남는 비율은 보통 10~25%인데, 이것이 낮다고 지도가 나쁜 것은 아닙니다 — PCA는 발언 전체의 차이를 최대로 남기려 하고, 문장 임베딩에서 그 차이의 대부분은 주제와 표현 방식입니다. 즉 PCA가 가장 열심히 지키는 것이 이 지도가 보려는 것과 다릅니다.',
          en: 'Finds the two directions the statements differ on most and opens out along them, so the axes describe what the room argued about. The share kept is usually 10 to 25%, and that is not a verdict on the map: PCA maximises variance among *all* statements, and most of a sentence embedding is topic and phrasing. What PCA works hardest to keep is not what this map is for.',
        },
      },
      {
        term: { ko: 'MDS', en: 'Metric MDS' },
        value: 'classical · cosine',
        body: {
          ko: '방향을 찾는 대신, 모든 쌍의 거리를 최대한 그대로 옮깁니다. 코사인 거리를 씁니다. 축 자체에는 뜻이 없고, 얼마가 남았는지를 나타내는 수치도 없습니다.',
          en: 'Instead of finding directions, it keeps every pairwise distance as close to the original as it can, on cosine distance. The axes mean nothing and there is no kept-detail figure.',
        },
      },
      {
        term: { ko: '축 이름', en: 'Axis names' },
        value: `${MODEL} · 사람·이야기 배치`,
        body: {
          ko: '각 축의 양 끝에서 가장 멀리 나간 발언 다섯 개씩을 모델에 보여주고, 그 끝의 발언들이 공통으로 무엇을 말하는지 2~5단어로 이름 붙이게 합니다. 화자 이름은 넘기지 않습니다 — 축이 사람 이름을 갖게 되면 모두가 한 참여자를 기준으로 측정된 것처럼 보이기 때문입니다. 사람·이야기 배치 두 가지에만 붙입니다. MDS는 회전시켜도 잃는 것이 없는 배치라, 그 방향에 이름을 붙이는 것은 없는 뜻을 지어내는 일입니다. 이 호출이 실패해도 지도는 이름 없이 그대로 나옵니다.',
          en: 'The five statements furthest along each end of each axis are shown to the model, which names what they have in common in 2-5 words. Speaker names are withheld: an axis named after a person would make everybody appear to be measured against that participant. Done for the people and topics layouts only — MDS loses nothing under rotation, so naming its directions would be inventing meaning. If the call fails the map is drawn without names.',
        },
      },
      {
        term: { ko: '사람의 위치', en: 'A person’s position' },
        value: '',
        body: {
          ko: `평면 좌표를 평균 내지 않습니다. ${EMBEDDING_DIMENSIONS}차원 공간에서 그 사람의 발언을 평균 낸 뒤 그 점을 평면으로 옮깁니다. 둘은 선형 투영에서만 일치하고, 기본 배치가 선형인 이유가 이것입니다. MDS는 새 점을 나중에 넣을 수 없어서, 사람의 중심을 발언과 함께 한 번에 계산합니다.`,
          en: `Never averaged from 2D coordinates. A speaker is averaged in the ${EMBEDDING_DIMENSIONS}-dimensional space and that point is then projected. The two agree only for a linear map, which is why the default layout is linear; MDS has no out-of-sample extension, so centroids are embedded jointly with the statements.`,
        },
      },
      {
        term: { ko: '사람별 요약', en: 'Per-speaker summaries' },
        value: MODEL,
        body: {
          ko: '참여자 전원의 발언을 한 번의 호출로 함께 보여주고, 각자의 주장 한 문장과 반복해서 돌아온 지점 2~4개를 쓰게 합니다. 한 사람씩 따로 부르지 않는 이유는, 그러면 서로 바꿔 놓아도 말이 되는 요약이 나오기 때문입니다. 요약이 근거로 삼은 발언 번호를 함께 받아 상세 패널에 “근거”로 표시하고, 그 사람이 하지 않은 발언을 가리키는 번호는 버립니다. 좌표가 아니라 발언에서 나오므로 배치를 바꿔도 요약은 그대로입니다.',
          en: 'One call covering every participant, returning a one-sentence stance and 2-4 recurring concerns each. Not one call per person: summarised in isolation, the results come back interchangeable. Each carries the ids of the statements it rests on, marked in the inspector, and an id pointing at a statement that speaker did not make is dropped. Read from the transcript rather than the coordinates, so switching layout does not change it.',
        },
      },
    ],
  },
  {
    title: { ko: '영역을 정하는 규칙', en: 'How a region is decided' },
    entries: [
      {
        term: { ko: '지도의 해상도', en: 'Map resolution' },
        value: 'median within-speaker NN',
        body: {
          ko: '발언마다 같은 사람이 한 가장 가까운 다른 발언까지의 거리를 재고, 참여자 전원의 값을 모아 중앙값을 냅니다. 다른 사람과의 거리는 세지 않습니다 — 서로 다른 두 사람이 거의 같은 말을 하는 일이 흔해서, 포함하면 값이 절반 아래로 떨어지고 모든 영역이 네다섯 조각으로 부서집니다. 값은 하나로 모아 쓰기 때문에 두 사람의 영역 크기를 그대로 비교할 수 있습니다.',
          en: 'For each statement, the distance to the nearest other statement by the same person, pooled across everybody, median. Distances to other people are excluded: two people saying near-identical things is common, and including those halves the figure, at which point every region shatters into four or five fragments. Pooled into one number, so two regions are drawn at one scale.',
        },
      },
      {
        term: { ko: '윤곽선', en: 'The outline' },
        value: 'exp(−1) level set',
        body: {
          ko: '각 발언이 거리에 따라 옅어지는 영향력을 뿜고, 그 합이 “혼자 있는 발언이 한 해상도 떨어진 곳에서 갖는 세기”와 같아지는 선을 그립니다. 이 기준값은 조절값이 아니라, 혼자 있는 발언의 윤곽이 정확히 한 해상도에 놓이게 하는 유일한 값입니다.',
          en: 'Each statement radiates influence that falls off with distance; the outline is where the sum equals what one statement alone has at one resolution away. That level is not a tuning knob — it is the one value that puts a lone statement’s outline at exactly one resolution.',
        },
      },
      {
        term: { ko: '합쳐지는 기준', en: 'When shapes merge' },
        value: '≈ 2.6 × resolution',
        body: {
          ko: '두 발언이 해상도의 약 2.6배 안에 있으면 하나로 합쳐지고, 그보다 멀면 각자 남습니다. 갈라진 영역은 오류가 아니라 결과입니다.',
          en: 'Two statements within about 2.6 resolutions merge; beyond that they stay separate. A split region is a finding, not a fault.',
        },
      },
      {
        term: { ko: '보장', en: 'Guarantee' },
        value: '',
        body: {
          ko: '그 사람의 모든 발언은 반드시 자기 영역 안에 들어갑니다. 무작위로 만든 점 배치 40건과 거의 일직선인 배치까지 테스트로 확인합니다.',
          en: 'Every one of a speaker’s statements is inside their own region. Asserted over 40 randomised point sets plus a near-collinear degenerate case.',
        },
      },
    ],
  },
  {
    title: { ko: '판단에 쓰이는 기준값', en: 'Thresholds the tool judges on' },
    entries: [
      {
        term: { ko: '발언 되찾기', en: 'Statements traced back' },
        value: '2× chance · 55%',
        body: {
          ko: '지도 아래에 적히는 신뢰 수치입니다. 발언 하나를 빼고 나머지로 각 사람의 중심을 다시 구한 뒤, 뺀 발언이 실제 발언자의 중심에 가장 가까운지 봅니다. 전 발언에 대해 반복해 맞힌 비율을 냅니다. 우연히 맞을 확률(참여자가 넷이면 25%)을 함께 적는 이유는, 같은 50%라도 참여자가 넷이면 좋은 값이고 둘이면 동전 던지기와 같기 때문입니다. 우연의 2배이면서 55% 이상이면 “잘 구분한다”, 우연 + 10%p를 넘으면 “구분은 된다”, 그 아래면 “구분하지 못한다”고 적습니다.',
          en: 'The trust figure printed under the map. Leave one statement out, recompute every centroid from the rest, and check whether the held-out statement is nearest the person who said it; repeat for all of them. Chance is printed beside it — with four participants that is 25% — because 50% is strong with four and a coin toss with two. Twice chance and at least 55% reads as telling them apart clearly; more than chance plus 10 points reads as weakly; below that, as not at all.',
        },
      },
      {
        term: { ko: '어디에서 재는가', en: 'Where it is measured' },
        value: 'embedding space',
        body: {
          ko: '되찾기 비율도, 사람 구분 정도도 평면 좌표가 아니라 펼치기 전 원래 공간에서 잽니다. 기본 배치는 사람들을 최대한 갈라 놓도록 맞춰진 것이라, 그 그림 위에서 “사람들이 잘 갈라져 있다”고 재면 자기 채점이 됩니다. 실제로 평면에서 재던 때는 값이 두 배 넘게 부풀어 있었습니다. 세 배치가 같은 수치를 내는지 테스트로 고정해 두었습니다.',
          en: 'Both figures are computed in the original space, never on the projected coordinates. The default layout is fitted to push the speakers apart, so measuring "the speakers are far apart" on that picture would be grading its own homework — when it was measured on the projection, the figure came out more than twice as high. A test pins all three layouts to identical numbers.',
        },
      },
      {
        term: { ko: '사람 구분 정도', en: 'Separation' },
        value: '1.0',
        body: {
          ko: '사람 사이 평균 거리를 각자 발언이 퍼진 정도로 나눈 값으로, 상세 수치로만 함께 표시합니다. 1 미만이면 각자의 발언이 사람 사이 거리보다 더 넓게 퍼져 있다는 뜻입니다. 위쪽에 한계가 없어서 “얼마면 충분한가”에 답하지 못하기 때문에, 화면에서 판단을 내리는 자리는 되찾기 비율이 대신합니다.',
          en: 'Mean between-speaker distance over mean within-speaker spread, shown as a secondary readout. Below 1, each person’s statements scatter wider than the people sit apart. It has no upper bound and so cannot answer "is this enough", which is why the verdict on screen is made on attribution instead.',
        },
      },
      {
        term: { ko: '잠정 위치', en: 'Provisional position' },
        value: '< 3 statements',
        body: {
          ko: '실질 발언이 3개 미만인 참여자는 표식을 점선으로 그립니다. 평균 낼 것이 거의 없어 위치가 쉽게 흔들리기 때문입니다.',
          en: 'Fewer than three substantive statements gets a dashed marker: there is almost nothing to average, so the position moves easily.',
        },
      },
      {
        term: { ko: '수치가 무의미해지는 지점', en: 'Where the figure stops meaning anything' },
        value: '< 6 statements',
        body: {
          ko: '발언이 6개 미만이면 “평면에 남은 정도”는 어떤 값이든 근거가 아닙니다. 점이 몇 개 없으면 어떤 평면에도 거의 그대로 들어맞기 때문입니다. 이 경우 지도가 먼저 그렇다고 말합니다.',
          en: 'Below six statements the kept-detail figure is arithmetic, not evidence — a handful of points fits almost any plane exactly — and the map says so before showing it.',
        },
      },
      {
        term: { ko: '색으로 구분 가능한 인원', en: 'People colour can separate' },
        value: '8',
        body: {
          ko: '여덟 명을 넘으면 색만으로는 구분되지 않습니다. 적록색약 시뮬레이션에서 가장 가까운 두 색의 차이가 여섯 명 0.042, 여덟 명 0.035, 열 명 0.026으로 떨어집니다. 아홉 번째부터는 표식 모양으로 구분합니다.',
          en: 'Past eight, hue stops separating people: under simulated protanopia and deuteranopia, worst-pair separation falls from 0.042 at six colours to 0.035 at eight and 0.026 at ten. From the ninth speaker, shape takes over.',
        },
      },
    ],
  },
  {
    title: { ko: '입력과 데이터 취급', en: 'Input and what happens to it' },
    entries: [
      {
        term: { ko: '인식하는 회의록 형식', en: 'Transcript formats' },
        value: '6',
        body: {
          ko: '“이름:”, “[이름]”, 공식 회의록의 “◯ 이름 위원”, 이름 뒤 시각 표기, 이름만 한 줄에 있고 다음 줄부터 발언인 형식(Clova·Otter·Daglo 내보내기), 영어 이름 형식을 인식합니다. 같은 사람의 다른 표기는 한 사람으로 묶습니다.',
          en: '"Name:", "[Name]", the "◯ Name 위원" of Korean official minutes, a name followed by a timestamp, a name alone on its own line with the speech following (the Clova, Otter and Daglo export), and the English form. Different spellings of one person are merged.',
        },
      },
      {
        term: { ko: '진행자', en: 'Facilitators' },
        value: '',
        body: {
          ko: '“사회자”, “의장” 같은 역할명은 진행자로 보고 기본적으로 지도에서 제외합니다. 붙여넣기 화면에서 누가 제외되는지 미리 보여줍니다.',
          en: 'Role names such as 사회자 and 의장 are read as facilitators and left off the map by default. The composer shows who will be excluded before you run anything.',
        },
      },
      {
        term: { ko: '지어낸 문장 걸러내기', en: 'Fabrication filter' },
        value: '',
        body: {
          ko: '분리된 주장 단위의 문장이 원문에 없으면 그 단위를 버리고 개수를 기록합니다. 없는 말이 좌표가 되는 것을 막기 위해서입니다.',
          en: 'A unit whose text does not occur in the source transcript is dropped and counted, so words nobody said cannot become a coordinate.',
        },
      },
      {
        term: { ko: '길이 제한', en: 'Length limit' },
        value: '120,000자 · 60s',
        body: {
          ko: '한 번에 120,000자까지 처리하고, 서버 함수는 60초 안에 끝나야 합니다. 57분짜리 5당 토론(105턴)이 28초였습니다.',
          en: '120,000 characters per run, inside a 60-second server function. A 57-minute five-party debate (105 turns) took 28 seconds.',
        },
      },
      {
        term: { ko: '저장', en: 'Storage' },
        value: '',
        body: {
          ko: '붙여넣은 회의록은 지도를 만드는 동안에만 서버로 전달되고, 저장하지 않습니다. 결과도 브라우저를 닫으면 사라집니다. 내장 예시는 미리 계산해 저장소에 함께 넣어 둔 것입니다.',
          en: 'A pasted transcript is sent only while the map is being built and is not stored. The result is gone when the tab closes. The built-in examples are precomputed and committed to the repository.',
        },
      },
    ],
  },
]

export const HOW_FOOT = {
  ko: '이 표의 모든 값은 코드에서 실제로 쓰이는 값입니다. 예시 지도 역시 붙여넣기와 똑같은 경로로 만들어졌고, 저장소의 `npm run fixtures`로 다시 만들 수 있습니다.',
  en: 'Every figure here is a value the code uses. The example maps went through the same path as a paste, and can be rebuilt with `npm run fixtures`.',
} satisfies Bilingual
