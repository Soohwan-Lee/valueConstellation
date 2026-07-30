const W = 920
const H = 600
const WINDOW = 16
const DECAY = 0.82
const NODE_NORM = 2.1 // energy value that maps to a "full size" node

const speakerColors = {
  개혁신당: '#ff9d4d',
  국민의힘: '#ff6b4d',
  민주당: '#58c4f0',
  정의당: '#ffd23f',
  조국혁신당: '#b58bff',
}

const stanceLabel = { support: '지지', constraint: '위협' }

const el = {
  stage: document.querySelector('#stage'),
  timeline: document.querySelector('#timeline'),
  clock: document.querySelector('#clock'),
  progress: document.querySelector('#progress'),
  playButton: document.querySelector('#playButton'),
  stepButton: document.querySelector('#stepButton'),
  resetButton: document.querySelector('#resetButton'),
  refineButton: document.querySelector('#refineButton'),
  speedControl: document.querySelector('#speedControl'),
  nowMeta: document.querySelector('#nowMeta'),
  nowText: document.querySelector('#nowText'),
  nowConcepts: document.querySelector('#nowConcepts'),
  inspectEmpty: document.querySelector('#inspectEmpty'),
  inspectBody: document.querySelector('#inspectBody'),
  spikeCard: document.querySelector('#spikeCard'),
  spikeEmpty: document.querySelector('#spikeEmpty'),
  spikeBody: document.querySelector('#spikeBody'),
  onboarding: document.querySelector('#onboarding'),
  onbStep: document.querySelector('#onbStep'),
  onbSkip: document.querySelector('#onbSkip'),
}

let state = {
  data: null,
  concepts: [],
  conceptById: new Map(),
  index: 0,
  playing: false,
  timer: null,
  interval: 520,
  conceptEnergy: {},
  speakerEnergy: {},
  tensionHistory: [],
  currentSpike: null,
  selectedConceptId: null,
  lastFlashIndex: -1,
}

const ONBOARDING = [
  {
    eyebrow: '이게 무엇인가요',
    title: '이 회의에서 실제로 부딪히는 <em>가치</em>의 지도예요',
    body: '국가 균형발전을 둘러싼 정당 토론을 분석했어요. "자유"·"안전" 같은 추상적인 가치 대신, <b>이 회의에서 실제로 작동한 8개의 구체적인 가치</b>(예: 지역 생존, 주민 결정권, 국가 조정력)를 추출해 성좌처럼 배치했습니다.',
  },
  {
    eyebrow: '어떻게 읽나요',
    title: '발화가 흐르면 가치가 <em>커지고 충돌</em>해요',
    body: '재생을 누르면 회의가 시간순으로 흘러갑니다. 어떤 가치가 거론되면 그 <b>원이 커지고</b>, 두 가치가 동시에 강하게 거론되면 <b>그 사이 선이 굵어집니다</b>. 아래 막대그래프는 충돌이 격해진 순간을 보여줘요.',
  },
  {
    eyebrow: '무엇을 해보세요',
    title: '원을 <em>클릭</em>해 가치를 들여다보세요',
    body: '성좌의 원을 클릭하면, 그 가치가 이 회의에서 무엇을 뜻하는지 · 주로 <b>지지됐는지 위협받았는지</b> · 어떤 실제 발화에서 나왔는지를 오른쪽에서 볼 수 있어요. 천천히 둘러봐도 됩니다.',
  },
]

init()

async function init() {
  const res = await fetch('/api/data')
  state.data = await res.json()
  state.concepts = state.data.concepts
  state.conceptById = new Map(state.concepts.map((concept) => [concept.id, concept]))
  resetState()
  render()
  bindEvents()
  maybeShowOnboarding()
}

/* ---------------- onboarding ---------------- */
function maybeShowOnboarding() {
  if (localStorage.getItem('vc_onboarded') === '1') return
  let step = 0
  el.onboarding.hidden = false
  const draw = () => {
    const s = ONBOARDING[step]
    const dots = ONBOARDING.map((_, i) => `<i class="${i === step ? 'on' : ''}"></i>`).join('')
    el.onbStep.innerHTML = `
      <div class="onb-eyebrow">${s.eyebrow}</div>
      <h2>${s.title}</h2>
      <p>${s.body}</p>
      <div class="onb-foot">
        <div class="onb-dots">${dots}</div>
        <button class="onb-next" id="onbNext">${step < ONBOARDING.length - 1 ? '다음' : '시작하기'}</button>
      </div>`
    document.querySelector('#onbNext').addEventListener('click', () => {
      if (step < ONBOARDING.length - 1) { step += 1; draw() }
      else closeOnboarding()
    })
  }
  draw()
  el.onbSkip.onclick = closeOnboarding
}

function closeOnboarding() {
  el.onboarding.hidden = true
  localStorage.setItem('vc_onboarded', '1')
}

/* ---------------- events ---------------- */
function bindEvents() {
  el.playButton.addEventListener('click', togglePlay)
  el.stepButton.addEventListener('click', () => step())
  el.resetButton.addEventListener('click', () => { pause(); resetState(); render() })
  el.refineButton.addEventListener('click', refineLabels)
  el.speedControl.querySelectorAll('[data-speed]').forEach((button) => {
    button.addEventListener('click', () => {
      state.interval = Number(button.dataset.speed)
      el.speedControl.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === button))
      if (state.playing) { pause(); play() }
    })
  })
}

function resetState() {
  state.index = 0
  state.conceptEnergy = Object.fromEntries(state.concepts.map((c) => [c.id, 0]))
  state.speakerEnergy = Object.fromEntries(state.data.speakers.map((sp) => [
    sp, Object.fromEntries(state.concepts.map((c) => [c.id, 0])),
  ]))
  state.tensionHistory = []
  state.currentSpike = null
  state.lastFlashIndex = -1
}

async function refineLabels() {
  el.refineButton.disabled = true
  const original = el.refineButton.textContent
  el.refineButton.textContent = '다듬는 중…'
  try {
    const res = await fetch('/api/refine-concepts', { method: 'POST' })
    const result = await res.json()
    if (Array.isArray(result.concepts) && result.concepts.length) {
      const byId = new Map(state.concepts.map((c) => [c.id, c]))
      state.concepts = result.concepts.map((c) => ({ ...byId.get(c.id), ...c }))
      state.conceptById = new Map(state.concepts.map((c) => [c.id, c]))
      render()
      if (state.selectedConceptId) showInspector(state.selectedConceptId)
    }
  } finally {
    el.refineButton.disabled = false
    el.refineButton.textContent = original
  }
}

function togglePlay() { state.playing ? pause() : play() }

function play() {
  if (state.index >= state.data.events.length) resetState()
  state.playing = true
  el.playButton.textContent = '❚❚ 일시정지'
  state.timer = setInterval(() => step(), state.interval)
}

function pause() {
  state.playing = false
  el.playButton.textContent = '▶ 재생'
  if (state.timer) clearInterval(state.timer)
}

function step() {
  if (state.index >= state.data.events.length) { pause(); return }
  const event = state.data.events[state.index]
  for (const c of state.concepts) state.conceptEnergy[c.id] *= DECAY
  for (const a of event.concepts) {
    state.conceptEnergy[a.id] += a.strength
    state.speakerEnergy[event.speaker][a.id] += a.strength
  }
  const spike = calculateTensionSpike(state.index)
  state.tensionHistory.push(spike)
  state.currentSpike = spike
  state.index += 1
  render()
}

function calculateTensionSpike(index) {
  const start = Math.max(0, index - WINDOW + 1)
  const windowEvents = state.data.events.slice(start, index + 1)
  const totals = Object.fromEntries(state.concepts.map((c) => [c.id, 0]))
  const speakersByConcept = Object.fromEntries(state.concepts.map((c) => [c.id, new Set()]))
  for (const ev of windowEvents) {
    for (const a of ev.concepts) {
      totals[a.id] += a.strength
      speakersByConcept[a.id].add(ev.speaker)
    }
  }
  let best = { pair: null, intensity: 0, event: state.data.events[index] }
  for (const pair of state.data.tension_pairs) {
    const a = totals[pair.a] ?? 0
    const b = totals[pair.b] ?? 0
    const diversity = new Set([...speakersByConcept[pair.a], ...speakersByConcept[pair.b]]).size
    const intensity = Math.min(1, Math.sqrt(a * b) / 2.8) * (1 + Math.min(0.28, diversity * 0.035))
    if (intensity > best.intensity) best = { pair, intensity, event: state.data.events[index] }
  }
  return best
}

/* ---------------- render ---------------- */
function render() {
  const current = state.data.events[Math.max(0, state.index - 1)] ?? state.data.events[0]
  el.clock.textContent = current?.time ?? '00:50'
  el.progress.textContent = `${state.index} / ${state.data.events.length}`
  renderStage(current)
  renderTimeline()
  renderCurrent(current)
  renderSpike()
}

function renderStage(current) {
  const edges = state.data.tension_pairs.map((pair) => {
    const a = state.conceptEnergy[pair.a] ?? 0
    const b = state.conceptEnergy[pair.b] ?? 0
    return { ...pair, energy: Math.min(1, Math.sqrt(a * b) / 2.4) }
  })

  const speakerPoints = state.data.speakers.map((speaker) => {
    const energies = state.speakerEnergy[speaker]
    const total = Object.values(energies).reduce((s, v) => s + v, 0)
    if (total < 0.15) return null
    const x = state.concepts.reduce((s, c) => s + c.x * W * energies[c.id], 0) / total
    const y = state.concepts.reduce((s, c) => s + c.y * H * energies[c.id], 0) / total
    return { speaker, x, y }
  }).filter(Boolean)

  const spikeIds = state.currentSpike?.pair && state.currentSpike.intensity > 0.4
    ? [state.currentSpike.pair.a, state.currentSpike.pair.b] : []

  el.stage.innerHTML = `
    <defs>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="7" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <g class="edges">${edges.map(edgeTemplate).join('')}</g>
    <g class="nodes">${state.concepts.map((c) => nodeTemplate(c, current, spikeIds)).join('')}</g>
    <g class="speakers">${speakerPoints.map(speakerTemplate).join('')}</g>
  `
  el.stage.querySelectorAll('.node-hit').forEach((node) => {
    node.addEventListener('click', () => {
      state.selectedConceptId = node.dataset.id
      showInspector(node.dataset.id)
      render()
    })
  })
}

function edgeTemplate(edge) {
  const a = state.conceptById.get(edge.a)
  const b = state.conceptById.get(edge.b)
  if (!a || !b) return ''
  const x1 = a.x * W, y1 = a.y * H, x2 = b.x * W, y2 = b.y * H
  const width = 1 + edge.energy * 11
  const opacity = 0.06 + edge.energy * 0.6
  const hot = edge.energy > 0.45
  const showLabel = edge.energy > 0.28
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
  return `
    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
      stroke="${hot ? '#ff6b4d' : '#5a7585'}" stroke-width="${width}" opacity="${opacity}" stroke-linecap="round"/>
    ${showLabel ? `<g opacity="${Math.min(1, opacity + 0.25)}">
      <rect x="${mx - 58}" y="${my - 19}" width="116" height="17" rx="8" fill="#0e1418" opacity="0.78"/>
      <text x="${mx}" y="${my - 7}" text-anchor="middle" font-size="10.5" font-weight="700" fill="${hot ? '#ff9d8a' : '#9fb3bf'}">${escapeHtml(edge.label)}</text>
    </g>` : ''}
  `
}

function nodeTemplate(concept, current, spikeIds) {
  const energy = Math.min(1, (state.conceptEnergy[concept.id] ?? 0) / NODE_NORM)
  const currentHit = current?.concepts?.some((i) => i.id === concept.id)
  const isSpike = spikeIds.includes(concept.id)
  const isSelected = state.selectedConceptId === concept.id
  const r = 26 + energy * 34
  const x = concept.x * W, y = concept.y * H
  const dim = state.selectedConceptId && !isSelected ? 0.42 : 1
  const baseFill = 0.4 + energy * 0.42
  return `
    <g class="node-hit" data-id="${concept.id}" opacity="${dim}">
      ${isSpike ? `<circle cx="${x}" cy="${y}" r="${r + 16}" fill="none" stroke="#ff6b4d" stroke-width="2" opacity="0.7">
        <animate attributeName="r" values="${r + 8};${r + 26}" dur="1.1s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.7;0" dur="1.1s" repeatCount="indefinite"/></circle>` : ''}
      <circle cx="${x}" cy="${y}" r="${r + 12}" fill="${concept.color}" opacity="${currentHit ? 0.22 : 0.08}" filter="url(#glow)"/>
      <circle class="node-ring" cx="${x}" cy="${y}" r="${r}" fill="${concept.color}"
        opacity="${baseFill}" stroke="${isSelected ? '#fff' : '#0e1418'}" stroke-width="${isSelected ? 3 : 2}"/>
      <text x="${x}" y="${y - 3}" text-anchor="middle" font-size="16" font-weight="800" fill="#fff" pointer-events="none">${escapeHtml(concept.short ?? concept.label)}</text>
      <text x="${x}" y="${y + 14}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#fff" opacity="0.82" pointer-events="none">${escapeHtml(concept.label)}</text>
    </g>
  `
}

function speakerTemplate(point) {
  const color = speakerColors[point.speaker] ?? '#9fb3bf'
  return `
    <g pointer-events="none">
      <circle cx="${point.x}" cy="${point.y}" r="6.5" fill="${color}" stroke="#0e1418" stroke-width="2"/>
      <text x="${point.x}" y="${point.y - 11}" text-anchor="middle" font-size="11" font-weight="800"
        fill="${color}" stroke="#0e1418" stroke-width="3.5" paint-order="stroke">${escapeHtml(point.speaker)}</text>
    </g>
  `
}

function renderTimeline() {
  const history = state.tensionHistory
  const total = state.data.events.length
  const bars = Array.from({ length: total }, (_, i) => {
    const item = history[i]
    const height = item ? 6 + item.intensity * 42 : 4
    const active = i === state.index - 1
    const played = i < state.index
    const spike = item && item.intensity > 0.45
    return `<button class="tick ${played ? 'played' : ''} ${spike ? 'spike' : ''} ${active ? 'active' : ''}"
      style="height:${height}px" data-index="${i}" title="${item?.pair?.label ?? ''}"></button>`
  }).join('')
  el.timeline.innerHTML = bars
  el.timeline.querySelectorAll('[data-index]').forEach((tick) => {
    tick.addEventListener('click', () => { rebuildUntil(Number(tick.dataset.index) + 1); render() })
  })
}

function rebuildUntil(targetIndex) {
  pause()
  resetState()
  for (let i = 0; i < targetIndex; i += 1) {
    const event = state.data.events[i]
    for (const c of state.concepts) state.conceptEnergy[c.id] *= DECAY
    for (const a of event.concepts) {
      state.conceptEnergy[a.id] += a.strength
      state.speakerEnergy[event.speaker][a.id] += a.strength
    }
    const spike = calculateTensionSpike(i)
    state.tensionHistory.push(spike)
    state.currentSpike = spike
  }
  state.index = targetIndex
}

function renderCurrent(current) {
  el.nowMeta.innerHTML = `
    <span class="pill party" style="color:${speakerColors[current.speaker] ?? '#aebdc7'}">${escapeHtml(current.speaker)}</span>
    <span class="pill">${escapeHtml(current.time)}</span>
  `
  el.nowText.textContent = current.korean_text
  el.nowConcepts.innerHTML = current.concepts.map((item) => {
    const concept = state.conceptById.get(item.id)
    return `<span class="chip" style="--c:${concept?.color ?? '#888'}">${escapeHtml(concept?.label ?? item.id)}</span>`
  }).join('')
}

function showInspector(conceptId) {
  const concept = state.conceptById.get(conceptId)
  if (!concept) return
  el.inspectEmpty.hidden = true
  el.inspectBody.hidden = false

  const support = concept.support ?? 0
  const constraint = concept.constraint ?? 0
  const total = support + constraint || 1
  const supPct = Math.round((support / total) * 100)
  const conPct = 100 - supPct
  const ev = concept.evidence
  const speakers = (concept.top_speakers ?? []).map((s) => `${s.speaker}(${s.count})`).join(' · ')

  el.inspectBody.innerHTML = `
    <div class="inspect-head">
      <span class="inspect-swatch" style="background:${concept.color}"></span>
      <span class="inspect-name">${escapeHtml(concept.label)}</span>
    </div>
    <div class="inspect-schwartz">바탕이 된 추상 가치: <b>${escapeHtml(concept.schwartz ?? '—')}</b></div>
    <p class="inspect-desc">${escapeHtml(concept.description ?? '')}</p>

    <div class="orient-bar">
      ${supPct > 0 ? `<div class="seg support" style="width:${supPct}%">${supPct >= 16 ? `지지 ${supPct}%` : ''}</div>` : ''}
      ${conPct > 0 ? `<div class="seg constraint" style="width:${conPct}%">${conPct >= 16 ? `위협 ${conPct}%` : ''}</div>` : ''}
    </div>
    <div class="orient-legend">
      <span>주로 지켜야 할 것으로 거론</span>
      <span>전체 ${concept.mentions ?? 0}회 거론</span>
    </div>

    ${ev ? `<div class="evidence">
      <div class="evidence-tag ${ev.stance}">${ev.stance === 'constraint' ? '위협으로 거론된 예' : '지지로 거론된 예'}</div>
      <p class="evidence-quote">${escapeHtml(ev.korean_text)}</p>
      <div class="evidence-src">${escapeHtml(ev.speaker)} · ${escapeHtml(ev.time)}${speakers ? ` · 자주 거론: ${escapeHtml(speakers)}` : ''}</div>
    </div>` : ''}
  `
}

function renderSpike() {
  const spike = state.currentSpike
  if (!spike?.pair || spike.intensity < 0.2) {
    el.spikeEmpty.hidden = false
    el.spikeBody.hidden = true
    return
  }
  el.spikeEmpty.hidden = true
  el.spikeBody.hidden = false

  // flash the card when a brand-new strong spike appears
  if (spike.intensity > 0.5 && state.index - 1 !== state.lastFlashIndex) {
    state.lastFlashIndex = state.index - 1
    el.spikeCard.classList.add('flash')
    setTimeout(() => el.spikeCard.classList.remove('flash'), 600)
  }

  const a = state.conceptById.get(spike.pair.a)
  const b = state.conceptById.get(spike.pair.b)
  el.spikeBody.innerHTML = `
    <div class="spike-title">${escapeHtml(a?.label ?? spike.pair.a)} <span class="vs">⚡</span> ${escapeHtml(b?.label ?? spike.pair.b)}</div>
    <div class="spike-meter"><span style="width:${Math.round(spike.intensity * 100)}%"></span></div>
    <p class="spike-bridge"><span class="bridge-tag">진행자가 던질 다리 질문</span>${escapeHtml(spike.pair.bridge)}</p>
    <div class="spike-src">방금: ${escapeHtml(spike.event.speaker)} · ${escapeHtml(spike.event.time)}<br>${escapeHtml(truncate(spike.event.korean_text, 70))}</div>
  `
}

function truncate(text, n) {
  return text.length > n ? `${text.slice(0, n)}…` : text
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;')
}
