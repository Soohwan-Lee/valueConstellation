const el = {
  tensionList: document.querySelector('#tensionList'),
  detailTitle: document.querySelector('#detailTitle'),
  modeBadge: document.querySelector('#modeBadge'),
  leftPole: document.querySelector('#leftPole'),
  rightPole: document.querySelector('#rightPole'),
  description: document.querySelector('#description'),
  evidenceList: document.querySelector('#evidenceList'),
  bridgePrompt: document.querySelector('#bridgePrompt'),
  riskText: document.querySelector('#riskText'),
  traceList: document.querySelector('#traceList'),
  datasetStats: document.querySelector('#datasetStats'),
  feasibility: document.querySelector('#feasibility'),
  speakerStats: document.querySelector('#speakerStats'),
  processMoves: document.querySelector('#processMoves'),
  generateButton: document.querySelector('#generateButton'),
  fallbackButton: document.querySelector('#fallbackButton'),
}

let state = {
  data: null,
  synthesis: null,
  selectedIndex: 0,
}

init()

async function init() {
  const res = await fetch('/api/data')
  state.data = await res.json()
  state.synthesis = state.data.fallback_tensions
  renderAll()
  bindEvents()
}

function bindEvents() {
  el.generateButton.addEventListener('click', generateTensions)
  el.fallbackButton.addEventListener('click', () => {
    state.synthesis = state.data.fallback_tensions
    state.selectedIndex = 0
    renderAll()
  })
}

async function generateTensions() {
  el.generateButton.disabled = true
  el.generateButton.textContent = 'Running'
  try {
    const res = await fetch('/api/tensions', { method: 'POST' })
    state.synthesis = await res.json()
    state.selectedIndex = 0
    renderAll()
  } finally {
    el.generateButton.disabled = false
    el.generateButton.textContent = 'Generate'
  }
}

function renderAll() {
  renderStats()
  renderTensions()
  renderSelected()
  renderProcess()
}

function renderStats() {
  const dataset = state.data.dataset
  el.datasetStats.innerHTML = [
    stat('Argument units', dataset.units),
    stat('Active units', dataset.active_units),
    stat('Evidence sent', dataset.selected_evidence_units),
    stat('Model', state.data.model),
  ].join('')

  const feasibility = state.synthesis.feasibility ?? {}
  el.feasibility.innerHTML = `
    ${errorBanner(state.synthesis)}
    <div class="budget-number">${escapeHtml(String(feasibility.llm_calls_per_session ?? 1))}</div>
    <div class="budget-label">synthesis call per review pass</div>
    <div class="feasibility-copy">${escapeHtml(feasibility.expensive_step ?? dataset.llm_strategy)}</div>
    <div class="cache-row">${(feasibility.cached_inputs ?? ['cached vectors', 'active-value rows']).map(tag).join('')}</div>
    <div class="feasibility-copy">${escapeHtml(feasibility.next_optimization ?? 'Regenerate only the edited tension card.')}</div>
  `

  el.speakerStats.innerHTML = state.data.speaker_stats.map((speaker) => `
    <div class="speaker-row">
      <span class="speaker-name">${escapeHtml(speaker.speaker)}</span>
      <span>${speaker.count}</span>
      <span>${speaker.top_values.slice(0, 2).map((item) => escapeHtml(item.value)).join(' · ')}</span>
    </div>
  `).join('')
}

function renderTensions() {
  const tensions = state.synthesis.tensions ?? []
  el.modeBadge.textContent = state.synthesis.mode === 'fallback' ? 'cached' : 'llm'
  el.tensionList.innerHTML = tensions.map((tension, index) => `
    <button class="tension-card ${index === state.selectedIndex ? 'active' : ''}" data-index="${index}">
      <span class="card-number">${String(index + 1).padStart(2, '0')}</span>
      <span class="card-title">${escapeHtml(tension.title)}</span>
      <span class="card-poles">${escapeHtml(tension.left_pole)} ↔ ${escapeHtml(tension.right_pole)}</span>
    </button>
  `).join('')

  el.tensionList.querySelectorAll('[data-index]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedIndex = Number(button.dataset.index)
      renderAll()
    })
  })
}

function renderSelected() {
  const tension = (state.synthesis.tensions ?? [])[state.selectedIndex]
  if (!tension) return

  el.detailTitle.textContent = tension.title
  el.leftPole.textContent = tension.left_pole
  el.rightPole.textContent = tension.right_pole
  el.description.textContent = tension.description
  el.bridgePrompt.textContent = tension.bridge_prompt
  el.riskText.textContent = tension.risk
  el.traceList.innerHTML = (tension.schwartz_trace ?? []).map(tag).join('')
  el.evidenceList.innerHTML = (tension.evidence ?? []).map(evidenceTemplate).join('')
}

function renderProcess() {
  el.processMoves.innerHTML = (state.synthesis.process_interventions ?? []).map((move) => `
    <li>${escapeHtml(move)}</li>
  `).join('')
}

function evidenceTemplate(item) {
  const values = (item.active_values ?? item.top_values ?? []).slice(0, 3)
  return `
    <article class="evidence-item">
      <div class="evidence-meta">
        <span>${escapeHtml(item.speaker ?? '')}</span>
        <span>${escapeHtml(item.time ?? '')}</span>
        <span>${escapeHtml(item.unit_id ?? '')}</span>
      </div>
      <p>${escapeHtml(item.korean_text ?? '')}</p>
      <div class="value-row">
        ${values.map((value) => tag(`${value.value}${value.stance ? ` ${value.stance}` : ''}${value.strength ? ` ${value.strength}` : ''}`)).join('')}
      </div>
    </article>
  `
}

function stat(label, value) {
  return `
    <div class="stat">
      <div class="stat-value">${escapeHtml(String(value))}</div>
      <div class="stat-label">${escapeHtml(label)}</div>
    </div>
  `
}

function tag(text) {
  return `<span class="tag">${escapeHtml(String(text))}</span>`
}

function errorBanner(result) {
  if (!result.api_error && !result.raw_model_text) return ''
  return `<div class="error-banner">${escapeHtml(result.api_error ?? 'Model output was not valid JSON; cached cards are shown.')}</div>`
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
