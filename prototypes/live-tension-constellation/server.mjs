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

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
}

// Concepts are arranged so that the five tension pairs (below) sit roughly
// opposite each other across the field, so a thick edge reads as a real pull
// between two sides rather than an arbitrary line.
const CONCEPTS = [
  {
    id: 'regional_survival',
    label: '지역 생존',
    short: '생존',
    description: '"이대로면 지역이 사라진다"는 위기 감각. 인구 감소와 국가 존립 기반에 대한 절박함.',
    schwartz: '안전(사회) · 보편주의(자연)',
    color: '#e2603f',
    x: 0.50,
    y: 0.10,
  },
  {
    id: 'resident_agency',
    label: '주민 결정권',
    short: '결정권',
    description: '"우리 동네 일은 우리가 정한다." 주민투표·지방자치·분권, 아래로부터의 선택권.',
    schwartz: '자기주도(행동/사고)',
    color: '#1f9d76',
    x: 0.13,
    y: 0.40,
  },
  {
    id: 'national_coordination',
    label: '국가 조정력',
    short: '조정',
    description: '"국가가 큰 그림을 잡아야 한다." 중앙 컨트롤타워, 행정통합, 국가 단위 구조 개편.',
    schwartz: '권력(지배)',
    color: '#3f7fd6',
    x: 0.87,
    y: 0.40,
  },
  {
    id: 'procedural_legitimacy',
    label: '절차 정당성',
    short: '절차',
    description: '"제대로 된 절차를 밟았는가." 헌법·법적 근거·주민 동의·위헌 논란.',
    schwartz: '동조(규칙) · 전통',
    color: '#9b6fc4',
    x: 0.26,
    y: 0.70,
  },
  {
    id: 'reform_momentum',
    label: '변화 실행력',
    short: '실행',
    description: '"이미 시작됐으니 밀어붙이자." 재도약·신속한 개혁·정책 추진 속도.',
    schwartz: '자극 · 성취',
    color: '#f0962f',
    x: 0.74,
    y: 0.70,
  },
  {
    id: 'resource_distribution',
    label: '재정과 배분',
    short: '배분',
    description: '"돈을 어디에 쏟을 것인가." 재정 지원·특별법·거점 투자·수도권 집중.',
    schwartz: '권력(자원)',
    color: '#d9b526',
    x: 0.50,
    y: 0.90,
  },
  {
    id: 'basic_rights',
    label: '전국 기본권',
    short: '기본권',
    description: '"어디 살든 최소한은 보장돼야." 전국 어디서나 의료·노동권·공공성·차별 없는 보장.',
    schwartz: '보편주의(관심/포용)',
    color: '#2bb3a3',
    x: 0.07,
    y: 0.84,
  },
  {
    id: 'livelihood_safety',
    label: '민생 안전',
    short: '민생',
    description: '"당장 먹고사는 일이 위태롭다." 전쟁·유가·고용·사고 등 일상 안정성 압박.',
    schwartz: '안전(개인) · 선의',
    color: '#c2455e',
    x: 0.93,
    y: 0.84,
  },
]

const TENSION_PAIRS = [
  {
    id: 'agency_coordination',
    a: 'resident_agency',
    b: 'national_coordination',
    label: '주민 결정권 ↔ 국가 조정력',
    bridge: '국가 조정이 필요하다는 입장도 주민 결정권을 침해하지 않으려면 어떤 절차적 안전장치를 먼저 제시해야 하나요?',
  },
  {
    id: 'procedure_momentum',
    a: 'procedural_legitimacy',
    b: 'reform_momentum',
    label: '절차 정당성 ↔ 변화 실행력',
    bridge: '속도를 유지하면서도 나중에 정당성 논란이 반복되지 않게 만드는 최소 절차는 무엇인가요?',
  },
  {
    id: 'rights_investment',
    a: 'basic_rights',
    b: 'resource_distribution',
    label: '전국적 기본권 ↔ 거점 투자',
    bridge: '거점 집중 투자가 주변 지역의 기본권 보장을 약화시키지 않는다는 증거는 무엇으로 확인할 수 있나요?',
  },
  {
    id: 'crisis_future',
    a: 'regional_survival',
    b: 'resident_agency',
    label: '생존 위기 ↔ 자기결정적 미래',
    bridge: '위기 진단 다음에 바로 붙어야 할 주민 선택권 문장은 무엇인가요?',
  },
  {
    id: 'safety_reform',
    a: 'livelihood_safety',
    b: 'reform_momentum',
    label: '민생 안전 ↔ 구조 개혁',
    bridge: '개혁 추진이 민생 안전을 흔들지 않는다는 보완 조건은 무엇인가요?',
  },
]

const VALUE_TO_CONCEPT = {
  'Security: societal': [
    ['regional_survival', 0.78],
    ['livelihood_safety', 0.58],
  ],
  'Security: personal': [['livelihood_safety', 0.9]],
  'Self-direction: action': [['resident_agency', 1.0]],
  'Self-direction: thought': [['resident_agency', 0.62]],
  'Conformity: rules': [['procedural_legitimacy', 1.0]],
  Tradition: [['procedural_legitimacy', 0.44]],
  Stimulation: [['reform_momentum', 0.9]],
  Achievement: [['reform_momentum', 0.62]],
  'Power: resources': [['resource_distribution', 1.0]],
  'Power: dominance': [
    ['national_coordination', 0.72],
    ['resource_distribution', 0.34],
  ],
  'Universalism: concern': [['basic_rights', 1.0]],
  'Universalism: tolerance': [['basic_rights', 0.56]],
  'Benevolence: caring': [
    ['basic_rights', 0.52],
    ['livelihood_safety', 0.4],
  ],
}

const KEYWORD_BOOSTS = [
  ['regional_survival', /지역\s*소멸|소멸|존립|위협|인구/g, 0.34],
  ['resident_agency', /주민|자치|결정권|주민투표|지방자치|분권|이양/g, 0.36],
  ['national_coordination', /정부|국가|컨트롤타워|행정통합|통합|중앙|대법원|이전/g, 0.28],
  ['procedural_legitimacy', /헌법|법률|절차|정당성|위헌|투표|동의|민주/g, 0.38],
  ['reform_momentum', /변화|시작|재도약|개혁|혁신|추진|완료|성장/g, 0.32],
  ['resource_distribution', /재정|투자|지원|특별법|예산|자원|수도권|거점|20조/g, 0.38],
  ['basic_rights', /기본권|공공성|의료|노동권|환경권|차별|균등|전국/g, 0.4],
  ['livelihood_safety', /전쟁|유가|안전|고용|사고|생필품|민생|화재|위기/g, 0.36],
]

loadEnv(join(REPO_ROOT, '.env'))
loadEnv(join(__dirname, '.env'))
loadEnv(PERSONAL_ENV)

const PORT = Number(process.env.PORT || 5179)
const MODEL = process.env.VALUE_TENSION_MODEL || DEFAULT_MODEL
let cachedData = null
let cachedConceptRefinement = null

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

  const activeRows = parseCsv(readFileSync(join(RESULTS_DIR, 'full_argument_active_values.csv'), 'utf8'))
  const activeByUnit = new Map()
  for (const row of activeRows) {
    const unit = activeByUnit.get(row.unit_id) ?? []
    unit.push({
      value: row.value,
      stance: row.stance,
      strength: Number(row.strength || 0),
      signed: Number(row.signed || 0),
    })
    activeByUnit.set(row.unit_id, unit)
  }

  const vectorRows = parseCsv(readFileSync(join(RESULTS_DIR, 'full_argument_vectors.csv'), 'utf8'))
  const events = vectorRows.map((row, index) => {
    const activeValues = (activeByUnit.get(row.unit_id) ?? [])
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 5)
    const activations = conceptActivations(row.korean_text, activeValues)
    const topConcepts = Object.entries(activations)
      .map(([id, strength]) => ({ id, strength: round(strength) }))
      .filter((item) => item.strength >= 0.12)
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 4)

    return {
      index,
      unit_id: row.unit_id,
      speaker: row.speaker,
      time: row.time,
      korean_text: row.korean_text,
      english_text: row.english_text,
      active_values: activeValues.map((item) => ({
        value: item.value,
        stance: item.stance,
        strength: round(item.strength),
      })),
      concepts: topConcepts,
    }
  })

  const conceptStats = summarizeConcepts(events)

  cachedData = {
    model: MODEL,
    dataset: {
      source: 'data/koreanPolicyMakingDiscussion.xlsx',
      events: events.length,
      active_events: events.filter((event) => event.concepts.length > 0).length,
      strategy: 'real-time replay from cached argument/value evidence; LLM reserved for low-frequency situated naming',
    },
    concepts: CONCEPTS.map((concept) => ({ ...concept, ...conceptStats[concept.id] })),
    tension_pairs: TENSION_PAIRS,
    speakers: [...new Set(events.map((event) => event.speaker))].sort(),
    events,
    research_rationale: [
      'A static value map can make group differences salient but does not explain when or how tensions form.',
      'A temporal replay gives process-level evidence: whose claim intensified a tension, which values persisted, and where a facilitator could intervene.',
      'Situated value labels avoid asking participants to reason directly with abstract Schwartz dimensions.',
      'The artifact is editable: the group can rename concepts, merge nodes, or mark an inferred tension as wrong.',
    ],
  }

  return cachedData
}

function conceptActivations(text, activeValues) {
  const scores = Object.fromEntries(CONCEPTS.map((concept) => [concept.id, 0]))
  for (const item of activeValues) {
    const mappings = VALUE_TO_CONCEPT[item.value] ?? []
    for (const [conceptId, weight] of mappings) {
      const directionWeight = item.stance === 'constraint' ? 0.82 : 1
      scores[conceptId] += item.strength * weight * directionWeight
    }
  }

  for (const [conceptId, pattern, boost] of KEYWORD_BOOSTS) {
    const matches = text.match(pattern)
    if (matches) scores[conceptId] += Math.min(0.48, matches.length * boost)
  }

  const maxScore = Math.max(...Object.values(scores), 1)
  return Object.fromEntries(Object.entries(scores).map(([id, score]) => [id, Math.min(1, score / maxScore)]))
}

function round(value) {
  return Math.round(value * 1000) / 1000
}

// For each situated concept, count how often it appeared across the whole
// discussion, whether it was mostly invoked as something to protect (support)
// or something under threat (constraint), and keep the single clearest Korean
// quote as evidence. This is what makes a node feel like a real, inspectable
// value rather than an abstract dot.
function summarizeConcepts(events) {
  const stats = Object.fromEntries(
    CONCEPTS.map((concept) => [
      concept.id,
      { mentions: 0, support: 0, constraint: 0, evidence: null, evidenceStrength: 0, speakers: {} },
    ]),
  )

  for (const event of events) {
    for (const activation of event.concepts) {
      const stat = stats[activation.id]
      if (!stat) continue
      stat.mentions += 1
      stat.speakers[event.speaker] = (stat.speakers[event.speaker] ?? 0) + 1

      const stance = dominantStance(event, activation.id)
      if (stance === 'constraint') stat.constraint += 1
      else stat.support += 1

      if (activation.strength > stat.evidenceStrength) {
        stat.evidenceStrength = activation.strength
        stat.evidence = {
          speaker: event.speaker,
          time: event.time,
          korean_text: event.korean_text,
          stance,
        }
      }
    }
  }

  return Object.fromEntries(
    Object.entries(stats).map(([id, stat]) => {
      const total = stat.support + stat.constraint || 1
      const topSpeakers = Object.entries(stat.speakers)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([speaker, count]) => ({ speaker, count }))
      return [
        id,
        {
          mentions: stat.mentions,
          support: stat.support,
          constraint: stat.constraint,
          // -1 = almost always raised as under threat, +1 = almost always defended
          orientation: round((stat.support - stat.constraint) / total),
          evidence: stat.evidence,
          top_speakers: topSpeakers,
        },
      ]
    }),
  )
}

// Use the strongest active Schwartz value that maps to this concept to decide
// whether the concept was invoked as supported or constrained in this event.
function dominantStance(event, conceptId) {
  let best = null
  let bestStrength = 0
  for (const item of event.active_values) {
    const mappings = VALUE_TO_CONCEPT[item.value] ?? []
    if (!mappings.some(([id]) => id === conceptId)) continue
    if (item.strength > bestStrength) {
      bestStrength = item.strength
      best = item.stance
    }
  }
  return best === 'constraint' ? 'constraint' : 'support'
}

function compactEvidence(data) {
  return data.events
    .filter((event) => event.concepts.length > 0)
    .slice(0, 90)
    .map((event) => ({
      speaker: event.speaker,
      time: event.time,
      korean_text: event.korean_text,
      active_values: event.active_values,
      current_concepts: event.concepts.map((item) => ({
        id: item.id,
        label: CONCEPTS.find((concept) => concept.id === item.id)?.label,
        strength: item.strength,
      })),
    }))
}

async function refineConcepts() {
  if (cachedConceptRefinement) return cachedConceptRefinement

  const data = loadData()
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return {
      mode: 'fallback',
      concepts: data.concepts,
      note: 'No API key available. Using deterministic situated value labels.',
    }
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      input: [
        {
          role: 'system',
          content: 'You refine situated value concept labels for a Korean HCI deliberation prototype. Return valid JSON only.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            task: 'Improve the labels/descriptions of these situated value concepts without using Schwartz jargon. Preserve concept ids and colors.',
            schema: {
              concepts: [
                {
                  id: 'same id',
                  label: 'short Korean label',
                  short: '1-3 syllable Korean map label',
                  description: 'one Korean sentence grounded in the debate context',
                  color: 'same color',
                  x: 'same number',
                  y: 'same number',
                },
              ],
              note: 'short note about why dynamic situated labels are preferable for deliberation',
            },
            current_concepts: data.concepts,
            evidence: compactEvidence(data),
          }),
        },
      ],
      max_output_tokens: 2200,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    return {
      mode: 'fallback',
      concepts: data.concepts,
      api_error: `OpenAI HTTP ${response.status}: ${errorText.slice(0, 300)}`,
    }
  }

  const json = await response.json()
  const text = extractResponseText(json)
  try {
    const parsed = JSON.parse(stripCodeFence(text))
    cachedConceptRefinement = parsed
    return parsed
  } catch {
    return {
      mode: 'fallback',
      concepts: data.concepts,
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

    if (req.method === 'POST' && url.pathname === '/api/refine-concepts') {
      sendJson(res, await refineConcepts())
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
  console.log(`Live Tension Constellation prototype: http://localhost:${PORT}`)
  console.log(`Model: ${MODEL}`)
})
