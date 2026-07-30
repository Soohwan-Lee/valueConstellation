const SPEAKER_COLORS = {
  '정의당': '#c2553a',
  '민주당': '#2f73d8',
  '개혁신당': '#c8881f',
  '국민의힘': '#b8455a',
  '조국혁신당': '#6d58c8',
}

const BLIND_TYPE = {
  'Buried Pole': { ko: '묻힌 극', cls: 'buried', glyph: '✦' },
  'Withheld Voice': { ko: '빠진 목소리', cls: 'withheld', glyph: '◌' },
  'Latent Axis': { ko: '잠재 축', cls: 'latent', glyph: '⌀' },
}

const LEVEL_LABELS = {
  L1: '표시',
  L2: '질문',
  L3: 'AI 발언',
  L4: '재표현',
}

const STEPS = [
  { n: 1, ko: '읽기', en: 'Read', desc: '지금 우리 논의가 어떻게 모였나요? 합의 무게중심(가운데 흐릿한 덩어리)이 어느 쪽으로 쏠렸는지 먼저 보세요. 아직 AI는 말하지 않습니다.' },
  { n: 2, ko: '발견', en: 'Notice', desc: '어떤 가치극이 묻혔나요? ✦ 표시된 묻힌 극과 근거 발화를 보세요. 왼쪽 Blind spots에서 묻힌 극(✦)·빠진 목소리(◌)·잠재 축(⌀)을 클릭해 살펴봅니다.' },
  { n: 3, ko: '질문', en: 'Ask', desc: 'AI에게 무엇을 물을지 그룹이 먼저 정합니다. 제안된 질문을 고르거나 직접 쓰세요. 이 단계를 지나야 AI 개입이 열립니다 (AI가 분석에서 곧장 권고로 넘어가지 않게).' },
  { n: 4, ko: '개입', en: 'Intervene', desc: 'AI가 소수가 말할 자리를 엽니다. 표시→질문→what-if→재표현 중 개입 수준을 고르세요. AI는 소수를 대신 말하지 않습니다 — 모든 출력은 contestable합니다.' },
  { n: 5, ko: '처리', en: 'Decide', desc: '이 묻힌 극을 어떻게 처리할지 기록합니다. 탐색·이월·의도적 제외·Contest. 표시하고 끝내지 않습니다 — 처리해야 결정 기록에 남습니다.' },
]

const el = {
  windowChip: q('#windowChip'),
  modeBadge: q('#modeBadge'),
  generateButton: q('#generateButton'),
  fallbackButton: q('#fallbackButton'),
  checkinTitle: q('#checkinTitle'),
  synthesisNote: q('#synthesisNote'),
  axisList: q('#axisList'),
  blindSpotList: q('#blindSpotList'),
  xSelect: q('#xSelect'),
  ySelect: q('#ySelect'),
  plane: q('#plane'),
  planeLayer: q('#planeLayer'),
  tensionLayer: q('#tensionLayer'),
  minorityRegion: q('#minorityRegion'),
  axisXLeft: q('#axisXLeft'),
  axisXRight: q('#axisXRight'),
  axisYTop: q('#axisYTop'),
  axisYBottom: q('#axisYBottom'),
  whatifPole: q('#whatifPole'),
  whatifBody: q('#whatifBody'),
  levelTabs: q('#levelTabs'),
  levelDescription: q('#levelDescription'),
  interventionSection: q('.intervention'),
  interventionBadge: q('#interventionBadge'),
  supportTarget: q('#supportTarget'),
  interventionTitle: q('#interventionTitle'),
  interventionText: q('#interventionText'),
  interventionDelivery: q('#interventionDelivery'),
  scaffoldNote: q('#scaffoldNote'),
  revoiceControls: q('#revoiceControls'),
  contestButton: q('#contestButton'),
  // stepper
  stepper: q('#stepper'),
  stepGuideNum: q('#stepGuideNum'),
  stepGuideTitle: q('#stepGuideTitle'),
  stepGuideDesc: q('#stepGuideDesc'),
  stepPrev: q('#stepPrev'),
  stepNext: q('#stepNext'),
  // joint prompt
  jpSuggestions: q('#jpSuggestions'),
  jpInput: q('#jpInput'),
  jpSet: q('#jpSet'),
  jpChosen: q('#jpChosen'),
  // uptake
  uptakeStatus: q('#uptakeStatus'),
  scrim: q('#scrim'),
  detailPanel: q('#detailPanel'),
  detailKicker: q('#detailKicker'),
  detailTitle: q('#detailTitle'),
  detailSub: q('#detailSub'),
  detailClose: q('#detailClose'),
  detailScroll: q('#detailScroll'),
}

const state = {
  transcript: null,
  checkin: null,
  xAxisId: null,
  yAxisId: null,
  selectedBlindSpotId: null,
  selected: { type: 'overview', id: null },
  level: 'L1',
  decisions: [],
  contested: new Set(),
  panelOpen: false,
  // check-in flow
  step: 1,
  jointPrompt: null,
  uptake: {}, // blindSpotId -> decision label
}

init()

async function init() {
  const [transcriptRes, checkinRes] = await Promise.all([
    fetch('/api/transcript'),
    fetch('/api/fallback'),
  ])
  state.transcript = await transcriptRes.json()
  state.checkin = await checkinRes.json()
  seed()
  bindEvents()
  renderAll()
}

function seed() {
  const axes = state.checkin.axes ?? []
  state.xAxisId = axes[0]?.id ?? null
  state.yAxisId = axes[1]?.id ?? axes[0]?.id ?? null
  state.selectedBlindSpotId = state.checkin.blind_spots?.[0]?.id ?? null
  state.level = state.checkin.intervention_levels?.[0]?.key ?? 'L1'
  state.selected = { type: 'overview', id: null }
  state.step = 1
  state.jointPrompt = null
  state.uptake = {}
  state.decisions = []
  state.contested = new Set()
}

function bindEvents() {
  el.generateButton.addEventListener('click', generateCheckin)
  el.fallbackButton.addEventListener('click', loadFallback)
  el.xSelect.addEventListener('change', () => { state.xAxisId = el.xSelect.value; renderStage() })
  el.ySelect.addEventListener('change', () => { state.yAxisId = el.ySelect.value; renderStage() })
  el.detailClose.addEventListener('click', closePanel)
  el.scrim.addEventListener('click', closePanel)
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePanel() })
  document.querySelectorAll('[data-decision]').forEach((b) => {
    b.addEventListener('click', () => recordDecision(b.dataset.decision))
  })
  el.contestButton.addEventListener('click', () => recordDecision('Contest'))
  // stepper
  el.stepPrev.addEventListener('click', () => goStep(state.step - 1))
  el.stepNext.addEventListener('click', () => goStep(state.step + 1))
  // joint prompt
  el.jpSet.addEventListener('click', () => setJointPrompt(el.jpInput.value.trim()))
  el.jpInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') setJointPrompt(el.jpInput.value.trim()) })
  // re-voice controls (scaffolding: original speaker owns it)
  el.revoiceControls.querySelectorAll('[data-revoice]').forEach((b) => {
    b.addEventListener('click', () => recordDecision(`재표현 ${b.dataset.revoice}`))
  })
}

async function generateCheckin() {
  el.generateButton.disabled = true
  el.generateButton.textContent = 'Generating…'
  el.modeBadge.textContent = 'running'
  try {
    const res = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force: true }),
    })
    state.checkin = await res.json()
    seed()
    renderAll()
  } finally {
    el.generateButton.disabled = false
    el.generateButton.textContent = 'Generate check-in'
  }
}

async function loadFallback() {
  const res = await fetch('/api/fallback')
  state.checkin = await res.json()
  seed()
  renderAll()
}

/* ─────────────── render orchestration ─────────────── */

function renderAll() {
  renderTopbar()
  renderSummary()
  renderAxisList()
  renderBlindList()
  renderAxisSelectors()
  renderStage()
  renderLevelTabs()
  renderIntervention()
  renderStepper()
  renderJointPrompt()
  renderUptake()
  applyStepVisibility()
}

function renderStage() {
  renderPlane()
  renderWhatIf()
}

function renderTopbar() {
  const w = state.transcript.window
  el.windowChip.innerHTML = `<b>window</b> ${escapeHtml(w.start)}–${escapeHtml(w.end)} · ${state.transcript.selected_utterances} utt`
  const isFallback = state.checkin.mode === 'fallback'
  el.modeBadge.textContent = isFallback ? 'cached' : 'llm'
  el.modeBadge.classList.toggle('live', !isFallback)
}

function renderSummary() {
  el.checkinTitle.textContent = state.checkin.checkin_title ?? 'Check-in'
  el.synthesisNote.textContent = state.checkin.synthesis_note ?? ''
}

function renderAxisList() {
  const axes = state.checkin.axes ?? []
  el.axisList.innerHTML = axes.map((axis, i) => {
    const active = axis.id === state.xAxisId || axis.id === state.yAxisId
    const role = axis.id === state.xAxisId ? 'X축' : axis.id === state.yAxisId ? 'Y축' : `Axis ${i + 1}`
    const hasConf = typeof axis.confidence === 'number'
    return `
      <button class="axis-card ${active ? 'active' : ''}" data-axis-id="${escapeAttr(axis.id)}" type="button">
        <span class="rank-row">
          <span class="rank">${escapeHtml(role)}</span>
          <span class="imp">${Math.round(clamp01(axis.importance) * 100)}%${hasConf ? `<span class="tentative">conf ${Math.round(clamp01(axis.confidence) * 100)}</span>` : ''}</span>
        </span>
        <span class="poles">${escapeHtml(axis.left_pole)}<em>↔</em>${escapeHtml(axis.right_pole)}</span>
        <span class="minority-tag">${escapeHtml(axis.minority_pole ?? '확인 필요')}</span>
        <span class="axis-meter"><span style="width:${clamp01(axis.importance) * 100}%"></span></span>
      </button>
    `
  }).join('')
  el.axisList.querySelectorAll('[data-axis-id]').forEach((b) => {
    b.addEventListener('click', () => openPanel({ type: 'axis', id: b.dataset.axisId }))
  })
}

function renderBlindList() {
  const spots = state.checkin.blind_spots ?? []
  el.blindSpotList.innerHTML = spots.map((spot) => {
    const meta = BLIND_TYPE[spot.type] ?? { ko: spot.type, cls: 'buried', glyph: '✦' }
    const active = spot.id === state.selectedBlindSpotId
    return `
      <button class="blind-card t-${meta.cls} ${active ? 'active' : ''}" data-blind-id="${escapeAttr(spot.id)}" type="button">
        <span class="blind-head">
          <span class="blind-type">${escapeHtml(meta.ko)}</span>
          <span class="sev">sev ${Math.round(clamp01(spot.severity) * 100)}</span>
        </span>
        <span class="blind-pole">${escapeHtml(spot.pole)}</span>
        <span class="blind-diag">${escapeHtml(spot.diagnosis)}</span>
      </button>
    `
  }).join('') || '<p class="empty">blind spot이 아직 없습니다.</p>'
  el.blindSpotList.querySelectorAll('[data-blind-id]').forEach((b) => {
    b.addEventListener('click', () => selectBlind(b.dataset.blindId, true))
  })
}

function renderAxisSelectors() {
  const axes = state.checkin.axes ?? []
  const opts = (selected) => axes.map((axis) =>
    `<option value="${escapeAttr(axis.id)}" ${axis.id === selected ? 'selected' : ''}>${escapeHtml(axis.left_pole)} ↔ ${escapeHtml(axis.right_pole)}</option>`
  ).join('')
  el.xSelect.innerHTML = opts(state.xAxisId)
  el.ySelect.innerHTML = opts(state.yAxisId)
}

/* ─────────────── the plane ─────────────── */

function renderPlane() {
  const xAxis = axisById(state.xAxisId) ?? (state.checkin.axes ?? [])[0] ?? {}
  const yAxis = axisById(state.yAxisId) ?? (state.checkin.axes ?? [])[1] ?? xAxis

  // axis end labels: mark the minority pole end
  setAxisEnd(el.axisXLeft, xAxis.left_pole, '◀', isMinorityPole(xAxis, xAxis.left_pole))
  setAxisEnd(el.axisXRight, xAxis.right_pole, '▶', isMinorityPole(xAxis, xAxis.right_pole))
  setAxisEnd(el.axisYTop, yAxis.right_pole, '▲', isMinorityPole(yAxis, yAxis.right_pole))
  setAxisEnd(el.axisYBottom, yAxis.left_pole, '▼', isMinorityPole(yAxis, yAxis.left_pole))

  const participants = state.checkin.participants ?? []
  const utterances = state.checkin.utterance_points ?? []

  // project every node onto the chosen axis pair
  const pXY = (node) => ({ x: axisCoord(node, xAxis), y: axisCoord(node, yAxis) })

  // majority centroid = mean of participants (the consensus mass)
  const cx = mean(participants.map((p) => axisCoord(p, xAxis)))
  const cy = mean(participants.map((p) => axisCoord(p, yAxis)))

  // minority-region wash: toward the minority pole corner of x and y
  const mx = isMinorityPole(xAxis, xAxis.right_pole) ? '85%' : '15%'
  const my = isMinorityPole(yAxis, yAxis.right_pole) ? '15%' : '85%'
  el.minorityRegion.style.setProperty('--mx', mx)
  el.minorityRegion.style.setProperty('--my', my)

  renderTensionLines(pXY)

  const parts = []

  // centroid mass
  parts.push(`
    <div class="node centroid" style="${pos(cx, cy)}">
      <span class="centroid-label">합의 무게중심</span>
    </div>
  `)

  // person spread halos + nodes
  for (const p of participants) {
    const { x, y } = pXY(p)
    const color = speakerColor(p.speaker)
    const spreadPx = Math.max(110, (Number(p.radius) || 0.2) * 360)
    parts.push(`
      <div class="node spread" style="${pos(x, y)} width:${spreadPx}px; height:${spreadPx}px; --speaker:${color}"></div>
    `)
  }
  for (const p of participants) {
    const { x, y } = pXY(p)
    const color = speakerColor(p.speaker)
    const active = isPersonHighlighted(p.speaker)
    const r = Math.max(56, (Number(p.radius) || 0.2) * 190)
    parts.push(`
      <button class="node person ${active ? 'active' : ''}" type="button"
        data-person="${escapeAttr(p.speaker)}"
        style="${pos(x, y)} --speaker:${color}; --r:${r}px">
        <span class="pname">${escapeHtml(p.speaker)}</span>
        <span class="porient">${escapeHtml((p.value_orientation ?? []).slice(0, 2).join(' · '))}</span>
      </button>
    `)
  }

  // utterance dots
  utterances.forEach((u) => {
    const { x, y } = pXY(u)
    const color = speakerColor(u.speaker)
    const active = isEvidenceHighlighted(u.id)
    parts.push(`
      <button class="node utterance ${active ? 'active' : ''}" type="button"
        data-evidence="${escapeAttr(u.id)}"
        title="${escapeAttr(`${u.speaker} ${u.time}`)}"
        style="${pos(x, y)} --speaker:${color}"></button>
    `)
  })

  // blind markers (3 types, placed at the buried pole / person / latent edge)
  ;(state.checkin.blind_spots ?? []).forEach((spot, i) => {
    const meta = BLIND_TYPE[spot.type] ?? { ko: spot.type, cls: 'buried', glyph: '✦' }
    const c = blindCoords(spot, i, xAxis, yAxis, pXY)
    const active = spot.id === state.selectedBlindSpotId
    parts.push(`
      <button class="node blind-marker m-${meta.cls} ${active ? 'active' : ''}" type="button"
        data-blind="${escapeAttr(spot.id)}"
        style="${pos(c.x, c.y)}">
        <span class="glyph">${meta.glyph}</span>${escapeHtml(spot.pole)}
      </button>
    `)
  })

  // tension chips at midpoints
  ;(state.checkin.tensions ?? []).forEach((t) => {
    const a = participantByName(t.participant_a)
    const b = participantByName(t.participant_b)
    if (!a || !b) return
    const pa = pXY(a)
    const pb = pXY(b)
    const active = isSelected('tension', t.id)
    parts.push(`
      <button class="node tension-chip ${active ? 'active' : ''}" type="button"
        data-tension="${escapeAttr(t.id)}"
        style="${pos((pa.x + pb.x) / 2, (pa.y + pb.y) / 2)}">${escapeHtml(t.title)}</button>
    `)
  })

  el.planeLayer.innerHTML = parts.join('')
  el.planeLayer.querySelectorAll('[data-person]').forEach((b) =>
    b.addEventListener('click', () => openPanel({ type: 'participant', id: b.dataset.person })))
  el.planeLayer.querySelectorAll('[data-evidence]').forEach((b) =>
    b.addEventListener('click', () => openPanel({ type: 'evidence', id: b.dataset.evidence })))
  el.planeLayer.querySelectorAll('[data-blind]').forEach((b) =>
    b.addEventListener('click', () => selectBlind(b.dataset.blind, true)))
  el.planeLayer.querySelectorAll('[data-tension]').forEach((b) =>
    b.addEventListener('click', () => selectTension(b.dataset.tension)))
}

function renderTensionLines(pXY) {
  el.tensionLayer.innerHTML = (state.checkin.tensions ?? []).map((t) => {
    const a = participantByName(t.participant_a)
    const b = participantByName(t.participant_b)
    if (!a || !b) return ''
    const pa = pct(pXY(a))
    const pb = pct(pXY(b))
    const active = isSelected('tension', t.id)
    return `<line class="${active ? 'active' : ''}" x1="${pa.x}%" y1="${pa.y}%" x2="${pb.x}%" y2="${pb.y}%" />`
  }).join('')
}

/* ─────────────── what-if ─────────────── */

function renderWhatIf() {
  const spot = blindSpotById(state.selectedBlindSpotId)
  el.whatifPole.textContent = spot?.pole ?? (state.checkin.blind_spots ?? [])[0]?.pole ?? '묻힌 극'
  el.whatifBody.textContent = state.checkin.what_if ?? ''
}

/* ─────────────── intervention ─────────────── */

function renderLevelTabs() {
  const levels = state.checkin.intervention_levels ?? defaultLevels()
  el.levelTabs.innerHTML = levels.map((lv) =>
    `<button class="level-tab ${lv.key === state.level ? 'active' : ''}" data-level="${escapeAttr(lv.key)}" type="button">${escapeHtml(lv.label ?? LEVEL_LABELS[lv.key] ?? lv.key)}</button>`
  ).join('')
  el.levelTabs.querySelectorAll('[data-level]').forEach((b) =>
    b.addEventListener('click', () => { state.level = b.dataset.level; renderIntervention() }))
}

function renderIntervention() {
  // gate: AI intervention is locked until the group authors a joint prompt (step 3)
  const gated = !state.jointPrompt
  el.interventionSection.classList.toggle('gated', gated)

  el.levelTabs.querySelectorAll('[data-level]').forEach((b) =>
    b.classList.toggle('active', b.dataset.level === state.level))
  const level = currentLevel()
  const it = state.checkin.interventions?.[state.level] ?? {}
  el.levelDescription.textContent = level?.explanation ?? ''
  el.interventionBadge.textContent = level?.label ?? LEVEL_LABELS[state.level] ?? state.level
  el.interventionTitle.textContent = it.title ?? 'Intervention'
  el.interventionText.textContent = it.text ?? ''
  el.interventionDelivery.textContent = it.delivery ?? ''

  // support target tag (minority vs group)
  const target = it.support_target ?? 'group'
  el.supportTarget.textContent = target === 'minority' ? '소수 당사자 지원' : '그룹 지원'
  el.supportTarget.className = `support-tag ${target === 'minority' ? 'minority' : 'group'}`

  // scaffold note — how the AI avoids speaking FOR the minority
  el.scaffoldNote.textContent = it.scaffold_note ?? ''
  el.scaffoldNote.hidden = !it.scaffold_note

  // re-voice controls only on L4 (original speaker owns it — fixes the AIMM failure)
  el.revoiceControls.hidden = state.level !== 'L4'
}

/* ─────────────── check-in flow (stepper, joint-prompt, uptake) ─────────────── */

function renderStepper() {
  el.stepper.innerHTML = STEPS.map((s) => {
    const cls = s.n === state.step ? 'active' : s.n < state.step ? 'done' : ''
    return `
      <button class="step ${cls}" data-step-n="${s.n}" type="button">
        <span class="step-num">${s.n}</span>
        <span class="step-meta">
          <span class="step-name">${escapeHtml(s.ko)}</span>
          <span class="step-en">${escapeHtml(s.en)}</span>
        </span>
      </button>
    `
  }).join('')
  el.stepper.querySelectorAll('[data-step-n]').forEach((b) =>
    b.addEventListener('click', () => goStep(Number(b.dataset.stepN))))

  const cur = STEPS.find((s) => s.n === state.step) ?? STEPS[0]
  el.stepGuideNum.textContent = cur.n
  el.stepGuideTitle.textContent = `${cur.n}. ${cur.ko} · ${cur.en}`
  el.stepGuideDesc.textContent = cur.desc
  el.stepPrev.disabled = state.step <= 1
  el.stepNext.disabled = state.step >= STEPS.length
}

function goStep(n) {
  state.step = Math.max(1, Math.min(STEPS.length, n))
  renderStepper()
  applyStepVisibility()
}

// dim/hide sections not belonging to the active step (keeps focus, kills overload)
function applyStepVisibility() {
  document.querySelectorAll('[data-step]').forEach((node) => {
    const steps = String(node.dataset.step).split(/\s+/).map(Number)
    const onThisStep = steps.includes(state.step)
    // plane (steps 1-2) stays visible always as the reference; others hide when not active
    const isPlane = node.classList.contains('plane-wrap')
    node.classList.toggle('step-inactive', !onThisStep && isPlane)
    node.classList.toggle('step-hidden', !onThisStep && !isPlane)
  })
}

function renderJointPrompt() {
  const suggestions = state.checkin.joint_prompt_suggestions ?? []
  el.jpSuggestions.innerHTML = suggestions.map((s) =>
    `<button class="jp-sugg ${state.jointPrompt === s ? 'chosen' : ''}" data-jp="${escapeAttr(s)}" type="button">${escapeHtml(s)}</button>`
  ).join('') || '<p class="empty">제안 질문이 없습니다. 직접 작성하세요.</p>'
  el.jpSuggestions.querySelectorAll('[data-jp]').forEach((b) =>
    b.addEventListener('click', () => setJointPrompt(b.dataset.jp)))

  if (state.jointPrompt) {
    el.jpChosen.hidden = false
    el.jpChosen.textContent = state.jointPrompt
  } else {
    el.jpChosen.hidden = true
  }
}

function setJointPrompt(text) {
  if (!text) return
  state.jointPrompt = text
  el.jpInput.value = ''
  renderJointPrompt()
  renderIntervention() // unlock the gate
  // advance to the intervention step so the unlocking is felt
  goStep(4)
}

function renderUptake() {
  const spots = state.checkin.blind_spots ?? []
  el.uptakeStatus.innerHTML = spots.map((spot) => {
    const meta = BLIND_TYPE[spot.type] ?? { glyph: '✦' }
    const decision = state.uptake[spot.id]
    const handled = !!decision
    return `
      <button class="uptake-row ${handled ? 'handled' : ''}" data-uptake="${escapeAttr(spot.id)}" type="button">
        <span class="u-glyph">${meta.glyph}</span>
        <span class="u-pole">${escapeHtml(spot.pole)}</span>
        <span class="u-decision ${handled ? '' : 'pending'}">${escapeHtml(decision ?? '미처리')}</span>
      </button>
    `
  }).join('') || '<p class="empty">묻힌 극이 없습니다.</p>'
  el.uptakeStatus.querySelectorAll('[data-uptake]').forEach((b) =>
    b.addEventListener('click', () => selectBlind(b.dataset.uptake, true)))
}

/* ─────────────── selection + slide panel ─────────────── */

function openPanel(selection) {
  state.selected = selection
  state.panelOpen = true
  el.detailPanel.classList.add('open')
  el.detailPanel.setAttribute('aria-hidden', 'false')
  el.scrim.classList.add('open')
  renderDetail()
  // reflect highlight on plane without rebuilding selectors
  renderPlane()
}

function closePanel() {
  state.panelOpen = false
  state.selected = { type: 'overview', id: null }
  el.detailPanel.classList.remove('open')
  el.detailPanel.setAttribute('aria-hidden', 'true')
  el.scrim.classList.remove('open')
  renderPlane()
}

function selectBlind(id, open) {
  const spot = blindSpotById(id)
  state.selectedBlindSpotId = id
  if (spot?.axis_id) {
    // bring the related axis onto an active map slot if not already shown
    if (spot.axis_id !== state.xAxisId && spot.axis_id !== state.yAxisId) {
      state.yAxisId = spot.axis_id
      renderAxisSelectors()
    }
  }
  renderAxisList()
  renderBlindList()
  renderWhatIf()
  if (open) openPanel({ type: 'blind', id })
  else renderPlane()
}

function selectTension(id) {
  const t = tensionById(id)
  if (t?.axis_id && t.axis_id !== state.xAxisId && t.axis_id !== state.yAxisId) {
    state.yAxisId = t.axis_id
    renderAxisSelectors()
    renderAxisList()
  }
  openPanel({ type: 'tension', id })
}

function renderDetail() {
  const s = state.selected
  if (s.type === 'participant') return detailParticipant(s.id)
  if (s.type === 'evidence') return detailEvidence(s.id)
  if (s.type === 'blind') return detailBlind(s.id)
  if (s.type === 'tension') return detailTension(s.id)
  if (s.type === 'axis') return detailAxis(s.id)
  return detailOverview()
}

function detailOverview() {
  setHeader('체크인', 'Check-in overview', '')
  const participants = state.checkin.participants ?? []
  el.detailScroll.innerHTML = `
    <p class="detail-lead">${escapeHtml(state.checkin.synthesis_note ?? '')}</p>
    <div class="mini-grid">${participants.map(miniSpeaker).join('')}</div>
    ${decisionTraceBlock()}
  `
  wireMini()
  wireTrace()
}

function detailParticipant(name) {
  const p = participantByName(name)
  if (!p) return detailOverview()
  setHeader('사람', p.speaker, '전체 발언 기반 가치 위치')
  el.detailScroll.innerHTML = `
    <p class="detail-lead">${escapeHtml(p.summary ?? '')}</p>
    <div class="tagrow">${(p.value_orientation ?? []).map((v) => `<span class="tag">${escapeHtml(v)}</span>`).join('')}</div>
    <div class="callout">
      <strong>지도에서 일어나는 일</strong>
      <span>이 사람의 발언 점과 연결된 tension 선이 강조됩니다. 옅은 영역은 발언이 여러 축으로 퍼진 정도입니다 — 한 사람을 한 가치로 환원하지 않습니다.</span>
    </div>
    ${evidenceBlock(p.evidence_ids ?? [])}
  `
  wireEvidence()
}

function detailEvidence(id) {
  const e = evidenceById(id)
  if (!e) return detailOverview()
  setHeader('발언', `${e.speaker}`, `${e.time} · ${e.id}`)
  el.detailScroll.innerHTML = `
    <blockquote class="detail-quote">${escapeHtml(e.text)}</blockquote>
    ${e.value_judgment ? `<p class="detail-lead">${escapeHtml(e.value_judgment)}</p>` : ''}
    <div class="callout">
      <strong>점의 의미</strong>
      <span>가치 판단이 든 발언만 점이 됩니다. 절차 안내·맞장구·사회자 발화는 점으로 잡지 않습니다.</span>
    </div>
  `
}

function detailBlind(id) {
  const spot = blindSpotById(id)
  if (!spot) return detailOverview()
  const meta = BLIND_TYPE[spot.type] ?? { ko: spot.type }
  const axis = axisById(spot.axis_id)
  setHeader(meta.ko, spot.pole, axis ? `${axis.left_pole} ↔ ${axis.right_pole}` : '')
  const typeNote = {
    'Buried Pole': '어떤 축의 한 극이 소수 한 사람에게만 의존하고, 다수는 반대 극에 합의해 있습니다.',
    'Withheld Voice': '이 사람이 체현할 가치극에 정작 그의 발화가 빠져 있습니다.',
    'Latent Axis': '쟁점이 될 만한 축인데 다수가 아직 전혀 띄우지 않았습니다.',
  }[spot.type] ?? ''
  el.detailScroll.innerHTML = `
    <p class="detail-lead">${escapeHtml(spot.diagnosis)}</p>
    <div class="metric"><span>severity</span><strong>${Math.round(clamp01(spot.severity) * 100)}</strong></div>
    <div class="callout warm">
      <strong>${escapeHtml(meta.ko)} — blind spot이란</strong>
      <span>${escapeHtml(typeNote)} 발화량이 적은 곳이 아니라, 다수 흐름에 밀려 결정 조건으로 재표현되지 못한 가치극입니다.</span>
    </div>
    ${evidenceBlock(spot.grounded_evidence_ids ?? [])}
  `
  wireEvidence()
}

function detailTension(id) {
  const t = tensionById(id)
  if (!t) return detailOverview()
  setHeader('긴장', t.title, `${t.participant_a} ↔ ${t.participant_b}`)
  el.detailScroll.innerHTML = `
    <p class="detail-lead">${escapeHtml(t.diagnosis)}</p>
    <div class="metric"><span>tension</span><strong>${Math.round(clamp01(t.severity) * 100)}</strong></div>
    <div class="callout">
      <strong>선의 의미</strong>
      <span>누가 맞는지 판정하지 않습니다. 같은 결정에서 동시에 만족시키기 어려운 가치 우선순위를 보여줍니다.</span>
    </div>
    ${evidenceBlock(t.evidence_ids ?? [])}
  `
  wireEvidence()
}

function detailAxis(id) {
  const axis = axisById(id)
  if (!axis) return detailOverview()
  setHeader('가치 축', `${axis.left_pole} ↔ ${axis.right_pole}`, `소수 가치극: ${axis.minority_pole ?? '확인 필요'}`)
  const alts = axis.label_alternatives ?? []
  el.detailScroll.innerHTML = `
    <p class="detail-lead">${escapeHtml(axis.why_it_matters ?? '')}</p>
    <div class="metric"><span>importance</span><strong>${Math.round(clamp01(axis.importance) * 100)}</strong></div>
    <div class="callout">
      <strong>이 라벨은 잠정적 해석입니다${typeof axis.confidence === 'number' ? ` · 확신 ${Math.round(clamp01(axis.confidence) * 100)}` : ''}</strong>
      <span>"…이다"가 아니라 "…로 읽힐 수 있다"입니다. 틀렸다면 Contest 하세요.${alts.length ? ' 대안 라벨: ' + alts.map((a) => `「${a}」`).join(', ') : ''}</span>
    </div>
    <div class="callout green">
      <strong>축은 언제 바뀌나</strong>
      <span>${escapeHtml(state.checkin.axis_change_note ?? '축은 Generate check-in 때만 다시 합성됩니다. 여기서 X/Y만 골라 보기를 바꿀 수 있습니다.')}</span>
    </div>
    <div class="tagrow">
      <button class="btn" data-set-x="${escapeAttr(axis.id)}" type="button">X축으로</button>
      <button class="btn" data-set-y="${escapeAttr(axis.id)}" type="button">Y축으로</button>
    </div>
    ${evidenceBlock(axis.evidence_ids ?? [])}
  `
  el.detailScroll.querySelector('[data-set-x]')?.addEventListener('click', () => {
    state.xAxisId = id; renderAxisSelectors(); renderAxisList(); renderStage()
  })
  el.detailScroll.querySelector('[data-set-y]')?.addEventListener('click', () => {
    state.yAxisId = id; renderAxisSelectors(); renderAxisList(); renderStage()
  })
  wireEvidence()
}

/* ─────────────── shared detail blocks ─────────────── */

function evidenceBlock(ids) {
  const items = (ids ?? []).map(evidenceById).filter(Boolean)
  if (items.length === 0) return ''
  return `
    <div>
      <div class="detail-sec-title"><span class="kicker">근거 발화</span></div>
      <div class="evidence-list">
        ${items.map((e, i) => `
          <button class="evidence-item ${isSelected('evidence', e.id) ? 'active' : ''}" data-evidence="${escapeAttr(e.id)}" type="button">
            <span class="eidx">${i + 1}</span>
            <span class="emeta">${escapeHtml(e.speaker)} · ${escapeHtml(e.time)} · ${escapeHtml(e.id)}</span>
            <span class="etext">${escapeHtml(shorten(e.text, 130))}</span>
            ${e.value_judgment ? `<span class="ejudge">${escapeHtml(e.value_judgment)}</span>` : ''}
          </button>
        `).join('')}
      </div>
    </div>
  `
}

function decisionTraceBlock() {
  return `
    <div>
      <div class="detail-sec-title"><span class="kicker">결정 기록</span></div>
      <div class="trace-list">
        ${state.decisions.slice(0, 8).map((d) => `
          <div class="trace-row">
            <span class="tlabel ${d.label === 'Contest' ? 'contest' : ''}">${escapeHtml(d.label)}</span>
            <strong>${escapeHtml(d.subject)}</strong>
            <time>${escapeHtml(d.time)}</time>
          </div>
        `).join('') || '<p class="empty">아직 기록된 판단이 없습니다.</p>'}
      </div>
    </div>
  `
}

function wireEvidence() {
  el.detailScroll.querySelectorAll('[data-evidence]').forEach((b) =>
    b.addEventListener('click', () => openPanel({ type: 'evidence', id: b.dataset.evidence })))
}

function wireMini() {
  el.detailScroll.querySelectorAll('[data-person]').forEach((b) =>
    b.addEventListener('click', () => openPanel({ type: 'participant', id: b.dataset.person })))
}

function wireTrace() { /* trace is read-only */ }

function miniSpeaker(p) {
  return `
    <button class="mini-speaker" data-person="${escapeAttr(p.speaker)}" type="button" style="--speaker:${speakerColor(p.speaker)}">
      <strong>${escapeHtml(p.speaker)}</strong>
      <span>${escapeHtml((p.value_orientation ?? []).slice(0, 2).join(' · '))}</span>
    </button>
  `
}

function setHeader(kicker, title, sub) {
  el.detailKicker.textContent = kicker
  el.detailTitle.textContent = title
  el.detailSub.textContent = sub ?? ''
}

/* ─────────────── decisions ─────────────── */

function recordDecision(label) {
  const it = state.checkin.interventions?.[state.level] ?? {}
  const subject = currentSubjectLabel()
  if (label === 'Contest' && state.selected.type) {
    state.contested.add(`${state.selected.type}:${state.selected.id}`)
  }
  // uptake: record how the currently-focused buried pole was handled (step 5)
  const spotId = state.selectedBlindSpotId
  if (spotId) state.uptake[spotId] = label
  state.decisions.unshift({
    label,
    level: currentLevel()?.label ?? state.level,
    subject,
    text: it.text ?? '',
    time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
  })
  renderUptake()
  // if panel shows overview, refresh trace
  if (state.selected.type === 'overview' && state.panelOpen) renderDetail()
}

/* ─────────────── projection helpers ─────────────── */

// Deterministic per-axis coordinate for a node. The data only ships base x/y
// (axes[0] × axes[1]); to make the axis selector re-arrange the plane we derive
// a stable score per node × axis. axes[0]→base x, axes[1]→base y, others→hashed.
function axisCoord(node, axis) {
  const axes = state.checkin.axes ?? []
  const idx = axes.findIndex((a) => a.id === axis?.id)
  const baseX = Number(node.x) || 0
  const baseY = Number(node.y) || 0
  if (idx === 0) return clampPos(baseX)
  if (idx === 1) return clampPos(baseY)
  // derive a reproducible position for axis 3+ from node identity + axis id
  const seed = hash(`${node.speaker ?? ''}|${node.id ?? ''}|${axis?.id ?? ''}`)
  const jitter = ((seed % 1000) / 1000) * 2 - 1 // -1..1
  // blend base magnitude so related nodes stay loosely clustered
  return clampPos(0.55 * jitter + 0.35 * baseX + 0.1 * baseY)
}

function clampPos(v) {
  return Math.max(-0.95, Math.min(0.95, v))
}

function isMinorityPole(axis, pole) {
  return !!axis && !!pole && axis.minority_pole === pole
}

function blindCoords(spot, i, xAxis, yAxis, pXY) {
  const axis = axisById(spot.axis_id)
  // Withheld → near the person who should embody it (use first grounded evidence speaker)
  if (spot.type === 'Withheld Voice') {
    const ev = (spot.grounded_evidence_ids ?? []).map(evidenceById).find(Boolean)
    const person = ev ? participantByName(ev.speaker) : null
    if (person) {
      const p = pXY(person)
      return { x: clampPos(p.x + 0.16), y: clampPos(p.y - 0.16) }
    }
  }
  // Buried → at the buried pole end of its axis (if that axis is on screen)
  if (spot.type === 'Buried Pole' && axis) {
    const onX = axis.id === xAxis.id
    const onY = axis.id === yAxis.id
    const minorityRight = isMinorityPole(axis, axis.right_pole)
    if (onX) return { x: minorityRight ? 0.86 : -0.86, y: -0.6 + i * 0.12 }
    if (onY) return { x: 0.6 - i * 0.12, y: minorityRight ? 0.86 : -0.86 }
  }
  // Latent → park on the right/bottom edge
  const edge = [
    { x: 0.82, y: 0.7 },
    { x: -0.8, y: 0.72 },
    { x: 0.8, y: -0.7 },
  ][i % 3]
  return edge
}

function pos(x, y) {
  const p = pct({ x, y })
  return `left:${p.x}%; top:${p.y}%;`
}

function pct({ x, y }) {
  return {
    x: ((Number(x) || 0) + 1) * 50,
    y: (1 - ((Number(y) || 0) + 1) / 2) * 100,
  }
}

function setAxisEnd(node, label, dir, minority) {
  node.innerHTML = `<span class="dir">${dir}</span>${escapeHtml(label ?? '')}`
  node.classList.toggle('minority-end', !!minority)
}

/* ─────────────── highlight predicates ─────────────── */

function isPersonHighlighted(name) {
  const s = state.selected
  if (s.type === 'participant') return s.id === name
  if (s.type === 'tension') {
    const t = tensionById(s.id)
    return t?.participant_a === name || t?.participant_b === name
  }
  if (s.type === 'evidence') return evidenceById(s.id)?.speaker === name
  return false
}

function isEvidenceHighlighted(id) {
  if (isSelected('evidence', id)) return true
  return evidenceIdsForSelection().includes(id)
}

function evidenceIdsForSelection() {
  const s = state.selected
  if (s.type === 'participant') return participantByName(s.id)?.evidence_ids ?? []
  if (s.type === 'evidence') return [s.id]
  if (s.type === 'blind') return blindSpotById(s.id)?.grounded_evidence_ids ?? []
  if (s.type === 'tension') return tensionById(s.id)?.evidence_ids ?? []
  if (s.type === 'axis') return axisById(s.id)?.evidence_ids ?? []
  return blindSpotById(state.selectedBlindSpotId)?.grounded_evidence_ids ?? []
}

function isSelected(type, id) {
  return state.selected.type === type && state.selected.id === id
}

function currentSubjectLabel() {
  const s = state.selected
  if (s.type === 'participant') return s.id
  if (s.type === 'evidence') return evidenceById(s.id)?.speaker ?? s.id
  if (s.type === 'blind') return blindSpotById(s.id)?.pole ?? s.id
  if (s.type === 'tension') return tensionById(s.id)?.title ?? s.id
  if (s.type === 'axis') return axisById(s.id)?.left_pole ?? s.id
  return blindSpotById(state.selectedBlindSpotId)?.pole ?? 'check-in'
}

function currentLevel() {
  return (state.checkin.intervention_levels ?? defaultLevels()).find((lv) => lv.key === state.level)
}

function defaultLevels() {
  return Object.entries(LEVEL_LABELS).map(([key, label]) => ({ key, label, explanation: '' }))
}

/* ─────────────── lookups ─────────────── */

function participantByName(name) {
  return (state.checkin.participants ?? []).find((p) => p.speaker === name)
}
function evidenceById(id) {
  return (state.checkin.utterance_points ?? []).find((u) => u.id === id)
    ?? (state.transcript?.utterances ?? []).find((u) => u.id === id)
}
function blindSpotById(id) {
  return (state.checkin.blind_spots ?? []).find((s) => s.id === id)
}
function tensionById(id) {
  return (state.checkin.tensions ?? []).find((t) => t.id === id)
}
function axisById(id) {
  return (state.checkin.axes ?? []).find((a) => a.id === id)
}

/* ─────────────── utils ─────────────── */

function q(sel) { return document.querySelector(sel) }
function mean(values) { return values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0 }
function clamp01(v) { return Math.max(0, Math.min(1, Number(v) || 0)) }
function shorten(v, n) { const t = String(v ?? ''); return t.length > n ? `${t.slice(0, n - 1)}…` : t }
function speakerColor(name) { return SPEAKER_COLORS[name] ?? '#6b7280' }

function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

function escapeHtml(v) {
  return String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
function escapeAttr(v) {
  return escapeHtml(v).replaceAll('`', '&#096;')
}
