import { createReadStream, existsSync, readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const REPO_ROOT = resolve(__dirname, '..', '..')
const PUBLIC_DIR = join(__dirname, 'public')
const RESULTS_DIR = join(REPO_ROOT, 'results', 'policy_discussion')
const PERSONAL_ENV = '/Users/soohwanlee/Desktop/soohwan/80 ORGANIZE/82 Tool/.env'

const DEFAULT_MODEL = 'gpt-5.4-mini'

const VALUE_KEYS = [
  'self_direction_thought',
  'self_direction_action',
  'stimulation',
  'hedonism',
  'achievement',
  'power_dominance',
  'power_resources',
  'face',
  'security_personal',
  'security_societal',
  'tradition',
  'conformity_rules',
  'conformity_interpersonal',
  'humility',
  'benevolence_caring',
  'benevolence_dependability',
  'universalism_concern',
  'universalism_nature',
  'universalism_tolerance',
]

const VALUE_LABELS = {
  self_direction_thought: '자기방향성: 사고',
  self_direction_action: '자기방향성: 행동',
  stimulation: '변화/자극',
  hedonism: '쾌락',
  achievement: '성취',
  power_dominance: '권력: 지배',
  power_resources: '권력: 자원',
  face: '체면',
  security_personal: '개인 안전',
  security_societal: '사회 안전',
  tradition: '전통',
  conformity_rules: '규칙/절차',
  conformity_interpersonal: '대인 순응',
  humility: '겸손',
  benevolence_caring: '배려',
  benevolence_dependability: '신뢰/책임',
  universalism_concern: '평등/공공성',
  universalism_nature: '환경/생태',
  universalism_tolerance: '관용',
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
}

loadEnv(join(REPO_ROOT, '.env'))
loadEnv(join(__dirname, '.env'))
loadEnv(PERSONAL_ENV)

const PORT = Number(process.env.PORT || 5178)
const MODEL = process.env.VALUE_TENSION_MODEL || DEFAULT_MODEL

let cachedData = null
let cachedSynthesis = null

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

function parseCsv(text) {
  const rows = []
  let row = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    const next = text[i + 1]

    if (ch === '"' && inQuotes && next === '"') {
      cell += '"'
      i += 1
    } else if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      row.push(cell)
      cell = ''
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i += 1
      row.push(cell)
      if (row.some((value) => value.length > 0)) rows.push(row)
      row = []
      cell = ''
    } else {
      cell += ch
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }

  const headers = rows.shift().map((header) => header.replace(/^\uFEFF/, ''))
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])))
}

function loadData() {
  if (cachedData) return cachedData

  const vectorRows = parseCsv(readFileSync(join(RESULTS_DIR, 'full_argument_vectors.csv'), 'utf8'))
  const activeRows = parseCsv(readFileSync(join(RESULTS_DIR, 'full_argument_active_values.csv'), 'utf8'))
  const projectionRows = parseCsv(readFileSync(join(RESULTS_DIR, 'full_argument_projection_compare.csv'), 'utf8'))

  const clusterByUnit = new Map()
  for (const row of projectionRows) {
    if (row.projection_method === 'mds') clusterByUnit.set(row.unit_id, Number(row.cluster_id || 0))
  }

  const activeByUnit = new Map()
  for (const row of activeRows) {
    const unit = activeByUnit.get(row.unit_id) ?? []
    unit.push({
      value: row.value,
      stance: row.stance,
      strength: Number(row.strength || 0),
      presence: Number(row.presence || 0),
      signed: Number(row.signed || 0),
    })
    activeByUnit.set(row.unit_id, unit)
  }

  const argumentsList = vectorRows.map((row) => {
    const values = {}
    for (const key of VALUE_KEYS) {
      values[key] = {
        signed: Number(row[`signed__${key}`] || 0),
        support: Number(row[`support__${key}`] || 0),
        constraint: Number(row[`constraint__${key}`] || 0),
        presence: Number(row[`presence__${key}`] || 0),
      }
    }

    return {
      unit_id: row.unit_id,
      speaker: row.speaker,
      time: row.time,
      korean_text: row.korean_text,
      english_text: row.english_text,
      cluster_id: clusterByUnit.get(row.unit_id) ?? 0,
      values,
      active_values: (activeByUnit.get(row.unit_id) ?? [])
        .sort((a, b) => b.strength - a.strength)
        .slice(0, 4),
      top_values: topValues(values, 5),
    }
  })

  const evidenceUnits = selectEvidence(argumentsList, 72)
  const speakers = [...new Set(argumentsList.map((arg) => arg.speaker))].sort()
  const clusterStats = summarizeClusters(argumentsList)
  const speakerStats = summarizeSpeakers(argumentsList)

  cachedData = {
    model: MODEL,
    dataset: {
      source: 'data/koreanPolicyMakingDiscussion.xlsx',
      units: argumentsList.length,
      active_units: argumentsList.filter((arg) => arg.active_values.length > 0).length,
      selected_evidence_units: evidenceUnits.length,
      llm_strategy: 'one synthesis call over cached argument/value evidence; no per-utterance generation',
    },
    speakers,
    speaker_stats: speakerStats,
    clusters: clusterStats,
    evidence_units: evidenceUnits,
    fallback_tensions: fallbackTensions(evidenceUnits),
  }

  return cachedData
}

function topValues(values, limit) {
  return VALUE_KEYS
    .map((key) => ({
      key,
      label: VALUE_LABELS[key],
      signed: values[key].signed,
      support: values[key].support,
      constraint: values[key].constraint,
      presence: values[key].presence,
    }))
    .sort((a, b) => Math.abs(b.signed) - Math.abs(a.signed))
    .slice(0, limit)
}

function selectEvidence(argumentsList, limit) {
  const sorted = argumentsList
    .filter((arg) => arg.active_values.some((value) => value.strength >= 0.35))
    .map((arg) => ({
      ...arg,
      evidence_strength: Math.max(...arg.active_values.map((value) => value.strength), 0),
    }))
    .sort((a, b) => b.evidence_strength - a.evidence_strength)

  const selected = []
  const seen = new Set()
  const speakers = [...new Set(sorted.map((arg) => arg.speaker))]
  const clusters = [...new Set(sorted.map((arg) => arg.cluster_id))]

  for (const group of [speakers, clusters]) {
    for (const key of group) {
      const match = sorted.find((arg) => !seen.has(arg.unit_id) && (arg.speaker === key || arg.cluster_id === key))
      if (match) {
        selected.push(match)
        seen.add(match.unit_id)
      }
    }
  }

  for (const arg of sorted) {
    if (selected.length >= limit) break
    if (!seen.has(arg.unit_id)) {
      selected.push(arg)
      seen.add(arg.unit_id)
    }
  }

  return selected.map(compactArgument)
}

function compactArgument(arg) {
  return {
    unit_id: arg.unit_id,
    speaker: arg.speaker,
    time: arg.time,
    cluster_id: arg.cluster_id,
    korean_text: arg.korean_text,
    english_text: arg.english_text,
    active_values: arg.active_values.map((item) => ({
      value: item.value,
      stance: item.stance,
      strength: round(item.strength),
    })),
    top_values: arg.top_values.slice(0, 3).map((item) => ({
      value: item.label,
      signed: round(item.signed),
    })),
  }
}

function summarizeSpeakers(argumentsList) {
  return [...new Set(argumentsList.map((arg) => arg.speaker))].sort().map((speaker) => {
    const rows = argumentsList.filter((arg) => arg.speaker === speaker)
    const top = aggregateTopValues(rows, 4)
    return {
      speaker,
      count: rows.length,
      top_values: top,
    }
  })
}

function summarizeClusters(argumentsList) {
  return [...new Set(argumentsList.map((arg) => arg.cluster_id))]
    .sort((a, b) => a - b)
    .map((clusterId) => {
      const rows = argumentsList.filter((arg) => arg.cluster_id === clusterId)
      return {
        cluster_id: clusterId,
        size: rows.length,
        top_values: aggregateTopValues(rows, 5),
        examples: rows.slice(0, 3).map((arg) => arg.korean_text),
      }
    })
}

function aggregateTopValues(rows, limit) {
  return VALUE_KEYS
    .map((key) => ({
      value: VALUE_LABELS[key],
      mean_signed: round(mean(rows.map((arg) => arg.values[key].signed))),
      mean_abs: round(mean(rows.map((arg) => Math.abs(arg.values[key].signed)))),
    }))
    .sort((a, b) => b.mean_abs - a.mean_abs)
    .slice(0, limit)
}

function mean(values) {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function round(value) {
  return Math.round(value * 1000) / 1000
}

function fallbackTensions(evidenceUnits) {
  const byId = new Map(evidenceUnits.map((unit) => [unit.unit_id, unit]))
  const evidence = (...ids) => ids.map((id) => byId.get(id)).filter(Boolean).slice(0, 3)
  return {
    mode: 'fallback',
    prototype_name: 'Contextual Value Tension Cards',
    synthesis_note: 'Deterministic fallback based on existing active-value rows. Use Generate to request one LLM synthesis pass.',
    tensions: [
      {
        id: 'local-autonomy-vs-national-coordination',
        title: '주민 결정권과 국가 조정력',
        left_pole: '주민투표, 자치권, 생활권 단위 선택',
        right_pole: '국가 컨트롤타워, 행정통합, 구조 개편',
        description: '지역을 살리기 위한 권한 배분을 둘러싼 긴장입니다. 같은 지역 위기 문제를 두고 한쪽은 주민이 결정할 권리를, 다른 한쪽은 국가가 조정하고 밀어붙일 책임을 강조합니다.',
        schwartz_trace: ['자기방향성: 행동', '규칙/절차', '평등/공공성'],
        risk: '지도에서 정당별 위치만 보이면 “자치 대 중앙” 진영 대립으로 굳어질 수 있습니다.',
        bridge_prompt: '국가 조정이 필요하다는 입장도 주민 결정권을 침해하지 않으려면 어떤 절차적 안전장치를 먼저 제시해야 하나요?',
        evidence: evidence('row004_claim09', 'row005_claim01', 'row007_claim08'),
      },
      {
        id: 'procedural-legitimacy-vs-reform-speed',
        title: '절차적 정당성과 개혁 속도',
        left_pole: '헌법, 절차, 주민 동의, 위헌 논란 해소',
        right_pole: '이미 시작된 변화, 재도약, 신속한 투자',
        description: '변화가 필요하다는 합의가 있어도, 정당성의 기준을 절차에서 찾는지 실행에서 찾는지에 따라 충돌이 생깁니다.',
        schwartz_trace: ['규칙/절차', '변화/자극', '성취'],
        risk: '개혁 속도만 강조하면 절차 비판이 반개혁처럼 보이고, 절차만 강조하면 실행 의지가 약한 것으로 보일 수 있습니다.',
        bridge_prompt: '속도를 유지하면서도 나중에 정당성 논란이 반복되지 않게 만드는 최소 절차는 무엇인가요?',
        evidence: evidence('row007_claim04', 'row005_claim01', 'row004_claim04'),
      },
      {
        id: 'equity-vs-concentrated-investment',
        title: '전국적 형평성과 거점 집중 투자',
        left_pole: '전국 어디서나 기본권과 공공성 보장',
        right_pole: '거점 도시, 특별법, 대규모 재정 투자',
        description: '균형발전이라는 같은 목표 아래에서도 자원을 넓게 보장할지, 성장 거점에 집중할지의 수단 갈등이 생깁니다.',
        schwartz_trace: ['평등/공공성', '권력: 자원', '사회 안전'],
        risk: '투자 규모가 큰 주장만 지도에서 두드러지면 기본권 보장 논의가 부차화될 수 있습니다.',
        bridge_prompt: '거점 집중 투자가 주변 지역의 기본권 보장을 약화시키지 않는다는 증거는 무엇으로 확인할 수 있나요?',
        evidence: evidence('row004_claim11', 'row007_claim08', 'row004_claim05'),
      },
      {
        id: 'crisis-security-vs-self-governed-future',
        title: '생존 위기와 자기결정적 미래',
        left_pole: '지역 소멸, 안전 위협, 경제 충격',
        right_pole: '분권, 재도약, 주민이 설계하는 미래',
        description: '위기 프레임은 행동을 촉구하지만, 계속 위기만 강조하면 주민의 선택권과 미래 설계 가능성이 흐려집니다.',
        schwartz_trace: ['사회 안전', '자기방향성: 행동', '변화/자극'],
        risk: '위기 언어가 강해질수록 숙의가 “누가 더 심각하게 보는가” 경쟁으로 바뀔 수 있습니다.',
        bridge_prompt: '위기 진단 다음에 바로 붙어야 할 주민 선택권 문장은 무엇인가요?',
        evidence: evidence('row004_claim01', 'row007_claim02', 'row004_claim09'),
      },
    ],
    process_interventions: [
      '각 tension은 결론이 아니라 수정 가능한 회의 객체로 둡니다.',
      '참가자는 축 이름, 빠진 증거, 부적절한 증거를 직접 고칩니다.',
      '카드마다 “상대가 지키려는 가치”를 먼저 말한 뒤 정책 수단을 논의합니다.',
    ],
    feasibility: {
      llm_calls_per_session: 1,
      cached_inputs: ['argument segmentation', 'translation', '19D value vectors', 'active-value rows'],
      expensive_step: 'contextual synthesis, not per-utterance extraction',
      next_optimization: 'only regenerate a changed card when the facilitator edits evidence or adds transcript rows',
    },
  }
}

function compactPromptPayload(data) {
  return {
    dataset: data.dataset,
    speakers: data.speakers,
    speaker_stats: data.speaker_stats,
    clusters: data.clusters,
    evidence_units: data.evidence_units,
  }
}

async function generateTensions() {
  if (cachedSynthesis) return cachedSynthesis

  const data = loadData()
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return data.fallback_tensions

  const payload = {
    model: MODEL,
    input: [
      {
        role: 'system',
        content: [
          'You are designing a Korean HCI research prototype for Value Constellation.',
          'Create context-specific value tension cards from policy debate evidence.',
          'Do not merely list Schwartz values. Convert them into situated deliberation axes.',
          'Return only compact valid JSON with Korean user-facing strings.',
        ].join(' '),
      },
      {
        role: 'user',
        content: JSON.stringify({
          task: 'Generate 4-6 contextual value tensions and facilitator bridge prompts.',
          schema: {
            prototype_name: 'string',
            synthesis_note: 'string',
            tensions: [
              {
                id: 'kebab-case-string',
                title: 'short Korean title',
                left_pole: 'string',
                right_pole: 'string',
                description: '2-3 Korean sentences',
                schwartz_trace: ['Korean or English value labels'],
                risk: 'how visualization could backfire',
                bridge_prompt: 'one facilitator question',
                evidence: [
                  {
                    unit_id: 'string',
                    speaker: 'string',
                    time: 'string',
                    korean_text: 'verbatim evidence',
                    active_values: [{ value: 'string', stance: 'support|constraint', strength: 0.0 }],
                  },
                ],
              },
            ],
            process_interventions: ['string'],
            feasibility: {
              llm_calls_per_session: 1,
              cached_inputs: ['string'],
              expensive_step: 'string',
              next_optimization: 'string',
            },
          },
          constraints: [
            'Use evidence unit IDs from the provided input.',
            'Each tension must include at least two parties when possible.',
            'Frame cards as negotiable boundary objects, not model truth.',
            'Keep feasibility realistic: one synthesis call, cached vectors, editable evidence.',
          ],
          data: compactPromptPayload(data),
        }),
      },
    ],
    max_output_tokens: 3600,
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
      ...data.fallback_tensions,
      api_error: `OpenAI HTTP ${response.status}: ${errorText.slice(0, 360)}`,
    }
  }

  const json = await response.json()
  const text = extractResponseText(json)
  try {
    cachedSynthesis = JSON.parse(stripCodeFence(text))
    return cachedSynthesis
  } catch {
    return {
      ...data.fallback_tensions,
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

function sendJson(res, value) {
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(value))
}

function serveFile(res, filePath) {
  const ext = extname(filePath)
  res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' })
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

    if (req.method === 'GET' && url.pathname === '/api/data') {
      sendJson(res, loadData())
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/tensions') {
      sendJson(res, await generateTensions())
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
  console.log(`Contextual Value Tensions prototype: http://localhost:${PORT}`)
  console.log(`Model: ${MODEL}`)
})
