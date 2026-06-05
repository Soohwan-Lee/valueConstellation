import { createReadStream, existsSync, readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const REPO_ROOT = resolve(__dirname, '..', '..')
const PUBLIC_DIR = join(__dirname, 'public')
const RESULTS_DIR = join(REPO_ROOT, 'results', 'policy_discussion')
const PERSONAL_ENV = '/Users/soohwanlee/Desktop/soohwan/80 ORGANIZE/82 Tool/.env'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
}

const CONCEPTS = [
  {
    id: 'regional_survival',
    label: '지역 생존',
    description: '"이대로면 지역이 사라진다"는 위기 감각. 인구 감소와 국가 존립 기반에 대한 절박함.',
    color: '#e2603f',
  },
  {
    id: 'resident_agency',
    label: '주민 결정권',
    description: '"우리 동네 일은 우리가 정한다." 주민투표·지방자치·분권, 아래로부터의 선택권.',
    color: '#1f9d76',
  },
  {
    id: 'national_coordination',
    label: '국가 조정력',
    description: '"국가가 큰 그림을 잡아야 한다." 중앙 컨트롤타워, 행정통합, 국가 단위 구조 개편.',
    color: '#3f7fd6',
  },
  {
    id: 'procedural_legitimacy',
    label: '절차 정당성',
    description: '"제대로 된 절차를 밟았는가." 헌법·법적 근거·주민 동의·위헌 논란.',
    color: '#9b6fc4',
  },
  {
    id: 'reform_momentum',
    label: '변화 실행력',
    description: '"이미 시작됐으니 밀어붙이자." 재도약·신속한 개혁·정책 추진 속도.',
    color: '#f0962f',
  },
  {
    id: 'resource_distribution',
    label: '재정과 배분',
    description: '"돈을 어디에 쏟을 것인가." 재정 지원·특별법·거점 투자·수도권 집중.',
    color: '#d9b526',
  },
  {
    id: 'basic_rights',
    label: '전국 기본권',
    description: '"어디 살든 최소한은 보장돼야." 의료·노동권·공공성·차별 없는 보장.',
    color: '#2bb3a3',
  },
  {
    id: 'livelihood_safety',
    label: '민생 안전',
    description: '"당장 먹고사는 일이 위태롭다." 전쟁·유가·고용·사고 등 일상 안정성 압박.',
    color: '#c2455e',
  },
]

const TENSION_PAIRS = [
  {
    id: 'agency_coordination',
    a: 'resident_agency',
    b: 'national_coordination',
    label: '주민 결정권 ↔ 국가 조정력',
    question: '국가 조정이 필요하다면, 주민 결정권을 침해하지 않기 위해 어떤 절차적 안전장치가 먼저 필요할까요?',
  },
  {
    id: 'procedure_momentum',
    a: 'procedural_legitimacy',
    b: 'reform_momentum',
    label: '절차 정당성 ↔ 변화 실행력',
    question: '속도를 유지하면서도 나중에 정당성 논란이 반복되지 않게 만드는 최소 절차는 무엇인가요?',
  },
  {
    id: 'rights_investment',
    a: 'basic_rights',
    b: 'resource_distribution',
    label: '전국 기본권 ↔ 거점 투자',
    question: '거점 집중 투자가 주변 지역의 기본권 보장을 약화시키지 않는다는 증거는 무엇으로 확인할 수 있나요?',
  },
  {
    id: 'crisis_agency',
    a: 'regional_survival',
    b: 'resident_agency',
    label: '생존 위기 ↔ 자기결정',
    question: '위기 진단과 주민 선택권을 동시에 인정한다면, 지금 당장 합의할 수 있는 한 가지 조건은 무엇인가요?',
  },
  {
    id: 'safety_reform',
    a: 'livelihood_safety',
    b: 'reform_momentum',
    label: '민생 안전 ↔ 구조 개혁',
    question: '개혁 추진 중에도 민생 안전이 흔들리지 않는다는 보완 조건은 무엇인가요?',
  },
]

const VALUE_TO_CONCEPT = {
  'Security: societal': [['regional_survival', 0.78], ['livelihood_safety', 0.58]],
  'Security: personal': [['livelihood_safety', 0.9]],
  'Self-direction: action': [['resident_agency', 1.0]],
  'Self-direction: thought': [['resident_agency', 0.62]],
  'Conformity: rules': [['procedural_legitimacy', 1.0]],
  Tradition: [['procedural_legitimacy', 0.44]],
  Stimulation: [['reform_momentum', 0.9]],
  Achievement: [['reform_momentum', 0.62]],
  'Power: resources': [['resource_distribution', 1.0]],
  'Power: dominance': [['national_coordination', 0.72], ['resource_distribution', 0.34]],
  'Universalism: concern': [['basic_rights', 1.0]],
  'Universalism: tolerance': [['basic_rights', 0.56]],
  'Benevolence: caring': [['basic_rights', 0.52], ['livelihood_safety', 0.4]],
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

const PORT = Number(process.env.PORT || 5180)
let cachedData = null

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
  let row = [], cell = '', inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i + 1]
    if (ch === '"' && inQuotes && next === '"') { cell += '"'; i++ }
    else if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === ',' && !inQuotes) { row.push(cell); cell = '' }
    else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i++
      row.push(cell)
      if (row.some(v => v.length > 0)) rows.push(row)
      row = []; cell = ''
    } else { cell += ch }
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row) }
  const headers = rows.shift().map(h => h.replace(/^﻿/, ''))
  return rows.map(vals => Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ''])))
}

function conceptActivations(text, activeValues) {
  const scores = Object.fromEntries(CONCEPTS.map(c => [c.id, 0]))
  for (const item of activeValues) {
    const mappings = VALUE_TO_CONCEPT[item.value] ?? []
    for (const [conceptId, weight] of mappings) {
      const d = item.stance === 'constraint' ? 0.82 : 1
      scores[conceptId] += item.strength * weight * d
    }
  }
  for (const [conceptId, pattern, boost] of KEYWORD_BOOSTS) {
    const matches = text.match(pattern)
    if (matches) scores[conceptId] += Math.min(0.48, matches.length * boost)
  }
  const maxScore = Math.max(...Object.values(scores), 1)
  return Object.fromEntries(Object.entries(scores).map(([id, score]) => [id, Math.min(1, score / maxScore)]))
}

function round(v) { return Math.round(v * 1000) / 1000 }

function dominantStance(event, conceptId) {
  let best = null, bestStrength = 0
  for (const item of event.active_values) {
    const mappings = VALUE_TO_CONCEPT[item.value] ?? []
    if (!mappings.some(([id]) => id === conceptId)) continue
    if (item.strength > bestStrength) { bestStrength = item.strength; best = item.stance }
  }
  return best === 'constraint' ? 'constraint' : 'support'
}

function loadData() {
  if (cachedData) return cachedData

  const activeRows = parseCsv(readFileSync(join(RESULTS_DIR, 'full_argument_active_values.csv'), 'utf8'))
  const activeByUnit = new Map()
  for (const row of activeRows) {
    const unit = activeByUnit.get(row.unit_id) ?? []
    unit.push({ value: row.value, stance: row.stance, strength: Number(row.strength || 0) })
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
      .filter(item => item.strength >= 0.12)
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 4)
    return {
      index,
      unit_id: row.unit_id,
      speaker: row.speaker,
      time: row.time,
      korean_text: row.korean_text,
      active_values: activeValues.map(item => ({
        value: item.value, stance: item.stance, strength: round(item.strength),
      })),
      concepts: topConcepts,
    }
  })

  // Detect collision events: moments where two tension-pair concepts fire together above threshold.
  // Strategy: slide a window across events, find peaks where both sides are active, then
  // deduplicate aggressively so each "chapter" of the debate produces at most one entry per pair.
  const collisions = []
  const ROLLING = 8       // look at an 8-event rolling window
  const THRESHOLD = 0.28  // only count meaningful concept activations
  const MIN_INTENSITY = 0.5  // only surface genuinely strong collisions
  const COOLDOWN = 18     // minimum events before the same pair can appear again

  for (let i = 0; i < events.length; i++) {
    const window = events.slice(Math.max(0, i - ROLLING + 1), i + 1)

    for (const pair of TENSION_PAIRS) {
      let strengthA = 0, strengthB = 0
      const evidenceA = [], evidenceB = []

      for (const ev of window) {
        const cA = ev.concepts.find(c => c.id === pair.a)
        const cB = ev.concepts.find(c => c.id === pair.b)
        if (cA && cA.strength > THRESHOLD) {
          if (cA.strength > strengthA) strengthA = cA.strength
          evidenceA.push({ ...ev, strength: cA.strength, stance: dominantStance(ev, pair.a) })
        }
        if (cB && cB.strength > THRESHOLD) {
          if (cB.strength > strengthB) strengthB = cB.strength
          evidenceB.push({ ...ev, strength: cB.strength, stance: dominantStance(ev, pair.b) })
        }
      }

      if (strengthA < THRESHOLD || strengthB < THRESHOLD) continue

      const intensity = round(Math.sqrt(strengthA * strengthB))
      if (intensity < MIN_INTENSITY) continue

      // Deduplicate: same pair must sit COOLDOWN events apart
      const lastForPair = collisions.filter(c => c.pair_id === pair.id).at(-1)
      if (lastForPair && i - lastForPair.event_index < COOLDOWN) continue

      // If there's an earlier collision for this pair with lower intensity within the cooldown,
      // replace it (keep the stronger moment)
      const quoteA = evidenceA.sort((a, b) => b.strength - a.strength)[0]
      const quoteB = evidenceB.sort((a, b) => b.strength - a.strength)[0]
      if (!quoteA || !quoteB) continue

      collisions.push({
        event_index: i,
        time: events[i].time,
        pair_id: pair.id,
        pair_label: pair.label,
        question: pair.question,
        intensity,
        side_a: {
          concept_id: pair.a,
          label: CONCEPTS.find(c => c.id === pair.a).label,
          color: CONCEPTS.find(c => c.id === pair.a).color,
          strength: round(strengthA),
          stance: quoteA.stance,
          speaker: quoteA.speaker,
          time: quoteA.time,
          korean_text: quoteA.korean_text,
        },
        side_b: {
          concept_id: pair.b,
          label: CONCEPTS.find(c => c.id === pair.b).label,
          color: CONCEPTS.find(c => c.id === pair.b).color,
          strength: round(strengthB),
          stance: quoteB.stance,
          speaker: quoteB.speaker,
          time: quoteB.time,
          korean_text: quoteB.korean_text,
        },
      })
    }
  }

  // Sort by time so the feed reads chronologically
  collisions.sort((a, b) => a.event_index - b.event_index)

  // Concept-level summary (mentions, support/constraint ratio, top quote)
  const conceptMap = Object.fromEntries(
    CONCEPTS.map(c => [c.id, { mentions: 0, support: 0, constraint: 0, topQuote: null, topStrength: 0, speakers: {} }])
  )
  for (const ev of events) {
    for (const act of ev.concepts) {
      const s = conceptMap[act.id]
      if (!s) continue
      s.mentions++
      s.speakers[ev.speaker] = (s.speakers[ev.speaker] ?? 0) + 1
      const stance = dominantStance(ev, act.id)
      if (stance === 'constraint') s.constraint++; else s.support++
      if (act.strength > s.topStrength) {
        s.topStrength = act.strength
        s.topQuote = { speaker: ev.speaker, time: ev.time, korean_text: ev.korean_text, stance }
      }
    }
  }
  const conceptStats = Object.fromEntries(
    Object.entries(conceptMap).map(([id, s]) => {
      const total = s.support + s.constraint || 1
      return [id, {
        mentions: s.mentions,
        support: s.support,
        constraint: s.constraint,
        orientation: round((s.support - s.constraint) / total),
        topQuote: s.topQuote,
        topSpeakers: Object.entries(s.speakers).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([sp, n]) => ({ speaker: sp, count: n })),
      }]
    })
  )

  cachedData = {
    concepts: CONCEPTS.map(c => ({ ...c, ...conceptStats[c.id] })),
    tension_pairs: TENSION_PAIRS,
    events,
    collisions,
    speakers: [...new Set(events.map(e => e.speaker))].sort(),
  }
  return cachedData
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
    if (req.method === 'GET' && url.pathname === '/favicon.ico') { res.writeHead(204); res.end(); return }
    if (req.method === 'GET' && url.pathname === '/api/data') { sendJson(res, loadData()); return }
    const requested = url.pathname === '/' ? '/index.html' : url.pathname
    const filePath = resolve(PUBLIC_DIR, `.${requested}`)
    if (filePath.startsWith(PUBLIC_DIR) && existsSync(filePath)) { serveFile(res, filePath); return }
    res.writeHead(404); res.end('Not found')
  } catch (err) {
    res.writeHead(500); res.end(JSON.stringify({ error: String(err?.message ?? err) }))
  }
})

server.listen(PORT, () => console.log(`Value Collision Story: http://localhost:${PORT}`))
