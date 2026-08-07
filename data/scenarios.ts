/**
 * Built-in example transcripts.
 *
 * Each is synthetic but written to produce a genuinely different map, so that
 * clicking through them teaches what the visualisation can and cannot show:
 *
 *  - `release` — one question, four people, four different grounds. The map
 *                spreads wide and nobody clusters. This is the shape the method
 *                is for.
 *  - `hiring`  — everybody says yes, and the reasons pull apart. The map
 *                separates people who sound aligned in the transcript, which is
 *                the case a vote count cannot see.
 *  - `pricing` — two people, one question, each staying inside a single kind of
 *                reason. The sharpest separation of the four, and the answer to
 *                "do I need a big meeting for this".
 *  - `omnibus` — three agenda items in one meeting. Every speaker holds a
 *                different position on each, so averaging pulls all of them to
 *                the middle and the map stops distinguishing anybody. It is
 *                included precisely because it fails: the tool reports the
 *                failure, and a reader should see what that looks like here
 *                rather than meet it first on their own transcript.
 *
 * What makes `omnibus` fail is how far apart its three items are, which took
 * two rebuilds to learn. A first version ran the meeting over the weekly slot,
 * a job ad and the seating plan — three agenda items, and it scored 61% against
 * 33% by guessing, telling its speakers apart better than two of the examples
 * that are meant to. Three items close enough to share a vocabulary leave the
 * embedding little topic to spend itself on, so what is left is how each person
 * writes, and that is exactly the personal signature the example must not have.
 * Meeting time, the coffee machine and a data-retention policy have nothing in
 * common, every speaker's centroid becomes the same average of the three, and
 * the map lands at 18% — worse than guessing, which is the lesson.
 *
 * They are meetings somebody has sat in, which took two attempts to get right.
 * They were four municipal council agendas first — plant siting, a city hall
 * rebuild, school-route safety, a combined fees-and-catering item — accurate
 * and useless, since somebody deciding in ten seconds whether this tool applies
 * to them met four indistinguishable town halls in none of which they had ever
 * sat. Replacing those with a household holiday, a dog, and a share-house rota
 * fixed the recognition and lost the point: a tool for reading a room full of
 * people who have to decide something together was demonstrating on rooms with
 * nothing at stake, and the copy around it read as a toy. These four are a
 * release call, a hiring debrief, a pricing decision, and the weekly team
 * meeting where three unrelated things get discussed at once.
 *
 * They are long on purpose. An earlier set ran to eight or ten statements each,
 * which is below the point where any figure under the map means anything — with
 * that few points a two-dimensional layout fits almost exactly whatever the
 * data says, so the maps looked confident and reported nothing. Each person
 * here clears `MIN_STATEMENTS_FOR_ATTRIBUTION`, and clears
 * `MIN_STATEMENTS_PER_HALF` twice over so the first half of the meeting can be
 * compared with the second.
 *
 * Every line carries a timestamp, in the bracketed form transcription tools
 * export. Real meeting records usually have them and the examples had none, so
 * the format a reader is most likely to paste was the one format they never saw
 * demonstrated — and the before/after comparison it unlocks was invisible in
 * all four. `lib/timeline.ts` is what reads them; a transcript without them
 * still works, and simply says nothing about time.
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
    id: 'release',
    topic: {
      ko: '다음 주 출시를 예정대로 할 것인가, 미룰 것인가',
      en: 'Ship next week as planned, or push the date',
    },
    title: {
      ko: '한 질문, 네 사람이 각자 다른 이야기',
      en: 'One question, four different conversations',
    },
    teaser: {
      ko: '일정, 품질, 고객, 팀 피로도로 갈립니다',
      en: 'split across deadline, quality, customers and burnout',
    },
    lookFor: {
      ko: '네 사람이 지도 곳곳에 흩어집니다. 같은 회의에 앉아 사실은 서로 다른 네 가지 회의를 하고 있었다는 뜻입니다. Dave의 영역만 두 덩어리로 갈라져 있는데, 약속한 날짜를 지키자는 이야기에서 결제만 우회하자는 이야기로 옮겨간 자리입니다.',
      en: 'Four people spread right across the map: one meeting that was really four. Only Dave’s region comes apart into two shapes — where he moved from keeping the promised date to routing around the payment code instead.',
    },
    transcript: `[00:00] 진행: 다음 주 목요일 출시를 그대로 갈지 미룰지 오늘 정하겠습니다. 한 분씩 의견 주세요.
[00:14] Dave: 저는 예정대로 가야 한다고 봅니다. 이 날짜를 기준으로 마케팅 메일이 이미 나갔고, 영업팀이 고객사 세 곳에 목요일이라고 말해뒀습니다. 지금 미루면 그 약속을 저희가 깨는 겁니다.
[01:08] Rosa: 저는 미루자는 쪽입니다. 지금 결제 흐름에 남아 있는 버그가 두 개인데, 하나는 재현 조건을 아직 못 찾았습니다. 원인을 모르는 채로 결제 기능을 내보낸 적은 없습니다.
[02:11] Ivan: 저는 고객이 실제로 뭘 기다리는지를 먼저 보고 싶습니다. 베타 쓰는 고객 마흔 곳 중에 이번 기능을 물어본 곳이 네 곳입니다. 나머지는 지난번에 요청한 검색 개선을 기다리고 있습니다.
[03:05] Clara: 저는 팀 상태를 말씀드리겠습니다. 지난 3주 동안 주말 근무가 연속이었고, 이번 주에도 두 명이 토요일에 나왔습니다. 이 상태로 목요일을 맞추면 그 다음 주에 아무도 일을 못 합니다.
[04:20] Dave: 팀이 지친 건 저도 압니다. 그런데 날짜를 한 번 미루면 다음 날짜도 협상 대상이 됩니다. 작년에 두 번 미룬 뒤로 영업팀이 저희 일정을 안 믿습니다.
[05:33] Clara: 믿음 얘기를 하면, 저는 팀이 회사를 믿는 쪽이 더 걱정입니다. 지난 분기에 두 명이 나갔고 두 명 다 퇴사 면담에서 일정 얘기를 했습니다. 사람을 다시 뽑는 데 드는 시간이 이번 지연보다 훨씬 깁니다.
[06:47] Rosa: 저는 버그 두 개 중 하나라도 원인이 안 잡히면 날짜 논의 자체가 이르다고 봅니다. 결제는 실패하면 환불 처리가 따라오고, 고객이 직접 돈을 잃습니다.
[07:52] Ivan: 그 결제 버그가 영향을 주는 고객이 몇 곳인지가 저는 궁금합니다. 이번 기능을 쓸 고객이 네 곳이면, 문제가 나더라도 네 곳입니다. 그 네 곳에 미리 알리고 나가는 선택지도 있습니다.
[08:58] Dave: 저는 그 선택지가 현실적이라고 봅니다. 목요일에 내보내되 결제 부분만 기존 흐름을 쓰게 하면 약속한 날짜는 지킵니다.
[09:40] Rosa: 결제만 떼어내는 건 코드상 두 흐름을 동시에 유지한다는 뜻입니다. 그러면 다음 배포 때 합치는 작업이 또 생기고, 그때 버그는 지금보다 찾기 어려워집니다.
[10:51] Clara: 그 합치는 작업을 누가 하는지도 봐주셨으면 합니다. 결제 쪽을 아는 사람이 Rosa 한 명이고, Rosa는 이번 주에 이미 초과 근무 중입니다.
[11:59] Ivan: 저는 고객 네 곳에 직접 물어보는 게 제일 빠르다고 생각합니다. 목요일에 결제 없이 받을지, 2주 뒤에 완전한 걸로 받을지. 저희끼리 추측하는 것보다 정확합니다.
[12:44] Dave: 물어보면 대부분 빨리 달라고 합니다. 그건 제가 지난 두 번 다 겪었습니다.
[13:10] Ivan: 지난 두 번은 저희가 "지금 아니면 한 달 뒤"라고 물었습니다. "지금 반쪽이냐 2주 뒤 온전한 거냐"로 물으면 답이 다릅니다.
[14:18] Rosa: 저는 2주도 길다고 봅니다. 재현만 되면 이틀이면 잡습니다. 문제는 재현이 안 된다는 거고, 그건 시간이 아니라 로그가 부족해서입니다.
[15:36] Clara: 그러면 이번 주에 로그를 더 넣는 작업만 하고 목요일 출시는 접는 게 가장 덜 위험해 보입니다. 그게 팀도 한 주 숨을 돌립니다.
[16:42] Dave: 저는 목요일을 접더라도 그 다음 날짜는 오늘 못 박았으면 합니다. 영업팀에 "미뤘습니다"만 전하면 그게 제일 나쁩니다.
[17:29] Rosa: 날짜를 못 박는 건 원인을 모르는 상태에서 하는 약속입니다. 저는 재현이 된 다음에 날짜를 말하겠습니다.
[18:35] Ivan: 고객한테는 "2주 안"이라고 말해두고 실제로는 그보다 일찍 나가는 게 낫습니다. 기다리는 쪽은 정확한 날짜보다 늦어지지 않는 걸 더 봅니다.
[19:44] Clara: 저는 어떤 날짜를 잡든 이번 주말 근무는 없는 걸로 해주셨으면 합니다. 그 조건이면 어느 쪽이든 따르겠습니다.
[20:20] Dave: 주말 근무 없는 건 저도 동의합니다. 그건 조건으로 넣겠습니다.
[21:05] Rosa: 저는 로그 추가를 오늘부터 시작하겠습니다. 이번 주 안에 재현되면 그때 날짜를 다시 얘기하죠.
[21:58] Ivan: 저는 그 사이에 고객 네 곳에 연락해서 뭘 더 기다리는지 확인해 오겠습니다.
[22:41] 진행: 목요일 출시는 보류하고, 주말 근무 없이 이번 주에 재현과 고객 확인을 하는 걸로 정리하겠습니다.
[23:22] Clara: 다음 회의에서는 사람별 업무량을 먼저 보고 시작했으면 합니다.
[24:06] Dave: 저는 영업팀에 오늘 중으로 상황을 알리겠습니다.`,
  },

  {
    id: 'hiring',
    topic: {
      ko: '최종 후보 한 사람을 채용할 것인가',
      en: 'Whether to hire the final candidate',
    },
    title: {
      ko: '다 뽑자는데, 뽑으려는 사람이 다르다',
      en: 'Three yeses to three different hires',
    },
    teaser: {
      ko: '전원 찬성했지만 각자 머릿속 자리가 서로 충돌합니다',
      en: 'a unanimous yes with three incompatible jobs behind it',
    },
    lookFor: {
      ko: '대화만 보면 세 사람 다 찬성입니다. 지도에서는 서로 멀리 떨어집니다. "다들 뽑자고 했잖아"가 입사 석 달 뒤에 왜 싸움이 되는지가 이 모양입니다.',
      en: 'Read the debrief and all three said hire. On the map they sit far apart — which is why "but everyone agreed" turns into an argument three months after the start date.',
    },
    transcript: `[00:00] 진행: 최종 후보 한 분, 채용할지 오늘 정하겠습니다. 세 분 순서대로 의견 주세요.
[00:22] Nora: 저는 뽑는 쪽입니다. 지금 밀린 요청이 여든 건이고 그중 절반이 한 사람한테 몰려 있습니다. 이번 분기 안에 손이 하나 더 붙어야 합니다.
[01:14] Felix: 저도 찬성입니다. 저는 3년 뒤에 이 팀을 맡을 사람을 찾고 있었고, 이 후보는 면접에서 되묻는 질문이 지금 우리 주니어들과 달랐습니다.
[02:20] Amira: 저도 찬성이에요. 이 사람은 우리가 한 번도 안 해본 질문을 면접에서 먼저 꺼냈습니다. 물류 쪽에서 5년을 일했고, 우리 팀에는 그 경험이 아무도 없습니다.
[03:31] Nora: 다음 달에 대기 중인 요청이 스무 건 더 들어옵니다. 지금 인원이면 평균 대기가 9일인데, 한 사람이 붙으면 5일로 떨어집니다.
[04:37] Felix: 저는 이 사람이 2년 뒤에 어떤 결정을 내리고 있을지를 봅니다. 지금 당장 잘하는 일보다 배우는 속도가 중요한 자리입니다.
[05:44] Amira: 밖에서 온 사람이 우리 관성을 볼 수 있는 기간은 처음 몇 주뿐이에요. 우리가 왜 이렇게 하는지 설명하다 보면 우리가 먼저 배웁니다.
[06:50] Nora: 인수인계 문서가 아예 없는 영역이 세 개입니다. 새로 오는 사람이 그걸 정리하면서 익히면 두 가지가 한 번에 됩니다.
[07:58] Felix: 첫 석 달을 처리 건수로 평가하면 그 사람은 처리를 잘하게 됩니다. 재작년에 뽑은 분이 그렇게 굳었고 지금 설계 논의에 못 들어옵니다.
[09:05] Amira: 여섯 달 뒤에 이 사람이 우리랑 똑같이 말하고 있으면 저는 실패한 채용이라고 볼 거예요. 다른 데서 온 사람을 뽑는 이유가 그거니까요.
[10:12] Nora: 대기가 길어지면 고객이 같은 요청을 두 번씩 넣습니다. 그러면 건수가 또 늘어나고 그게 지금 여든 건 중에 열 몇 건입니다.
[11:18] Felix: 첫 해에 누가 이 사람을 코칭하는지가 저는 궁금합니다. 붙여줄 사람이 없으면 3년이 아니라 그냥 시간이 갑니다.
[12:26] Amira: 이 사람이 첫 달에 고객을 몇 명 만나는지를 저는 보고 싶어요. 우리 회의실 안에만 있으면 두 달이면 우리처럼 말합니다.
[13:30] Nora: 다음 주부터 나올 수 있는지도 저한테는 큽니다. 두 달 뒤에 합류하면 이번 분기에는 사실상 없는 사람입니다.
[14:35] Felix: 이 자리를 계약직으로 채우면 지금 일은 나눠집니다. 정규로 뽑자고 하는 건 3년을 보기 때문입니다.
[15:40] Amira: 면접에서 이 사람이 우리 제품을 처음 보고 물어본 세 가지가 아직 답이 안 됐어요. 그걸 물어볼 사람이 지금 우리 중에 없습니다.
[16:44] Nora: 저는 첫 분기에 뭘 맡을지가 적혀 있어야 한다고 봅니다. 안 적으면 석 달 뒤에 아무도 뭘 했는지 말을 못 합니다.
[17:50] Felix: 저는 3년 계획이 문서로 안 남으면 석 달 뒤에 다시 처리 건수 얘기가 나온다고 봅니다.
[18:55] Amira: 저는 첫 달 일정에 밖에 나가는 날이 없으면 반대예요. 그러면 그냥 사람 하나 더 뽑은 게 됩니다.
[20:00] 진행: 세 분 다 찬성이니 채용은 확정하고 세부는 나중에 정할까요?
[20:22] Nora: 저는 밀린 요청이 줄어드는 걸 기대하고 찬성한 겁니다. 그 기대가 빠지면 제 찬성도 빠집니다.
[21:15] Felix: 저는 3년 뒤에 제 자리를 넘길 사람을 기대하고 찬성했습니다.
[22:10] Amira: 저는 우리가 못 보는 걸 말해줄 사람을 기대하고 찬성했어요. 첫해에 셋을 다 할 수 있는 사람은 없습니다.
[23:04] Nora: 저는 오늘 안에 밀린 요청 목록을 정리해 공유하겠습니다.
[23:50] Felix: 저는 첫 해 코칭 담당과 3년 계획 초안을 써 오겠습니다.
[24:36] Amira: 저는 첫 달에 만날 고객 명단을 잡아 오겠습니다.
[25:20] 진행: 그럼 그 세 가지를 붙여놓고 다음 회의에서 다시 보겠습니다.`,
  },

  {
    id: 'pricing',
    topic: {
      ko: '구독 가격을 올릴 것인가',
      en: 'Whether to raise the subscription price',
    },
    title: {
      ko: '둘이서도 이렇게 갈린다',
      en: 'Two people, two worlds',
    },
    teaser: {
      ko: '한 사람은 고객 얼굴로, 한 사람은 원가표로 말합니다',
      en: 'one argues from the customers he has met, the other from the cost sheet',
    },
    lookFor: {
      ko: '두 사람이 같은 질문을 두고 각자 한 가지 근거로만 일관되게 말하면 이런 모양이 나옵니다. 이름을 지운 발언 열 개 중 여덟 개가 말한 사람에게 돌아가는데, 둘뿐이니 찍어도 다섯 개는 맞는 자리입니다 — 참여자가 둘뿐인 것은 문제가 아닙니다. 회의 후반에 둘 사이가 좁혀진 것도 이 지도에서만 보입니다.',
      en: 'Two people on one question, each staying inside a single kind of reason, produces this. Eight of ten name-stripped statements find their speaker, where guessing would get five — only two participants is not the problem. It is also the one example where the two of them end the meeting closer than they started.',
    },
    transcript: `[00:00] 진행: 다음 갱신부터 구독 가격을 올릴지 오늘 정하겠습니다.
[00:18] Owen: 저는 지금은 아니라고 봅니다. 지난주에 3년 쓰신 고객사 담당자랑 통화했는데, 올해 예산을 이미 확정해뒀다고 하셨습니다.
[01:12] Mia: 저는 올려야 한다고 봅니다. 지금 마진이 18%인데 서버 원가가 작년 대비 27% 올랐습니다. 이 상태로 4분기를 지나면 계산이 안 맞습니다.
[02:20] Owen: 그 담당자가 사내에서 우리를 방어해주는 사람입니다. 가격이 갑자기 오르면 그분이 먼저 곤란해집니다.
[03:26] Mia: 상위 20% 고객이 매출의 64%를 냅니다. 인상 대상을 그 구간으로 한정하면 나머지는 건드리지 않아도 됩니다.
[04:33] Owen: 저는 메일로 먼저 통보된 고객은 답장을 잘 안 한다는 걸 여러 번 봤습니다. 얼굴 보고 먼저 말하면 대부분은 이해해주셨습니다.
[05:41] Mia: 이탈률이 3% 안쪽이면 8% 인상은 그대로 남습니다. 표로 보면 5%까지 빠져도 인상분이 더 큽니다.
[06:48] Owen: 작년에 갱신 안 한 두 곳은 가격 때문이 아니었습니다. 담당자가 바뀌었고, 새 담당자가 우리를 몰랐습니다.
[07:55] Mia: 인상을 미루면 그만큼을 다른 데서 줄여야 합니다. 지금 줄일 수 있는 항목은 사람 아니면 인프라뿐입니다.
[09:02] Owen: 저는 갱신 두 달 전에 미리 알리는 게 핵심이라고 봅니다. "미리 말 안 해줬다"는 말을 듣는 게 가격 얘기보다 무섭습니다.
[10:10] Mia: 분기별로 나눠 올리자는 얘기가 나올 텐데, 저는 반대입니다. 계산만 복잡해지고 총 인상분은 같습니다.
[11:16] Owen: 나눠 올리면 담당자가 내부 결재를 받기 쉬워집니다. 한 번에 올리면 그분이 임원 앞에서 설명을 해야 합니다.
[12:24] Mia: 결재 난이도는 우리가 관측할 수 없는 값입니다. 저는 관측되는 숫자로 정하고 싶습니다. 갱신율, 이탈률, 마진 세 개입니다.
[13:30] Owen: 저는 그 세 개가 다 사람이 만든 숫자라고 생각합니다. 갱신율은 담당자와 우리 사이에서 결정됩니다.
[14:38] Mia: 원가는 사람이 만든 숫자가 아닙니다. 저장 비용은 계약서에 적힌 대로 올라갑니다.
[15:45] Owen: 저는 상위 고객 다섯 곳은 제가 직접 찾아가서 말씀드리고 싶습니다. 그 다섯 곳이 나머지를 다 데리고 갑니다.
[16:52] Mia: 다섯 곳을 직접 방문하는 데 드는 시간도 비용입니다. 그 시간에 신규를 몇 곳 받을 수 있는지도 같이 봐야 합니다.
[18:00] Owen: 신규는 지금 고객이 남아 있어야 소개로 들어옵니다. 지난 분기 신규 아홉 곳 중 다섯 곳이 소개였습니다.
[19:08] Mia: 소개 비중이 높은 건 저도 압니다. 그래도 그건 인상 폭이 아니라 인상 방식의 문제입니다.
[20:15] Owen: 저는 방식이 곧 폭이라고 봅니다. 어떻게 말하느냐에 따라 받아들여지는 폭이 달라집니다.
[21:22] Mia: 저는 폭을 먼저 정하고 방식을 나중에 정하는 순서를 제안합니다. 반대로 하면 숫자가 대화 분위기에 끌려갑니다.
[22:30] Owen: 저는 이번 갱신 대상 열두 곳만이라도 제가 먼저 통화하고 결정했으면 합니다.
[23:38] Mia: 저는 그 열두 곳의 계약 금액과 사용량을 표로 정리해 오겠습니다. 그걸 보고 폭을 정하죠.
[24:45] 진행: 그럼 표를 먼저 보고, 통화 결과를 붙여서 다음 주에 폭을 정하겠습니다.`,
  },

  {
    id: 'omnibus',
    topic: {
      ko: '회의 시간·커피머신·데이터 보관 기간을 한 번에',
      en: 'Meeting time, the coffee machine, and data retention — all in one sitting',
    },
    title: {
      ko: '지도가 실패하는 경우',
      en: 'When the map fails',
    },
    teaser: {
      ko: '상관없는 세 안건을 섞으니 찍는 것보다 못하게 됩니다',
      en: 'three unrelated items mixed together, and the map does worse than guessing',
    },
    lookFor: {
      ko: '지도 아래를 먼저 보세요. "이 지도는 참여자를 구분하지 못합니다"라고 적혀 있습니다 — 이름을 지운 발언을 돌려주면 100개 중 18개만 맞는데, 찍으면 33개가 맞습니다. 찍느니만 못하다는 뜻입니다. 그런데도 그림은 세 사람을 제법 떨어뜨려 그립니다. 이 배치가 사람을 갈라 보이게 하려고 고른 것이고, 참여자가 세 명이면 어떤 세 점이든 평면에 정확히 놓이기 때문입니다. 갈라 보이는 것과 실제로 갈린 것은 다릅니다 — “거리 그대로 보기”로 바꾸면 셋이 겹칩니다. 회의 하나에 쟁점이 하나여야 하는 이유입니다.',
      en: 'Read under the map first: it says it cannot tell these people apart — 18 of 100 name-stripped statements go back to the right person, where guessing gets 33. It is doing worse than guessing. The picture still draws the three of them some way apart, because this layout was chosen to show people apart and any three points lie in a plane exactly. Drawn apart and actually apart are different things — switch to “Keep the distances true” and the three of them overlap. This is why one map wants one question.',
    },
    transcript: `[00:00] 진행: 오늘은 세 가지를 한 번에 정하겠습니다. 주간 회의 시간, 탕비실 커피머신, 고객 데이터 보관 기간 순서입니다.
[00:20] Ted: 회의는 월요일 오전으로 고정했으면 합니다. 매주 요일이 바뀌어서 외부 일정을 못 잡습니다.
[01:05] Lena: 월요일 오전이면 주말에 자료를 준비해야 합니다. 저는 금요일 오후가 낫습니다.
[01:52] Hugo: 한 시간을 삼십 분으로 줄이면 요일은 아무 때나 괜찮습니다.
[02:40] Ted: 삼십 분이면 안건 하나 다루고 끝납니다. 지금도 매주 두세 개가 다음 주로 밀립니다.
[03:28] Lena: 금요일에 하면 그 주에 있었던 일을 그대로 얘기할 수 있습니다. 월요일에는 다들 지난주를 다시 떠올려야 합니다.
[04:15] Hugo: 안건을 전날까지 문서에 적어 오면 삼십 분으로 충분합니다.
[05:02] Ted: 요일이 정해져야 외부 미팅을 그 주변으로 붙일 수 있습니다.
[05:50] 진행: 다음은 탕비실 커피머신입니다.
[06:10] Lena: 지금 기계가 두 달에 한 번씩 고장 납니다. 수리비가 이미 기계값의 절반입니다.
[07:00] Hugo: 캡슐 방식이면 청소가 없습니다. 대신 캡슐값이 한 잔에 육백 원입니다.
[07:48] Ted: 원두를 갈아 쓰는 지금 방식이 맛은 낫습니다. 아침마다 줄을 서는 이유가 그겁니다.
[08:36] Lena: 렌탈로 바꾸면 고장 수리가 계약에 들어갑니다. 월 사만 원입니다.
[09:24] Hugo: 캡슐은 쓰레기가 매일 나옵니다. 분리수거를 누가 하느냐가 또 생깁니다.
[10:12] Ted: 물통을 매일 채우는 사람이 정해져 있지 않은 것도 지금 문제입니다.
[11:00] 진행: 마지막으로 고객 데이터 보관 기간입니다.
[11:20] Hugo: 지금 3년인데 1년으로 줄였으면 합니다. 안 쓰는 기록을 갖고 있는 것 자체가 위험입니다.
[12:05] Ted: 1년이면 재작년 계약 건을 확인할 방법이 없습니다. 분쟁이 나면 그 기록이 필요합니다.
[12:52] Lena: 법에서 요구하는 최소 기간이 항목마다 다릅니다. 결제 기록은 5년입니다.
[13:40] Hugo: 유출이 나면 갖고 있던 양만큼 피해가 커집니다. 없으면 샐 것도 없습니다.
[14:28] Ted: 고객이 작년 이용 내역을 물어보는 일이 한 달에 몇 번 있습니다.
[15:16] Lena: 항목별로 나눠 적어두지 않으면 이 논의가 매번 처음부터 다시 시작됩니다.
[16:04] Hugo: 익명 처리해서 통계만 남기는 방법도 있습니다.
[16:52] Ted: 그러면 개별 문의에는 답을 못 합니다.
[17:40] Lena: 어느 쪽이든 항목별 표가 먼저 있어야 정할 수 있습니다.
[18:28] 진행: 세 가지 다 결론이 안 났으니 각각 다음에 다시 얘기하겠습니다.`,
  },
]

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id)
}
