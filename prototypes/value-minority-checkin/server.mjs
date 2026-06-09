import { createReadStream, existsSync, readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const REPO_ROOT = resolve(__dirname, '..', '..')
const PUBLIC_DIR = join(__dirname, 'public')
const DATA_PATH = join(REPO_ROOT, 'data', 'koreanPolicyMakingDiscussion.txt')
const PERSONAL_ENV = '/Users/soohwanlee/Desktop/soohwan/80 ORGANIZE/82 Tool/.env'

const PORT = Number(process.env.PORT || 5181)
const MODEL = 'gpt-5.4-mini'
const DEFAULT_START = '00:50'
const DEFAULT_END = '08:36'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
}

const DEFAULT_INTERVENTION_LEVELS = [
  {
    key: 'L1',
    label: '표시',
    short_label: '표시',
    explanation: '묻힌 가치극을 지도와 근거 발화로 보이게 합니다.',
  },
  {
    key: 'L2',
    label: '질문',
    short_label: '질문',
    explanation: '진행자가 그룹에 다시 던질 질문을 만듭니다.',
  },
  {
    key: 'L3',
    label: 'AI 발언',
    short_label: 'AI 발언',
    explanation: '나왔을 법하지만 아직 나오지 않은 발언을 AI 생성으로 제안합니다.',
  },
  {
    key: 'L4',
    label: '재표현',
    short_label: '재표현',
    explanation: '이미 나온 뒤 묻힌 입장을 근거 기반으로 다시 말합니다.',
  },
]

const AXIS_CHANGE_NOTE = '축은 Generate check-in 때만 다시 합성됩니다. 축 카드를 클릭하면 지도 구조가 흔들리는 것이 아니라 관련 blind spot, tension, 근거가 강조됩니다.'

loadEnv(join(REPO_ROOT, '.env'))
loadEnv(join(__dirname, '.env'))
loadEnv(PERSONAL_ENV)

let cachedTranscript = null
let cachedCheckin = null

function loadEnv(path) {
  if (!existsSync(path)) return
  const text = readFileSync(path, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue
    const key = match[1]
    const value = match[2].replace(/\s+#.*$/, '').replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = value
  }
}

function parseTranscript() {
  if (cachedTranscript) return cachedTranscript

  const text = readFileSync(DATA_PATH, 'utf8').replace(/^\uFEFF/, '')
  const blocks = []
  const regex = /^([^\n]+?)\s+(\d{2}:\d{2})(?:\n|$)/gm
  const matches = [...text.matchAll(regex)]

  for (let i = 0; i < matches.length; i += 1) {
    const match = matches[i]
    const next = matches[i + 1]
    const speaker = match[1].trim()
    const time = match[2]
    const start = match.index + match[0].length
    const end = next ? next.index : text.length
    const content = text.slice(start, end).trim().replace(/\n+/g, ' ')
    if (!content || speaker.includes('・') || speaker.includes('koreanPolicyMakingDiscussion')) continue
    blocks.push({
      id: `utt_${String(blocks.length + 1).padStart(3, '0')}`,
      speaker,
      time,
      seconds: toSeconds(time),
      text: content,
    })
  }

  const windowed = blocks
    .filter((item) => item.seconds >= toSeconds(DEFAULT_START) && item.seconds <= toSeconds(DEFAULT_END))
    .map((item, index) => ({
      ...item,
      id: `utt_${String(index + 1).padStart(3, '0')}`,
    }))
  cachedTranscript = {
    source: 'data/koreanPolicyMakingDiscussion.txt',
    topic: '행정구역 개편 등 지역 균형 발전에 대한 각 당의 입장',
    window: { start: DEFAULT_START, end: DEFAULT_END },
    model: MODEL,
    total_utterances: blocks.length,
    selected_utterances: windowed.length,
    speakers: [...new Set(windowed.map((item) => item.speaker))],
    utterances: windowed,
  }

  return cachedTranscript
}

function toSeconds(value) {
  const [minutes, seconds] = value.split(':').map(Number)
  return minutes * 60 + seconds
}

function fallbackCheckin() {
  const transcript = parseTranscript()
  const evidence = transcript.utterances
  return {
    mode: 'fallback',
    prototype_name: 'Value Minority Check-in',
    checkin_title: '지역 균형발전 논의 첫 체크인',
    synthesis_note: 'API 키가 없거나 모델 호출이 실패하면 표시되는 deterministic fallback입니다. Generate check-in을 누르면 transcript 전체를 LLM에 맡겨 다시 합성합니다.',
    axis_change_note: AXIS_CHANGE_NOTE,
    intervention_levels: DEFAULT_INTERVENTION_LEVELS,
    axes: [
      {
        id: 'speed-vs-legitimacy',
        label: '개혁 실행력 ↔ 절차적 정당성',
        left_pole: '속도와 실행력',
        right_pole: '주민 동의와 절차',
        importance: 0.92,
        confidence: 0.78,
        label_alternatives: ['추진 속도 ↔ 민주적 정당성', '실행 우선 ↔ 동의 우선'],
        minority_pole: '주민 동의와 절차',
        why_it_matters: '행정통합과 분권을 추진해야 한다는 주장 속에서, 주민투표와 민주적 절차를 먼저 확인해야 한다는 가치극이 한쪽 발화에 강하게 의존합니다.',
        evidence_ids: ['utt_002', 'utt_001'],
      },
      {
        id: 'growth-vs-basic-rights',
        label: '성장 거점 투자 ↔ 전국적 기본권',
        left_pole: '거점 투자와 성장',
        right_pole: '전국 어디서나 기본권',
        importance: 0.84,
        confidence: 0.71,
        label_alternatives: ['선택과 집중 ↔ 보편 보장', '거점 성장 ↔ 형평'],
        minority_pole: '전국 어디서나 기본권',
        why_it_matters: '재정 지원과 산업 생태계 주장이 강하지만 노동권, 환경권, 의료, 공공성의 전국적 보장 조건은 상대적으로 덜 되돌아옵니다.',
        evidence_ids: ['utt_001', 'utt_004'],
      },
      {
        id: 'central-capacity-vs-local-choice',
        label: '국가 조정력 ↔ 주민 자기결정',
        left_pole: '국가 컨트롤타워',
        right_pole: '생활권 단위 자기결정',
        importance: 0.79,
        confidence: 0.64,
        label_alternatives: ['중앙 주도 ↔ 주민 자치', '국가 조정 ↔ 생활권 결정'],
        minority_pole: '생활권 단위 자기결정',
        why_it_matters: '지역소멸 대응에 국가 역할이 필요하다는 합의가 있으나, 최종 결정권이 주민에게 남는지에 대한 조건은 묻히기 쉽습니다.',
        evidence_ids: ['utt_001', 'utt_002'],
      },
    ],
    joint_prompt_suggestions: [
      '행정통합을 추진하더라도, 주민 동의와 절차를 어떤 최소 조건으로 남겨야 할까?',
      '전국 어디서나 보장돼야 할 기본권을 거점 투자 논의에 어떻게 함께 둘 수 있을까?',
      '통합 이후 실패 비용과 서비스 공백은 누가 책임지나?',
    ],
    participants: [
      {
        speaker: '정의당',
        x: 0.78,
        y: 0.74,
        radius: 0.28,
        summary: '국가 책임, 지역 순환경제, 주민투표, 기본권 보장을 함께 요구하며 절차와 공공성을 강하게 둡니다.',
        value_orientation: ['절차적 정당성', '기본권 보장', '주민 자기결정'],
        evidence_ids: ['utt_001', 'utt_002'],
      },
      {
        speaker: '민주당',
        x: -0.68,
        y: -0.55,
        radius: 0.22,
        summary: '지방 주도 성장, 특별법, 대규모 재정지원, 실행된 변화를 통해 성과와 실행력을 강조합니다.',
        value_orientation: ['실행력', '거점 투자', '성과 책임'],
        evidence_ids: ['utt_003', 'utt_004'],
      },
      {
        speaker: '개혁신당',
        x: -0.48,
        y: -0.2,
        radius: 0.2,
        summary: '행정구역 선 긋기보다 산업과 재정 구조 개편, 정책 철학과 실익을 강조합니다.',
        value_orientation: ['정책 실익', '산업 자립', '혼란 회피'],
        evidence_ids: ['utt_005', 'utt_006'],
      },
      {
        speaker: '국민의힘',
        x: -0.18,
        y: 0.18,
        radius: 0.18,
        summary: '지방정부에 권한과 재정 권한을 과감히 이양해야 한다는 분권 실행 관점이 강합니다.',
        value_orientation: ['권한 이양', '지방 경쟁력', '실질 자치'],
        evidence_ids: ['utt_007'],
      },
      {
        speaker: '조국혁신당',
        x: 0.2,
        y: 0.12,
        radius: 0.16,
        summary: '논의 후반 발화가 제한되어 있어 이 window 안에서는 안정적인 가치 위치를 낮은 확신으로 둡니다.',
        value_orientation: ['추가 확인 필요'],
        evidence_ids: [],
      },
    ],
    utterance_points: evidence.slice(0, 10).map((item, index) => ({
      id: item.id,
      speaker: item.speaker,
      time: item.time,
      text: item.text,
      x: [-0.72, 0.66, -0.6, -0.52, -0.36, -0.22, -0.12, 0.18, 0.05, 0.34][index] ?? 0,
      y: [-0.52, 0.76, -0.45, -0.38, -0.18, -0.12, 0.22, 0.14, 0.05, 0.16][index] ?? 0,
      axis_id: index % 2 === 0 ? 'speed-vs-legitimacy' : 'growth-vs-basic-rights',
      value_judgment: '가치 판단이 포함된 정책 주장',
    })),
    blind_spots: [
      {
        id: 'buried-procedure',
        type: 'Buried Pole',
        axis_id: 'speed-vs-legitimacy',
        pole: '주민 동의와 절차',
        severity: 0.88,
        diagnosis: '절차적 정당성은 강하게 제기되지만, 다수 논리는 실행과 투자 쪽으로 빠르게 이동합니다.',
        grounded_evidence_ids: ['utt_002'],
      },
      {
        id: 'withheld-basic-rights',
        type: 'Withheld Voice',
        axis_id: 'growth-vs-basic-rights',
        pole: '전국 어디서나 기본권',
        severity: 0.78,
        diagnosis: '기본권 보장 조건이 한 발화에 존재하지만 이후 결정 조건으로 재표현되지 않습니다.',
        grounded_evidence_ids: ['utt_001'],
      },
      {
        id: 'latent-accountability',
        type: 'Latent Axis',
        axis_id: 'central-capacity-vs-local-choice',
        pole: '책임 소재와 사후 검증',
        severity: 0.71,
        diagnosis: '통합 이후 누가 실패 비용과 서비스 공백을 책임지는지의 축이 열릴 수 있지만 아직 전면화되지 않았습니다.',
        grounded_evidence_ids: ['utt_004', 'utt_007'],
      },
    ],
    tensions: [
      {
        id: 'tension-democracy-vs-speed',
        participant_a: '정의당',
        participant_b: '민주당',
        axis_id: 'speed-vs-legitimacy',
        title: '절차적 정당성 vs 추진 속도',
        diagnosis: '정의당은 주민투표와 민주적 절차를 통합의 조건으로 두지만, 민주당은 이미 시작된 변화와 재정 투자를 통해 빠른 실행력을 강조합니다.',
        evidence_ids: ['utt_002', 'utt_004'],
        severity: 0.86,
      },
      {
        id: 'tension-basic-rights-vs-growth-hubs',
        participant_a: '정의당',
        participant_b: '개혁신당',
        axis_id: 'growth-vs-basic-rights',
        title: '전국적 기본권 vs 산업 자립',
        diagnosis: '정의당은 전국 어디서나 보장되는 기본권을 강조하고, 개혁신당은 행정구역보다 산업과 재정 구조를 바꾸는 실익을 강조합니다.',
        evidence_ids: ['utt_001', 'utt_008'],
        severity: 0.74,
      },
      {
        id: 'tension-central-control-vs-local-power',
        participant_a: '국민의힘',
        participant_b: '민주당',
        axis_id: 'central-capacity-vs-local-choice',
        title: '권한 이양 vs 중앙 주도 지원',
        diagnosis: '국민의힘은 실질 권한 이양이 빠진 지원을 문제 삼고, 민주당은 특별법과 대규모 재정 지원을 통한 지방 주도 성장을 앞세웁니다.',
        evidence_ids: ['utt_007', 'utt_004'],
        severity: 0.7,
      },
    ],
    interventions: {
      L1: {
        title: '표시 — 묻힌 가치극을 보이게',
        text: '[주민 동의와 절차] 극은 현재 정의당 발화에 크게 의존합니다. 다수 흐름은 실행·투자 쪽으로 빠르게 이동했습니다.',
        delivery: '지도 위 marker와 근거 발화로 보입니다. AI는 말하지 않고, 묻힌 극을 동등하게 보이게만 합니다.',
        support_target: 'group',
        scaffold_note: 'AI는 판정하지 않습니다. 이 극이 반영될 자격이 있는지는 그룹이 정합니다.',
      },
      L2: {
        title: '질문 — 다시 열 자리를 만듦',
        text: '행정통합을 추진하더라도, 주민 동의와 절차를 어떤 최소 조건으로 남겨야 할까요?',
        delivery: '진행자가 전체 그룹에 응답 라운드를 요청합니다. 답은 AI가 아니라 그룹·소수가 채웁니다.',
        support_target: 'group',
        scaffold_note: 'AI는 답을 주지 않고 자리만 엽니다. 묻힌 극의 당사자가 직접 말할 기회입니다.',
      },
      L3: {
        title: 'What-if — 조건적 결과만',
        text: "만약 [주민 동의와 절차]를 동등 반영하면, 결정은 '주민투표·기본권 조건이 붙은 단계적 추진'으로 바뀔 수 있습니다.",
        delivery: '결과를 조건문으로만 보입니다. 균형점을 제안하지 않으며, 반영 여부는 그룹이 판단합니다.',
        support_target: 'group',
        scaffold_note: 'AI는 무엇을 해야 한다고 말하지 않습니다. 가능한 결과만 보여줍니다.',
      },
      L4: {
        title: '재표현 — 나왔다 묻힌 입장을 정리 (당사자 통제)',
        text: '[AI생성·재표현] 앞서 나온 입장은 "통합 반대"라기보다, 통합의 정당성이 주민투표와 기본권 보장 조건에 달려 있다는 주장으로 읽힙니다.',
        delivery: '원문 evidence를 함께 띄우고, 해당 화자가 직접 수정하거나 거부(contest)할 수 있습니다.',
        support_target: 'minority',
        scaffold_note: '익명으로 대신 말하지 않습니다. [AI생성]을 명시하고 원화자가 소유·수정합니다 — 소수의 발언권을 AI가 가져가지 않습니다.',
      },
    },
    what_if: '만약 [주민 동의와 절차]를 동등하게 반영하면 결정은 “행정통합 추진”이 아니라 “주민 동의 절차와 기본권 보장 조건이 붙은 단계적 추진”으로 바뀔 수 있습니다. 반영 여부는 그룹이 판단합니다.',
    decision_options: ['탐색', '의도적 제외', '이월'],
  }
}

function promptPayload() {
  const transcript = parseTranscript()
  return {
    prototype_goal: 'Proactively support value minorities in group deliberation at a check-in moment.',
    dataset: {
      source: transcript.source,
      topic: transcript.topic,
      window: transcript.window,
      speakers: transcript.speakers,
      selected_utterances: transcript.selected_utterances,
    },
    instructions: [
      'Use LLM-naive analysis. Do not use Schwartz/ValueEval labels unless the transcript itself needs them.',
      'Map person/party-level value orientations, not just utterance-level labels.',
      'Extract situated value axes in the language of this conversation.',
      'A blind spot is not empty space. It is a buried value pole, withheld voice, or latent axis tied to value minority support.',
      'Do not recommend the final group decision. Show what-if consequences and contestable interventions.',
      'Keep the JSON compact: exactly 3 axes, exactly 5 participants excluding the moderator, at most 8 utterance_points, exactly 3 blind_spots.',
      'Use short Korean strings. Keep summaries under 120 Korean characters and intervention text under 180 Korean characters.',
      'All importance, confidence, and severity values must be decimal numbers from 0.0 to 1.0.',
      'Return 2-3 tensions between participants. A tension is a visible value conflict between two named participants/parties.',
      'Return intervention_levels exactly as provided if possible, using Korean action labels instead of exposing L1-L4 to users.',
      'Treat every axis label as a tentative interpretation: also return confidence and 1-2 label_alternatives phrased differently.',
      'Return 3 joint_prompt_suggestions: short Korean questions the GROUP could ask AI about the buried poles. These are questions, not answers.',
      'For each intervention give support_target ("minority" or "group") and a Korean scaffold_note stating how the AI avoids speaking FOR the minority (scaffolding, not substitution). L4 re-voicing MUST keep [AI생성] labeling and let the original speaker edit/contest — never anonymous masking.',
    ],
    output_schema: {
      prototype_name: 'Value Minority Check-in',
      checkin_title: 'string',
      synthesis_note: 'string',
      axis_change_note: 'string',
      intervention_levels: [
        { key: 'L1', label: '표시', short_label: '표시', explanation: 'string' },
      ],
      axes: [
        {
          id: 'kebab-case-string',
          label: 'left pole ↔ right pole',
          left_pole: 'string',
          right_pole: 'string',
          importance: 0.0,
          confidence: 0.0,
          label_alternatives: ['alternative phrasing of the same axis'],
          minority_pole: 'string',
          why_it_matters: 'string',
          evidence_ids: ['utt_001'],
        },
      ],
      joint_prompt_suggestions: ['short Korean question the group could ask AI'],
      participants: [
        {
          speaker: 'string',
          x: -1.0,
          y: 1.0,
          radius: 0.2,
          summary: 'string',
          value_orientation: ['string'],
          evidence_ids: ['utt_001'],
        },
      ],
      utterance_points: [
        {
          id: 'utt_001',
          speaker: 'string',
          time: '00:00',
          text: 'verbatim Korean text',
          x: -1.0,
          y: 1.0,
          axis_id: 'axis id',
          value_judgment: 'why this is value-laden',
        },
      ],
      blind_spots: [
        {
          id: 'kebab-case-string',
          type: 'Buried Pole | Withheld Voice | Latent Axis',
          axis_id: 'axis id',
          pole: 'string',
          severity: 0.0,
          diagnosis: 'string',
          grounded_evidence_ids: ['utt_001'],
        },
      ],
      interventions: {
        L1: { title: 'string', text: 'string', delivery: 'string', support_target: 'group', scaffold_note: 'string' },
        L2: { title: 'string', text: 'string', delivery: 'string', support_target: 'group', scaffold_note: 'string' },
        L3: { title: 'string', text: 'what-if conditional only', delivery: 'string', support_target: 'group', scaffold_note: 'string' },
        L4: { title: 'string', text: '[AI생성·재표현] ...', delivery: 'string', support_target: 'minority', scaffold_note: 'AI는 익명 대변하지 않고 원화자가 수정·거부 가능' },
      },
      tensions: [
        {
          id: 'kebab-case-string',
          participant_a: 'speaker name',
          participant_b: 'speaker name',
          axis_id: 'axis id',
          title: 'short Korean title',
          diagnosis: 'string',
          evidence_ids: ['utt_001'],
          severity: 0.0,
        },
      ],
      what_if: 'string',
      decision_options: ['탐색', '의도적 제외', '이월'],
    },
    utterances: transcript.utterances,
  }
}

async function generateCheckin(force = false) {
  if (cachedCheckin && !force) return cachedCheckin

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return fallbackCheckin()

  const payload = {
    model: MODEL,
    input: [
      {
        role: 'system',
        content: [
          'You are a Korean HCI research prototype named Value Minority Check-in.',
          'Your task is to synthesize a group deliberation check-in for minority support.',
          'Return compact valid JSON only. All user-facing strings must be Korean.',
          'Coordinates must be numbers from -1 to 1. Use the top two axes as x and y.',
          'Return exactly 3 axes, 5 non-moderator participants, up to 8 utterance_points, and 3 blind_spots.',
          'Return 2-3 participant tensions using existing participant names and evidence ids.',
          'Use action labels 표시, 질문, AI 발언, 재표현 for intervention_levels.',
          'Keep output concise so the JSON is complete.',
          'Make every intervention contestable and grounded. Do not decide for the group.',
        ].join(' '),
      },
      {
        role: 'user',
        content: JSON.stringify(promptPayload()),
      },
    ],
    max_output_tokens: 9000,
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    return {
      ...fallbackCheckin(),
      api_error: `OpenAI HTTP ${response.status}: ${errorText.slice(0, 360)}`,
    }
  }

  const json = await response.json()
  const text = extractResponseText(json)
  try {
    cachedCheckin = normalizeCheckin(parseModelJson(text))
    return cachedCheckin
  } catch {
    return {
      ...fallbackCheckin(),
      raw_model_text: text,
    }
  }
}

function extractResponseText(response) {
  if (response.output_text) return response.output_text
  const chunks = []
  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === 'output_text' || content.type === 'text') chunks.push(content.text)
    }
  }
  return chunks.join('\n').trim()
}

function stripCodeFence(text) {
  return text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
}

function parseModelJson(text) {
  const clean = stripCodeFence(text)
  try {
    return JSON.parse(clean)
  } catch {
    const repaired = balanceTrailingBraces(clean)
    return JSON.parse(repaired)
  }
}

function balanceTrailingBraces(text) {
  let depth = 0
  let inString = false
  let escaped = false

  for (const ch of text) {
    if (escaped) {
      escaped = false
      continue
    }
    if (ch === '\\' && inString) {
      escaped = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (ch === '{') depth += 1
    if (ch === '}') depth -= 1
  }

  if (depth <= 0) return text
  return `${text}${'}'.repeat(depth)}`
}

function normalizeCheckin(value) {
  const normalized = { ...value }
  normalized.axis_change_note = normalized.axis_change_note ?? AXIS_CHANGE_NOTE
  normalized.intervention_levels = normalizeInterventionLevels(normalized.intervention_levels)
  normalized.tensions = normalizeTensions(normalized)
  if (normalized.interventions?.what_if && !normalized.what_if) {
    normalized.what_if = normalized.interventions.what_if
    delete normalized.interventions.what_if
  }
  if (normalized.interventions?.decision_options && !normalized.decision_options) {
    normalized.decision_options = normalized.interventions.decision_options
    delete normalized.interventions.decision_options
  }
  return normalized
}

function normalizeInterventionLevels(levels) {
  if (!Array.isArray(levels) || levels.length === 0) return DEFAULT_INTERVENTION_LEVELS
  const byKey = new Map(levels.map((level) => [level.key, level]))
  return DEFAULT_INTERVENTION_LEVELS.map((fallbackLevel) => ({
    ...fallbackLevel,
    ...(byKey.get(fallbackLevel.key) ?? {}),
  }))
}

function normalizeTensions(checkin) {
  if (Array.isArray(checkin.tensions) && checkin.tensions.length > 0) return checkin.tensions.slice(0, 3)
  const participants = checkin.participants ?? []
  const axes = checkin.axes ?? []
  if (participants.length < 2) return []
  const firstAxis = axes[0]?.id ?? ''
  const secondAxis = axes[1]?.id ?? firstAxis
  const thirdAxis = axes[2]?.id ?? firstAxis
  return [
    makeTension('auto-tension-1', participants[0], participants[1], firstAxis, axes[0]?.label ?? '핵심 가치축'),
    makeTension('auto-tension-2', participants[0], participants[2] ?? participants[1], secondAxis, axes[1]?.label ?? '보조 가치축'),
    makeTension('auto-tension-3', participants[3] ?? participants[1], participants[4] ?? participants[0], thirdAxis, axes[2]?.label ?? '잠재 가치축'),
  ].filter(Boolean)
}

function makeTension(id, participantA, participantB, axisId, axisLabel) {
  if (!participantA || !participantB || participantA.speaker === participantB.speaker) return null
  return {
    id,
    participant_a: participantA.speaker,
    participant_b: participantB.speaker,
    axis_id: axisId,
    title: `${participantA.speaker} ↔ ${participantB.speaker}`,
    diagnosis: `${axisLabel}에서 ${participantA.speaker}의 관점과 ${participantB.speaker}의 관점이 서로 다른 우선순위를 보입니다.`,
    evidence_ids: [...(participantA.evidence_ids ?? []).slice(0, 1), ...(participantB.evidence_ids ?? []).slice(0, 1)],
    severity: 0.62,
  }
}

async function readJson(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  if (chunks.length === 0) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function sendJson(res, value) {
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(value))
}

function serveFile(res, filePath) {
  const ext = extname(filePath)
  res.writeHead(200, {
    'Content-Type': MIME[ext] ?? 'application/octet-stream',
    'Cache-Control': 'no-store',
  })
  createReadStream(filePath).pipe(res)
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`)

    if (req.method === 'GET' && url.pathname === '/favicon.ico') {
      res.writeHead(204)
      res.end()
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/transcript') {
      sendJson(res, parseTranscript())
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/fallback') {
      sendJson(res, fallbackCheckin())
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/checkin') {
      const body = await readJson(req)
      sendJson(res, await generateCheckin(Boolean(body.force)))
      return
    }

    const requested = url.pathname === '/' ? '/index.html' : url.pathname
    const filePath = resolve(PUBLIC_DIR, `.${requested}`)
    if (filePath.startsWith(PUBLIC_DIR) && existsSync(filePath)) {
      serveFile(res, filePath)
      return
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Not found')
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ error: String(error?.message ?? error) }))
  }
})

server.listen(PORT, () => {
  console.log(`Value Minority Check-in prototype: http://localhost:${PORT}`)
  console.log(`Model: ${MODEL}`)
})
