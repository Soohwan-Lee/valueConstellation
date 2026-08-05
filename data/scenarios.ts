/**
 * Built-in example transcripts.
 *
 * Each is synthetic but written to produce a genuinely different map, so that
 * clicking through them teaches what the visualisation can and cannot show:
 *
 *  - `siting`    — one question, four people, four different grounds. The map
 *                  spreads wide and nobody clusters. This is the shape the
 *                  method is for.
 *  - `consensus` — everybody says yes, and the reasons pull apart. The map
 *                  separates people who sound aligned in the transcript, which
 *                  is the case a vote count cannot see.
 *  - `drift`     — two people, one question, each staying inside a single kind
 *                  of reason. The sharpest separation of the four, and the
 *                  answer to "do I need a big meeting for this".
 *  - `mixed`     — three agenda items in one meeting. Every speaker holds a
 *                  different position on each, so averaging pulls all of them
 *                  to the middle and the map stops distinguishing anybody. It
 *                  is included precisely because it fails: the tool reports the
 *                  failure, and a reader should see what that looks like here
 *                  rather than meet it first on their own transcript.
 *
 * The situations are ordinary on purpose. They were four municipal council
 * meetings — plant siting, city hall rebuild, school-route safety, a combined
 * fees-and-catering agenda — written with real budget figures and procedural
 * detail. As demonstrations they were accurate and useless: somebody deciding
 * in ten seconds whether this tool applies to them met four indistinguishable
 * town-hall agendas, in none of which they had ever sat. These are a team
 * deciding how to ship, a household picking a holiday, two people arguing about
 * a dog, and a share-house meeting that covers everything at once. The question
 * "have I been in this room" now answers itself.
 *
 * They are long on purpose. An earlier set ran to eight or ten statements each,
 * which is below the point where any figure under the map means anything — with
 * that few points a two-dimensional layout fits almost exactly whatever the
 * data says, so the maps looked confident and reported nothing. Each person
 * here clears `MIN_STATEMENTS_FOR_ATTRIBUTION`.
 *
 * All four are analysed by the same pipeline as pasted input: real
 * segmentation, real embeddings, real projection. Nothing here is a precomputed
 * picture.
 *
 * The meetings are Korean and the participants are named in English. That is
 * deliberate: an example is read, not analysed, and a reader working out which
 * of four maps to open should not also be holding four unfamiliar names in a
 * script they may not read. "Dave" and "Clara" survive the language toggle
 * unchanged, stay legible on a crowded map at 10px, and are obviously not real
 * people — which the examples are not. Pasted transcripts keep their own names
 * and are romanised on the toggle; see `lib/speakers.ts`.
 */

export interface Scenario {
  id: string
  /**
   * The agenda item, as it would read on a meeting notice.
   *
   * Separate from `title`, which names what the map turned out to show. The
   * two were one field, and the card led with the finding — "Same yes,
   * different reasons" — leaving a reader to work out what was being decided
   * from a one-line teaser. Somebody deciding whether this tool applies to
   * their own meeting is asking what kind of meeting it takes, and that
   * question was being answered last.
   */
  topic: { ko: string; en: string }
  /** Short label for the card: what the map turned out to show. */
  title: { ko: string; en: string }
  /** One line on what the resulting map shows. */
  teaser: { ko: string; en: string }
  /** What to look for once it is open. */
  lookFor: { ko: string; en: string }
  transcript: string
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'siting',
    topic: {
      ko: '다음 주 출시를 예정대로 할 것인가, 미룰 것인가',
      en: 'Ship next week as planned, or push the date',
    },
    title: {
      ko: '한 질문, 네 사람이 각자 다른 이야기',
      en: 'One question, four different conversations',
    },
    teaser: {
      ko: '출시일 회의 — 일정, 품질, 고객, 팀 피로도로 갈립니다',
      en: 'A ship-date meeting — split across deadline, quality, customers, burnout',
    },
    lookFor: {
      ko: '네 사람이 지도 곳곳에 흩어집니다. 같은 회의에 앉아 사실은 서로 다른 네 가지 회의를 하고 있었다는 뜻입니다. 두 사람의 영역이 두 덩어리로 갈라져 있는데, 회의 도중 다른 근거로 옮겨간 자리입니다.',
      en: 'Four people spread right across the map: one meeting that was really four. Two of the regions come apart into separate shapes, where that person moved to a different kind of reason mid-meeting.',
    },
    transcript: `진행: 다음 주 목요일 출시를 그대로 갈지 미룰지 오늘 정하겠습니다. 한 분씩 의견 주세요.
Dave: 저는 예정대로 가야 한다고 봅니다. 이 날짜를 기준으로 마케팅 메일이 이미 나갔고, 영업팀이 고객사 세 곳에 목요일이라고 말해뒀습니다. 지금 미루면 그 약속을 저희가 깨는 겁니다.
Rosa: 저는 미루자는 쪽입니다. 지금 결제 흐름에 남아 있는 버그가 두 개인데, 하나는 재현 조건을 아직 못 찾았습니다. 원인을 모르는 채로 결제 기능을 내보낸 적은 없습니다.
Ivan: 저는 고객이 실제로 뭘 기다리는지를 먼저 보고 싶습니다. 베타 쓰는 고객 마흔 곳 중에 이번 기능을 물어본 곳이 네 곳입니다. 나머지는 지난번에 요청한 검색 개선을 기다리고 있습니다.
Clara: 저는 팀 상태를 말씀드리겠습니다. 지난 3주 동안 주말 근무가 연속이었고, 이번 주에도 두 명이 토요일에 나왔습니다. 이 상태로 목요일을 맞추면 그 다음 주에 아무도 일을 못 합니다.
Dave: 팀이 지친 건 저도 압니다. 그런데 날짜를 한 번 미루면 다음 날짜도 협상 대상이 됩니다. 작년에 두 번 미룬 뒤로 영업팀이 저희 일정을 안 믿습니다.
Clara: 믿음 얘기를 하면, 저는 팀이 회사를 믿는 쪽이 더 걱정입니다. 지난 분기에 두 명이 나갔고 두 명 다 퇴사 면담에서 일정 얘기를 했습니다. 사람을 다시 뽑는 데 드는 시간이 이번 지연보다 훨씬 깁니다.
Rosa: 저는 버그 두 개 중 하나라도 원인이 안 잡히면 날짜 논의 자체가 이르다고 봅니다. 결제는 실패하면 환불 처리가 따라오고, 고객이 직접 돈을 잃습니다.
Ivan: 그 결제 버그가 영향을 주는 고객이 몇 곳인지가 저는 궁금합니다. 이번 기능을 쓸 고객이 네 곳이면, 문제가 나더라도 네 곳입니다. 그 네 곳에 미리 알리고 나가는 선택지도 있습니다.
Dave: 저는 그 선택지가 현실적이라고 봅니다. 목요일에 내보내되 결제 부분만 기존 흐름을 쓰게 하면 약속한 날짜는 지킵니다.
Rosa: 결제만 떼어내는 건 코드상 두 흐름을 동시에 유지한다는 뜻입니다. 그러면 다음 배포 때 합치는 작업이 또 생기고, 그때 버그는 지금보다 찾기 어려워집니다.
Clara: 그 합치는 작업을 누가 하는지도 봐주셨으면 합니다. 결제 쪽을 아는 사람이 Rosa 한 명이고, Rosa는 이번 주에 이미 초과 근무 중입니다.
Ivan: 저는 고객 네 곳에 직접 물어보는 게 제일 빠르다고 생각합니다. 목요일에 결제 없이 받을지, 2주 뒤에 완전한 걸로 받을지. 저희끼리 추측하는 것보다 정확합니다.
Dave: 물어보면 대부분 빨리 달라고 합니다. 그건 제가 지난 두 번 다 겪었습니다.
Ivan: 지난 두 번은 저희가 "지금 아니면 한 달 뒤"라고 물었습니다. "지금 반쪽이냐 2주 뒤 온전한 거냐"로 물으면 답이 다릅니다.
Rosa: 저는 2주도 길다고 봅니다. 재현만 되면 이틀이면 잡습니다. 문제는 재현이 안 된다는 거고, 그건 시간이 아니라 로그가 부족해서입니다.
Clara: 그러면 이번 주에 로그를 더 넣는 작업만 하고 목요일 출시는 접는 게 가장 덜 위험해 보입니다. 그게 팀도 한 주 숨을 돌립니다.
Dave: 저는 목요일을 접더라도 그 다음 날짜는 오늘 못 박았으면 합니다. 영업팀에 "미뤘습니다"만 전하면 그게 제일 나쁩니다.
Rosa: 날짜를 못 박는 건 원인을 모르는 상태에서 하는 약속입니다. 저는 재현이 된 다음에 날짜를 말하겠습니다.
Ivan: 고객한테는 "2주 안"이라고 말해두고 실제로는 그보다 일찍 나가는 게 낫습니다. 기다리는 쪽은 정확한 날짜보다 늦어지지 않는 걸 더 봅니다.
Clara: 저는 어떤 날짜를 잡든 이번 주말 근무는 없는 걸로 해주셨으면 합니다. 그 조건이면 어느 쪽이든 따르겠습니다.
Dave: 주말 근무 없는 건 저도 동의합니다. 그건 조건으로 넣겠습니다.
Rosa: 저는 로그 추가를 오늘부터 시작하겠습니다. 이번 주 안에 재현되면 그때 날짜를 다시 얘기하죠.
Ivan: 저는 그 사이에 고객 네 곳에 연락해서 뭘 더 기다리는지 확인해 오겠습니다.
진행: 목요일 출시는 보류하고, 주말 근무 없이 이번 주에 재현과 고객 확인을 하는 걸로 정리하겠습니다.
Clara: 다음 회의에서는 사람별 업무량을 먼저 보고 시작했으면 합니다.
Dave: 저는 영업팀에 오늘 중으로 상황을 알리겠습니다.`,
  },

  {
    id: 'consensus',
    topic: {
      ko: '올여름 가족 여행을 제주도로 갈 것인가',
      en: 'Whether to take the family holiday to Jeju this summer',
    },
    title: {
      ko: '다 좋다는데, 원하는 게 다르다',
      en: 'Everyone said yes to a different holiday',
    },
    teaser: {
      ko: '전원 찬성한 제주 여행 — 각자 머릿속 여행이 서로 충돌합니다',
      en: 'A unanimous yes to Jeju — and three incompatible holidays behind it',
    },
    lookFor: {
      ko: '대화만 보면 세 사람 다 찬성입니다. 지도에서는 서로 멀리 떨어집니다. "다들 좋다고 했잖아"가 왜 나중에 싸움이 되는지가 이 모양입니다.',
      en: 'Read the conversation and all three agreed. On the map they sit far apart — which is why "but everyone said yes" turns into an argument later.',
    },
    transcript: `진행: 올여름 휴가 제주도로 가는 거, 다들 어떻게 생각해?
Nora: 나는 찬성이야. 작년에 아이들이 바다에서 논 다음부터 계속 또 가고 싶다고 했어. 여름에 애들이 실컷 놀 수 있는 곳이 우선이라고 봐.
Felix: 나도 찬성. 대신 나는 비용 때문에 찬성하는 거야. 지금 항공권이 성수기 직전이라 왕복 1인 12만 원이고, 2주만 늦어도 두 배가 돼.
Amira: 나도 좋아. 나는 좀 쉬고 싶어서 찬성이야. 요즘 계속 바빴는데 아무 계획 없이 늦잠 자고 책 읽는 날이 며칠 있었으면 해.
Nora: 애들 스케줄을 생각하면 아침에 일찍 움직이는 게 나아. 오전에 물놀이하고 오후에 낮잠 재우는 리듬이 제일 편해.
Felix: 숙소는 시내 쪽이 나을 것 같아. 바닷가 앞은 같은 조건에 하루 8만 원씩 더 붙어. 3박이면 24만 원 차이야.
Amira: 나는 바닷가 앞이었으면 좋겠는데. 아침에 눈뜨자마자 바다가 보이는 게 쉬러 가는 이유거든. 시내면 그냥 집이랑 비슷해.
Nora: 애들 데리고 시내에서 바다까지 매일 이동하는 게 사실 제일 힘들어. 짐 챙겨서 왕복하면 그것만으로 하루가 가.
Felix: 렌터카를 하루만 빌리면 이동은 해결돼. 4일 내내 빌리면 28만 원인데 하루만 쓰면 7만 원이야.
Amira: 하루만 빌리면 그날 하루에 일정을 다 몰아넣어야 하잖아. 그러면 그날은 쉬는 날이 아니라 관광하는 날이 돼.
Nora: 나는 일정이 어느 정도 있는 게 애들한테는 나아. 뭐 할지 없으면 애들이 더 힘들어해.
Felix: 나는 식사를 밖에서 다 사 먹는 게 제일 큰 지출이라고 봐. 숙소에 주방 있으면 아침만 해먹어도 하루 4만 원이 줄어.
Amira: 주방 있으면 누가 아침을 해? 결국 나랑 너지. 그러면 나는 집에서 하던 걸 제주에서 하는 거야.
Nora: 아침은 간단하게 하고 점심 저녁은 나가서 먹으면 되지 않을까. 애들도 밖에서 먹는 걸 더 좋아해.
Felix: 그렇게 하면 예산이 대략 얼마인지 먼저 정하고 싶어. 나는 총액 150만 원 안쪽이면 마음이 편해.
Amira: 나는 금액보다 하루에 일정이 몇 개인지가 중요해. 하루에 한 개면 좋고 두 개는 많아.
Nora: 하루 한 개는 애들이 지루해할 것 같은데. 오전 하나 오후 하나는 있어야 해.
Felix: 일정이 늘면 교통비랑 입장료가 같이 늘어. 애들 입장료가 생각보다 커.
Amira: 나는 하루쯤은 아무 데도 안 가는 날이 있었으면 좋겠어. 그 날 하루만 확보되면 나머지는 다 맞출게.
Nora: 나는 애들이 바다에서 노는 시간이 이틀은 있었으면 해. 그게 이 여행 가는 이유거든.
Felix: 나는 총액만 안 넘으면 나머지는 다 좋아. 넘을 것 같으면 그때 다시 얘기하자.
진행: 그럼 셋 다 찬성이니까 제주도로 확정하고 세부는 나중에 정할까?
Amira: 세부를 나중에 정하면 결국 내가 쉬는 날은 없어져. 나는 아무것도 안 하는 날 하루가 정해져야 찬성이야.
Nora: 나도 마찬가지야. 바다 이틀이 안 들어간 일정이면 내가 찬성한 여행이 아니야.
Felix: 나도 150만 원 넘으면 반대로 돌아서. 숙소부터 정하고 얘기하자.
진행: 그럼 숙소랑 하루 일정 개수까지 정해서 다시 얘기하자.`,
  },

  {
    id: 'drift',
    topic: {
      ko: '강아지를 키울 것인가',
      en: 'Whether to get a dog',
    },
    title: {
      ko: '둘이서도 이렇게 갈린다',
      en: 'Two people, two worlds',
    },
    teaser: {
      ko: '강아지 입양 — 한 사람은 감정으로, 한 사람은 일과표로 말합니다',
      en: 'Getting a dog — one argues from what it would feel like, the other from the daily schedule',
    },
    lookFor: {
      ko: '네 지도 중 가장 뚜렷하게 갈린 지도입니다. 두 사람이 같은 질문을 두고 각자 한 가지 근거로만 일관되게 말하면 이런 모양이 나옵니다 — 참여자가 둘뿐인 것은 문제가 아닙니다.',
      en: 'The sharpest split of the four. Two people on one question, each staying inside a single kind of reason, produces this — only two participants is not the problem.',
    },
    transcript: `진행: 강아지 키우는 문제, 오늘 얘기해보자.
Owen: 나는 키우고 싶어. 퇴근하고 문 열었을 때 깜깜하고 아무 소리도 안 나는 게 요즘 제일 견디기 힘들어.
Mia: 나는 하루가 실제로 어떻게 돌아갈지가 먼저야. 우리 둘 다 아침 여덟 시에 나가서 저녁 일곱 시에 들어와. 그 열한 시간을 누가 채우지?
Owen: 집에 온기가 있다는 게 나한테는 커. 요즘 우리 둘 다 말수가 줄었잖아. 같이 마음 쓸 대상이 있으면 그 공기가 달라질 것 같아.
Mia: 산책이 하루 두 번이야. 아침 일곱 시랑 밤 여덟 시. 아침 일곱 시에 나가려면 둘 중 하나는 여섯 시 반에 일어나야 해.
Owen: 어릴 때 우리 집에 있던 강아지 생각이 자꾸 나. 학교에서 안 좋은 일이 있어도 걔 얼굴 보면 풀렸어. 그 기억이 아직도 남아 있어.
Mia: 목욕은 주 2회, 병원은 한 달에 한 번이야. 예방접종 시기에는 두 번씩 가야 하고 그때마다 반차를 써야 해.
Owen: 나는 주말에 같이 걸을 상대가 있다는 것도 좋아. 요즘 토요일에 둘 다 각자 방에만 있잖아.
Mia: 출장이 문제야. 나는 두 달에 한 번 이틀씩 나가고 너도 분기마다 있어. 겹치는 주에는 맡길 데가 있어야 해.
Owen: 나는 뭔가를 매일 기다린다는 감각이 그리워. 요즘은 하루가 그냥 지나가.
Mia: 호텔이 하루 오만 원이야. 일 년에 여섯 번이면 육십만 원이고, 사료랑 병원비는 거기 안 들어가 있어.
Owen: 나는 이걸 손익으로 정하고 싶지가 않아. 식구가 하나 느는 일이잖아.
Mia: 나는 손익 얘기를 하는 게 아니라 누가 언제 뭘 하는지를 얘기하는 거야. 그게 안 그려지면 나는 못 정하겠어.
Owen: 나한테는 집이 조용한 게 진짜 문제야. 그게 몇 달 쌓이니까 사람이 좀 가라앉더라.
Mia: 아침 담당을 정하지 않으면 결국 먼저 일어나는 사람이 매일 하게 돼. 우리 집에서 그건 나야.
Owen: 나는 걔가 현관에서 기다리고 있을 거라는 생각만으로도 퇴근길이 달라질 것 같아.
Mia: 처음 두 달은 누구나 다 해. 나는 세 달째부터가 진짜라고 생각해. 그때 남는 게 일과표야.
Owen: 나는 우리가 같이 뭔가를 돌보는 게 우리한테도 좋을 거라고 생각해. 요즘 같이 하는 일이 거의 없잖아.
Mia: 배변 훈련 기간에는 밤에 두세 번 깨야 해. 그 몇 주를 둘 다 출근하면서 버틸 수 있는지가 나는 제일 걱정이야.
Owen: 나는 힘든 건 감수할 수 있다고 생각해. 마음이 가는 일은 하게 되더라고.
Mia: 나는 감수하겠다는 말보다 요일별로 누가 아침을 맡는지가 적힌 표를 보고 싶어.
Owen: 나는 그 표가 있어야만 시작할 수 있다는 게 좀 서운해. 이런 건 마음으로 정하는 거 아닌가 싶어서.
Mia: 나는 그 마음이 오래가려면 일과가 버텨줘야 한다고 봐. 지쳐서 미워지는 게 제일 나쁜 결말이야.
Owen: 나는 그래도 한번 만나보고 싶어. 직접 보면 다르게 느껴질 것 같아.
Mia: 만나보면 데려오게 돼. 나는 순서가 반대라고 생각해. 표를 먼저 써보고 그다음에 만나자.
Owen: 나는 이 집에 웃을 일이 하나 더 생기는 게 지금 필요하다고 느껴.
Mia: 나는 한 주만 그 일과표대로 살아보자는 거야. 여섯 시 반 기상까지 그대로 해보고 정하자.
Owen: 그건 알겠어. 그런데 나는 이게 계산으로 끝날 문제는 아니라는 말은 하고 싶었어.
Mia: 나도 알아. 나는 계산이 맞아야 그 마음이 오래간다고 보는 거고.
진행: 그럼 한 주 일과표대로 살아보고 다음 주에 다시 얘기하는 걸로.`,
  },

  {
    id: 'mixed',
    topic: {
      ko: '청소 당번·주차 자리·에어컨 온도를 한 번에',
      en: 'Cleaning rota, the parking space, and the thermostat — all in one sitting',
    },
    title: {
      ko: '지도가 실패하는 경우',
      en: 'When the map fails',
    },
    teaser: {
      ko: '세 안건을 한 회의에서 — 모든 평균이 가운데로 모입니다',
      en: 'Three unrelated items at once — every average collapses to the middle',
    },
    lookFor: {
      ko: '표식이 가운데로 몰리고, 지도가 스스로 "이 회의에서는 사람을 구분하지 못한다"고 알립니다. 영역도 서너 조각으로 흩어지는데, 안건이 바뀔 때마다 발언이 딴 곳으로 튀었다는 표시입니다. 회의 하나에 쟁점이 하나여야 하는 이유입니다.',
      en: 'The markers pile into the middle and the map says outright that it cannot tell these people apart. The regions scatter into three or four pieces each — every change of subject threw that person’s statements somewhere else. This is why one map wants one question.',
    },
    transcript: `진행: 오늘은 세 가지 한 번에 정하겠습니다. 청소 당번, 주차 자리, 에어컨 온도 순서로요.
Ted: 청소는 요일제로 돌리는 게 맞다고 봅니다. 지금처럼 눈에 띄는 사람이 하면 결국 같은 사람만 계속 합니다.
Lena: 저는 요일제 반대입니다. 사람마다 집에 있는 시간이 달라서, 제 요일에 제가 집에 없으면 그날은 그냥 안 되는 겁니다.
Hugo: 저는 공간별로 나누는 게 낫다고 봅니다. 주방은 A, 화장실은 B, 거실은 C 이렇게요. 요일보다 책임이 분명합니다.
Ted: 공간별로 하면 화장실 맡은 사람만 계속 손해입니다. 일의 양이 다릅니다.
Lena: 그래서 저는 그때그때 더러운 걸 본 사람이 하고, 대신 한 달에 한 번 다 같이 대청소하는 게 현실적이라고 생각합니다.
Hugo: 그건 지금 방식이고 지금이 안 되고 있어서 회의하는 겁니다.
진행: 청소는 여기까지 하고 주차 자리로 넘어가겠습니다.
Lena: 주차는 차를 매일 쓰는 사람이 안쪽 자리를 쓰는 게 맞습니다. 저는 출퇴근에 매일 쓰는데 지금 제일 바깥입니다.
Ted: 저는 먼저 계약한 순서대로 가야 한다고 봅니다. 저는 2년 전에 들어왔고 그때부터 그 자리였습니다.
Hugo: 저는 석 달마다 자리를 돌리는 게 제일 공평하다고 봅니다. 어떤 기준을 잡아도 누군가는 손해라서요.
Lena: 석 달마다 돌리면 짐 옮기는 게 일입니다. 저는 차에 짐을 두고 다녀서요.
Ted: 순서대로가 제일 단순합니다. 새로 들어온 사람이 기다리는 건 어디나 그렇습니다.
Hugo: 단순한 것과 공평한 건 다릅니다. 지금 기준은 그냥 먼저 온 사람이 계속 유리한 겁니다.
진행: 마지막으로 에어컨 온도입니다.
Ted: 저는 26도로 고정했으면 합니다. 지금 사람마다 만져서 하루에도 몇 번씩 바뀝니다.
Hugo: 저는 24도 아니면 잠을 못 잡니다. 26도면 밤에 계속 깹니다.
Lena: 저는 전기요금을 봤으면 합니다. 지난달에 십오만 원 나왔고 그 전 달보다 사만 원 늘었습니다.
Ted: 고정하면 요금도 예측이 됩니다. 저는 26도 고정이 요금 문제도 같이 푼다고 봅니다.
Hugo: 저는 밤에만 24도로 내리는 걸로 하면 어떨까 합니다. 낮에는 26도 괜찮습니다.
Lena: 밤에 24도면 요금이 제일 많이 나오는 시간대입니다. 그게 지난달 증가분의 대부분일 겁니다.
Ted: 그러면 밤 25도로 절충하는 건 어떻습니까.
Hugo: 25도도 저는 좀 덥긴 한데 26도보다는 낫습니다.
Lena: 저는 온도보다 창문 여는 시간을 정하는 게 더 효과가 클 것 같습니다. 지금 에어컨 켜놓고 창문 열어두는 날이 있습니다.
진행: 세 가지 다 결론이 안 났으니 각각 다음에 다시 얘기하겠습니다.`,
  },
]

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id)
}
