const W = 900
const H = 620
// PAD is the inner plot area inset. MARGIN is extra space OUTSIDE the plot frame,
// reserved purely for axis end-point labels so they never sit on top of data points.
const MARGIN = 86
const PAD = MARGIN

const speakerColors = {
  정의당: '#c59a24',
  민주당: '#2f66b3',
  개혁신당: '#d97434',
  국민의힘: '#c4473d',
  조국혁신당: '#7a5cab',
}

const clusterColors = ['#b9473e', '#cf7a35', '#18836c', '#7354a6', '#65716b', '#b89324']

// Korean labels for the 19 refined Schwartz values (mirror of server VALUE_LABELS).
const VALUE_LABELS = {
  self_direction_thought: '자기방향성: 사고',
  self_direction_action: '자기방향성: 행동',
  stimulation: '자극/변화',
  hedonism: '쾌락',
  achievement: '성취',
  power_dominance: '권력: 지배',
  power_resources: '권력: 자원',
  face: '체면',
  security_personal: '개인 안전',
  security_societal: '사회 안전',
  tradition: '전통',
  conformity_rules: '규칙 순응',
  conformity_interpersonal: '대인 순응',
  humility: '겸손',
  benevolence_caring: '배려',
  benevolence_dependability: '신뢰/책임',
  universalism_concern: '보편주의: 관심',
  universalism_nature: '보편주의: 자연',
  universalism_tolerance: '보편주의: 관용',
}

let state = {
  data: null,
  points: [],
  zones: [],
  virtualPoints: [],
  selectedSpeakers: new Set(),
  selectedClusters: new Set(),
  currentProbe: null,
  currentQuestion: null,
  currentZone: null,
  traces: [],
  tensionSelection: [],
  clusterCentroids: [],
}

const DECISION_META = {
  'Explore now': { label: 'Explore', tone: 'explore', meaning: '지금 회의에서 이 관점을 적극적으로 다룬다' },
  Defer: { label: 'Defer', tone: 'defer', meaning: '다음 회의/단계로 의도적으로 이월한다' },
  'Intentionally excluded': { label: 'Exclude', tone: 'exclude', meaning: '이번 범위에서 의도적으로 제외한다(기록은 남긴다)' },
}

const el = {
  map: document.querySelector('#map'),
  tooltip: document.querySelector('#tooltip'),
  axisLabel: document.querySelector('#axisLabel'),
  speakerLegend: document.querySelector('#speakerLegend'),
  clusterLegend: document.querySelector('#clusterLegend'),
  selectionSummary: document.querySelector('#selectionSummary'),
  questionOutput: document.querySelector('#questionOutput'),
  answerOutput: document.querySelector('#answerOutput'),
  answerQuestionButton: document.querySelector('#answerQuestionButton'),
  probeOutput: document.querySelector('#probeOutput'),
  emptyChairOutput: document.querySelector('#emptyChairOutput'),
  suggestStakeholdersButton: document.querySelector('#suggestStakeholdersButton'),
  decisionTrace: document.querySelector('#decisionTrace'),
  composeRationaleButton: document.querySelector('#composeRationaleButton'),
  rationaleOutput: document.querySelector('#rationaleOutput'),
  checkinButton: document.querySelector('#checkinButton'),
  referenceToggle: document.querySelector('#referenceToggle'),
  referenceModal: document.querySelector('#referenceModal'),
  referenceFrame: document.querySelector('#referenceFrame'),
  closeReference: document.querySelector('#closeReference'),
}

init()

async function init() {
  const res = await fetch('/api/data')
  state.data = await res.json()
  state.points = scalePoints(state.data.arguments)
  state.zones = findSparseZones(state.points)
  renderStaticLabels()
  renderMap()
  bindEvents()
  renderTraces()
}

function renderStaticLabels() {
  el.axisLabel.textContent = '축 끝점 라벨은 좌표 평면 바깥 여백(상·하·좌·우)에 배치되어 점과 겹치지 않습니다.'
  el.speakerLegend.innerHTML = state.data.speakers.map((speaker) => `
    <span class="speaker-chip active" data-speaker="${escapeHtml(speaker)}" title="${escapeHtml(speakerSummary(speaker))}">
      <span class="dot" style="background:${speakerColors[speaker] ?? '#68726c'}"></span>${speaker}
    </span>
  `).join('')

  el.clusterLegend.innerHTML = state.data.clusters.map((cluster) => `
    <span class="cluster-chip active" data-cluster="${cluster.cluster_id}" title="${escapeHtml(clusterDescription(cluster))}">
      <span class="dot" style="background:${clusterColor(cluster.cluster_id)}"></span>
      C${cluster.cluster_id} ${escapeHtml(cluster.label)}
    </span>
  `).join('')

  el.speakerLegend.querySelectorAll('[data-speaker]').forEach((chip) => {
    chip.addEventListener('click', () => toggleSpeaker(chip.dataset.speaker))
  })
  el.clusterLegend.querySelectorAll('[data-cluster]').forEach((chip) => {
    chip.addEventListener('click', () => toggleCluster(Number(chip.dataset.cluster)))
  })
  renderSelectionSummary()
}

function renderMap() {
  const clusters = state.data.clusters
  const xAxis = splitAxisLabel(state.data.axis.x)
  const yAxis = splitAxisLabel(state.data.axis.y)
  const clusterCentroids = clusters.map((cluster) => {
    const pts = state.points.filter((point) => point.argument.cluster_id === cluster.cluster_id)
    return {
      ...cluster,
      sx: mean(pts.map((point) => point.sx)),
      sy: mean(pts.map((point) => point.sy)),
    }
  })

  el.map.innerHTML = `
    <defs>
      <pattern id="paperGrid" width="28" height="28" patternUnits="userSpaceOnUse">
        <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#e3d9c9" stroke-width="1"/>
      </pattern>
    </defs>
    <rect x="${PAD}" y="${PAD}" width="${W - PAD * 2}" height="${H - PAD * 2}" rx="7" fill="#fffdf6" stroke="#d8d0c3"/>
    <rect x="${PAD}" y="${PAD}" width="${W - PAD * 2}" height="${H - PAD * 2}" rx="7" fill="url(#paperGrid)" opacity="0.45"/>
    <line x1="${PAD}" x2="${W - PAD}" y1="${H / 2}" y2="${H / 2}" stroke="#d7c9b8" stroke-dasharray="7 6"/>
    <line x1="${W / 2}" x2="${W / 2}" y1="${PAD}" y2="${H - PAD}" stroke="#d7c9b8" stroke-dasharray="7 6"/>
    ${axisEndLabel(PAD - 12, H / 2, 'X 왼쪽', xAxis.left, 'left')}
    ${axisEndLabel(W - PAD + 12, H / 2, 'X 오른쪽', xAxis.right, 'right')}
    ${axisEndLabel(W / 2, PAD - 14, 'Y 위', yAxis.top, 'top')}
    ${axisEndLabel(W / 2, H - PAD + 14, 'Y 아래', yAxis.bottom, 'bottom')}
    ${state.zones.map(zoneTemplate).join('')}
    ${tensionConnectorTemplate(clusterCentroids)}
    ${[...state.points, ...state.virtualPoints].map(pointTemplate).join('')}
    ${clusterCentroids.map(clusterTemplate).join('')}
  `

  state.clusterCentroids = clusterCentroids

  el.map.querySelectorAll('[data-point]').forEach((node) => {
    node.addEventListener('mousemove', showPointTooltip)
    node.addEventListener('mouseleave', hideTooltip)
  })
  el.map.querySelectorAll('[data-zone]').forEach((node) => {
    node.addEventListener('mousemove', showZoneTooltip)
    node.addEventListener('mouseleave', hideTooltip)
    node.addEventListener('click', () => probeSparseZone(Number(node.dataset.zone)))
  })
  el.map.querySelectorAll('[data-cluster-node]').forEach((node) => {
    node.addEventListener('mousemove', showClusterTooltip)
    node.addEventListener('mouseleave', hideTooltip)
    node.addEventListener('click', () => toggleTensionCluster(Number(node.dataset.clusterNode)))
  })
}

// Dashed connector drawn between the two clusters the user picked for a tension probe.
function tensionConnectorTemplate(centroids) {
  const sel = state.tensionSelection
  if (sel.length !== 2) return ''
  const a = centroids.find((c) => c.cluster_id === sel[0])
  const b = centroids.find((c) => c.cluster_id === sel[1])
  if (!a || !b || !Number.isFinite(a.sx) || !Number.isFinite(b.sx)) return ''
  return `<line x1="${a.sx}" y1="${a.sy}" x2="${b.sx}" y2="${b.sy}" stroke="#b9473e" stroke-width="2" stroke-dasharray="6 5" opacity="0.7"/>`
}

function pointTemplate(point) {
  const arg = point.argument
  const color = speakerColors[arg.speaker] ?? '#68726c'
  const dimmed = isPointDimmed(point)
  const opacity = dimmed ? 0.16 : 0.9
  const radius = dimmed ? 4.2 : 6
  if (arg.is_virtual) {
    const r = 8
    return `
      <polygon
        data-point="${escapeHtml(arg.unit_id)}"
        points="${point.sx},${point.sy - r} ${point.sx + r},${point.sy} ${point.sx},${point.sy + r} ${point.sx - r},${point.sy}"
        fill="#fffdf6"
        stroke="#1f8a70"
        stroke-width="2.4"
        stroke-dasharray="4 3"
        opacity="${opacity}"
      />
    `
  }
  return `
    <circle
      data-point="${escapeHtml(arg.unit_id)}"
      cx="${point.sx}"
      cy="${point.sy}"
      r="${radius}"
      fill="${color}"
      stroke="#fffaf0"
      stroke-width="${dimmed ? 0.8 : 1.8}"
      opacity="${opacity}"
    />
  `
}

function zoneTemplate(zone, index) {
  return `
    <g data-zone="${index}" class="sparse-zone">
      <circle cx="${zone.sx}" cy="${zone.sy}" r="${zone.radius}" fill="#1f8a70" opacity="0.045"/>
      <circle cx="${zone.sx}" cy="${zone.sy}" r="${zone.radius}" fill="none" stroke="#1f8a70" stroke-width="1.4" stroke-dasharray="5 6" opacity="0.68"/>
      <text x="${zone.sx}" y="${zone.sy - zone.radius - 8}" text-anchor="middle" font-size="11" font-weight="800" fill="#17624f">blind spot?</text>
    </g>
  `
}

function clusterTemplate(cluster) {
  if (!Number.isFinite(cluster.sx) || !Number.isFinite(cluster.sy)) return ''
  const selected = state.tensionSelection.includes(cluster.cluster_id)
  const order = state.tensionSelection.indexOf(cluster.cluster_id) + 1
  return `
    <g data-cluster-node="${cluster.cluster_id}" class="cluster-node" style="cursor:pointer">
      <circle cx="${cluster.sx}" cy="${cluster.sy}" r="15" fill="${selected ? '#b9473e' : '#1d2523'}" opacity="${selected ? 0.16 : 0.07}"/>
      ${selected ? `<circle cx="${cluster.sx}" cy="${cluster.sy}" r="15" fill="none" stroke="#b9473e" stroke-width="2"/>` : ''}
      <text
        x="${cluster.sx}"
        y="${cluster.sy}"
        text-anchor="middle"
        dominant-baseline="middle"
        font-size="13"
        font-weight="850"
        fill="${selected ? '#b9473e' : '#1d2523'}"
        stroke="#fffaf0"
        stroke-width="5"
        paint-order="stroke"
        opacity="0.85"
      >C${cluster.cluster_id}</text>
      ${selected ? `<text x="${cluster.sx + 15}" y="${cluster.sy - 12}" text-anchor="middle" font-size="10" font-weight="850" fill="#b9473e" stroke="#fffaf0" stroke-width="3" paint-order="stroke">${order}</text>` : ''}
    </g>
  `
}

async function runCheckin() {
  setLoading(el.probeOutput, '회의 전체를 보고 부재 이해관계자와 가치 blind spot을 찾는 중입니다...')
  const result = await postJson('/api/checkin', {})
  state.currentProbe = result
  renderCheckin(result)
  setCurrentQuestion(questionFromResult(result, 'Periodic Check-in'))
}

async function probeSparseZone(zoneIndex) {
  const zone = state.zones[zoneIndex]
  state.currentZone = zone
  const nearest = nearestPoints(zone, 7)
  const surroundingClusters = summarizeClusters(nearest.map((item) => item.argument))
  const payload = {
    clicked_zone: {
      x: Math.round(zone.sx),
      y: Math.round(zone.sy),
      emptiness_score: Math.round(zone.emptiness),
      // The real signal: 19D Schwartz values barely expressed among nearby arguments.
      weak_19d_values: (zone.weak_values ?? []).map((v) => ({
        key: v.key,
        label: v.label,
        mean_abs_signed: Number(v.mean_abs.toFixed(3)),
        mean_signed: Number(v.mean_signed.toFixed(3)),
      })),
    },
    nearest_arguments: nearest.map((item) => ({
      distance: Math.round(item.distance),
      speaker: item.argument.speaker,
      time: item.argument.time,
      cluster_id: item.argument.cluster_id,
      korean_text: item.argument.korean_text,
      top_values: item.argument.top_values.slice(0, 3),
    })),
    surrounding_clusters: surroundingClusters,
  }

  setLoading(el.probeOutput, '클릭한 빈 영역을 주변 발화와 비교해서 해석하는 중입니다...')
  const result = await postJson('/api/blind-spot', payload)
  state.currentProbe = result
  renderBlindSpot(result)
  setCurrentQuestion(questionFromResult(result, 'Sparse value-space click'))
}

// Tension Probe: pick two cluster centroids to examine the value conflict between
// them. The 19D top signed values of each cluster are the evidence; the LLM names
// the tension and asks whether to resolve it or record it as a trade-off.
function toggleTensionCluster(clusterId) {
  if (!Number.isFinite(clusterId)) return
  const sel = state.tensionSelection
  const idx = sel.indexOf(clusterId)
  if (idx >= 0) {
    sel.splice(idx, 1)
  } else {
    sel.push(clusterId)
    if (sel.length > 2) sel.shift() // keep only the last two picks
  }
  renderMap()
  if (sel.length === 2) {
    probeTension(sel[0], sel[1])
  } else {
    setLoading(el.probeOutput, '두 번째 cluster를 클릭하면 두 가치 영역 사이의 긴장을 해석합니다. (현재 1개 선택됨)')
  }
}

async function probeTension(idA, idB) {
  const a = state.data.clusters.find((c) => c.cluster_id === idA)
  const b = state.data.clusters.find((c) => c.cluster_id === idB)
  if (!a || !b) return
  const payload = {
    cluster_a: { cluster_id: a.cluster_id, label: a.label, top_values: a.top_values, examples: a.examples?.slice(0, 2) ?? [] },
    cluster_b: { cluster_id: b.cluster_id, label: b.label, top_values: b.top_values, examples: b.examples?.slice(0, 2) ?? [] },
  }
  setLoading(el.probeOutput, `C${idA} ↔ C${idB} 두 가치 영역 사이의 긴장을 해석하는 중입니다...`)
  const result = await postJson('/api/tension', payload)
  state.currentProbe = result
  state.currentZone = null
  renderTension(result, a, b)
  setCurrentQuestion(questionFromResult(result, `Cluster tension C${idA}↔C${idB}`))
}

async function createEmptyChair(stakeholder) {
  setLoading(el.emptyChairOutput, `${stakeholderNameOf(stakeholder)} 관점의 Empty Chair 발화를 생성하는 중입니다...`)
  const result = await postJson('/api/empty-chair', { stakeholder })
  const added = addVirtualUtterance(result, stakeholder)
  renderEmptyChair(result, added)
  renderMap()
  renderSelectionSummary()
}

async function suggestStakeholders() {
  setLoading(el.emptyChairOutput, '현재 논의 맥락에서 추가할 수 있는 Empty Chair 후보를 생성하는 중입니다...')
  const result = await postJson('/api/stakeholder-suggestions', {
    current_probe: state.currentProbe,
    current_question: state.currentQuestion,
  })
  renderStakeholderSuggestions(result)
}

async function answerCurrentQuestion() {
  if (!state.currentQuestion?.question) return
  setLoading(el.answerOutput, '현재 질문에 대한 가능한 그룹 응답을 생성하는 중입니다...')
  const result = await postJson('/api/answer-question', {
    question: state.currentQuestion,
    current_probe: state.currentProbe,
    empty_chairs: state.virtualPoints.map((point) => ({
      speaker: point.argument.speaker,
      korean_text: point.argument.korean_text,
      source: point.argument.source,
    })),
  })
  renderAnswer(result)
}

// Rationale Composer: synthesize the recorded decisions into an editable draft
// decision rationale. Preserves unresolved tensions instead of forcing consensus.
async function composeRationale() {
  if (state.traces.length === 0) {
    el.rationaleOutput.classList.add('empty')
    el.rationaleOutput.textContent = '먼저 Explore/Defer/Exclude로 결정을 한두 개 남긴 뒤 결정문을 구성하세요.'
    return
  }
  setLoading(el.rationaleOutput, '결정 기록과 Empty Chair 발화를 모아 결정문 초안을 구성하는 중입니다...')
  const result = await postJson('/api/rationale', {
    decision_traces: state.traces.map((t) => ({
      decision: t.label,
      kind: t.kind,
      question: t.question,
      source: t.source,
    })),
    empty_chairs: state.virtualPoints.map((point) => ({
      speaker: point.argument.speaker,
      korean_text: point.argument.korean_text,
    })),
    active_clusters: activeClusterIds(),
  })
  renderRationale(result)
}

function activeClusterIds() {
  return state.data.clusters
    .filter((cluster) => state.selectedClusters.size === 0 || state.selectedClusters.has(cluster.cluster_id))
    .map((cluster) => ({ cluster_id: cluster.cluster_id, label: cluster.label, top_values: cluster.top_values }))
}

function renderRationale(result) {
  const tensions = result.unresolved_tensions ?? result.unresolvedTensions ?? []
  el.rationaleOutput.classList.remove('empty')
  el.rationaleOutput.innerHTML = `
    ${errorBanner(result)}
    <div class="result-title">${escapeHtml(textOf(result.title) || '결정문 초안')}</div>
    <div class="rationale-caveat">${escapeHtml(textOf(result.caveat) || '이 초안은 AI가 합성한 boundary 산출물이며, 권위 있는 결정이 아닙니다. 그룹의 편집과 동의가 필요합니다.')}</div>
    ${rationaleField('우리가 내리려는 결정', textOf(result.decision))}
    ${rationaleListField('우리가 우선한 가치', result.prioritized_values ?? result.prioritizedValues ?? [])}
    ${rationaleListField('우리가 감수한 trade-off', result.accepted_tradeoffs ?? result.acceptedTradeoffs ?? [])}
    <div class="rationale-field unresolved">
      <strong>남겨둔 unresolved tension (합의하지 않음)</strong>
      <div class="rationale-sub">boundary object는 충돌을 합의로 환원하지 않고 보존합니다. 이 항목은 그대로 결정문에 남깁니다.</div>
      ${tensions.length ? `<ul>${tensions.map((t) => `<li>${escapeHtml(textOf(t))}</li>`).join('')}</ul>` : '<div class="rationale-empty">아직 명시된 unresolved tension이 없습니다. Defer로 남긴 항목이나 Tension Probe 결과가 여기에 모입니다.</div>'}
    </div>
    ${rationaleField('정당화 맥락', textOf(result.justifying_context ?? result.justifyingContext))}
    ${rationaleListField('재검토가 필요한 조건', result.revisit_conditions ?? result.revisitConditions ?? [])}
    <div class="rationale-actions">
      <button class="mini-action" id="editRationaleButton">Edit as text</button>
    </div>
  `
  const editButton = el.rationaleOutput.querySelector('#editRationaleButton')
  if (editButton) editButton.addEventListener('click', () => openRationaleEditor(result))
}

function rationaleField(label, value) {
  if (!value) return ''
  return `<div class="rationale-field"><strong>${escapeHtml(label)}</strong><div>${escapeHtml(value)}</div></div>`
}

function rationaleListField(label, values) {
  if (!values || values.length === 0) return ''
  return `<div class="rationale-field"><strong>${escapeHtml(label)}</strong><ul>${values.map((v) => `<li>${escapeHtml(textOf(v))}</li>`).join('')}</ul></div>`
}

// Turn the rendered rationale into an editable textarea so the group can revise it.
function openRationaleEditor(result) {
  const tensions = result.unresolved_tensions ?? result.unresolvedTensions ?? []
  const lines = [
    `# 결정문 초안`,
    ``,
    `## 우리가 내리려는 결정`,
    textOf(result.decision),
    ``,
    `## 우리가 우선한 가치`,
    ...(result.prioritized_values ?? []).map((v) => `- ${textOf(v)}`),
    ``,
    `## 우리가 감수한 trade-off`,
    ...(result.accepted_tradeoffs ?? []).map((v) => `- ${textOf(v)}`),
    ``,
    `## 남겨둔 unresolved tension (합의하지 않음)`,
    ...tensions.map((v) => `- ${textOf(v)}`),
    ``,
    `## 정당화 맥락`,
    textOf(result.justifying_context ?? result.justifyingContext),
    ``,
    `## 재검토가 필요한 조건`,
    ...(result.revisit_conditions ?? []).map((v) => `- ${textOf(v)}`),
  ]
  el.rationaleOutput.innerHTML = `
    <div class="rationale-caveat">${escapeHtml(textOf(result.caveat) || '이 초안은 AI가 합성한 boundary 산출물입니다. 자유롭게 수정하세요.')}</div>
    <textarea class="rationale-editor" spellcheck="false">${escapeHtml(lines.join('\n'))}</textarea>
    <div class="rationale-sub">이 텍스트는 그룹이 직접 수정·복사해서 회의록에 옮길 수 있습니다.</div>
  `
}

function renderCheckin(result) {
  const rawStakeholders = result.absent_stakeholders ?? result.absentStakeholders ?? []
  // Normalize: LLM uses unpredictable Korean or English keys each call.
  const stakeholders = rawStakeholders.map((item) => {
    if (typeof item === 'string') return { name: item }
    if (item.name || item.stakeholder || item.role) return item
    // Pick whichever Korean "name" key appeared this call
    const name = item['이해관계자'] ?? item['이해당사자'] ?? item['이름'] ?? item['역할'] ?? item['참여자'] ?? textOf(Object.values(item)[0])
    const why_absent = item['누락이유'] ?? item['왜_빠졌는가'] ?? item['이유'] ?? item['이유_누락'] ?? item['absent_reason'] ?? ''
    const rawValues = item['추정필요'] ?? item['주요가치'] ?? item['likely_values'] ?? []
    const likely_values = Array.isArray(rawValues) ? rawValues : (rawValues ? [String(rawValues)] : [])
    return { name, why_absent, likely_values }
  })
  const rawQuestions = result.facilitatorQuestions ?? result.facilitator_questions ?? result.reopen_prompts ?? result.reopenDeliberationPrompts ?? []
  const prompts = rawQuestions.map((q) => {
    if (typeof q === 'string') return { prompt: q }
    const text = q['질문'] ?? q.question ?? q.prompt ?? q.text ?? textOf(Object.values(q)[0])
    return { prompt: textOf(text), target: q.target ?? q['대상'] }
  })
  const question = textOf(result.next_question ?? result.discussion_question ?? prompts[0]?.prompt ?? '')
  const rawBlindSpots = result.blind_spots ?? result.blindSpots ?? result.value_blind_spots ?? []
  const blindSpots = rawBlindSpots.map((item) => {
    if (typeof item === 'string') return item
    // Various Korean schemas: {항목, 설명}, {blindSpot, 설명}, {label, detail}, etc.
    const label = item['항목'] ?? item['blindSpot'] ?? item.label ?? item.name ?? item.value ?? ''
    const detail = item['설명'] ?? item['이유'] ?? item.detail ?? item.reason ?? item.gap ?? ''
    return label && detail ? `${label}: ${detail}` : label || detail || textOf(item)
  })
  el.probeOutput.classList.remove('empty')
  el.probeOutput.innerHTML = `
    ${errorBanner(result)}
    <div class="result-title">${escapeHtml(result.title ?? result.topic ?? 'Periodic Check-in')}</div>
    ${stakeholders.length ? `
    <div class="result-block">
      <strong>부재 이해관계자 후보</strong>
      <div class="stakeholder-list">
        ${stakeholders.map((item, index) => stakeholderTemplate(item, index)).join('')}
      </div>
    </div>` : ''}
    ${blindSpots.length ? `<div class="result-block"><strong>가치 blind spots</strong>${list(blindSpots)}</div>` : ''}
    <div class="result-block">
      <strong>그룹 질문</strong>
      ${escapeHtml(question)}
    </div>
    ${prompts.length > 1 ? `<div class="result-block"><strong>추가 질문 후보</strong>${list(prompts.slice(1, 4).map((item) => item.prompt ?? item))}</div>` : ''}
  `

  el.probeOutput.querySelectorAll('[data-stakeholder]').forEach((button) => {
    button.addEventListener('click', () => createEmptyChair(stakeholders[Number(button.dataset.stakeholder)]))
  })
}

function renderBlindSpot(result) {
  const stakeholders = (result.absent_stakeholders ?? result.absentStakeholders ?? result.stakeholder_candidates ?? result.stakeholderCandidates ?? []).map((name) => (
    typeof name === 'string' ? { name } : name
  ))
  const question = questionFromResult(result, 'Sparse value-space click')
  const missingValues = result.missing_values ?? result.missingValues ?? result.weak_values ?? result.weakValues ?? result.value_blind_spots ?? result.blind_spots ?? []
  const interpretation = textOf(
    result.interpretation ??
    result.area_interpretation ??
    result.emptyAreaInterpretation ??
    result.underexploredPerspective ??
    result.summary,
  )
  el.probeOutput.classList.remove('empty')
  el.probeOutput.innerHTML = `
    ${errorBanner(result)}
    <div class="result-title">${escapeHtml(textOf(result.title ?? result.area_label) || 'Sparse area probe')}</div>
    <div>${escapeHtml(interpretation)}</div>
    ${zoneWeakValuesBlock()}
    ${missingValues.length ? `<div class="result-block"><strong>약하게 탐색된 가치</strong>${list(missingValues)}</div>` : ''}
    ${stakeholders.length ? `
    <div class="result-block">
      <strong>부재 이해관계자 후보</strong>
      <div class="stakeholder-list">
        ${stakeholders.map((item, index) => stakeholderTemplate(item, index)).join('')}
      </div>
    </div>` : ''}
    <div class="result-block">
      <strong>Question to reopen deliberation</strong>
      ${escapeHtml(question.question)}
      <div class="question-meta">
        <span>Target: ${escapeHtml(question.target)}</span>
        <span>Delivery: ${escapeHtml(question.delivery)}</span>
      </div>
    </div>
    <div class="result-block">
      <strong>Decision trace suggestion</strong>
      ${escapeHtml(textOf(result.decision_log_suggestion ?? result.trace_suggestion))}
    </div>
  `

  el.probeOutput.querySelectorAll('[data-stakeholder]').forEach((button) => {
    button.addEventListener('click', () => createEmptyChair(stakeholders[Number(button.dataset.stakeholder)]))
  })
}

// Shows the measured 19D weakness for the clicked zone, distinct from the LLM's
// free-text guesses. This is the part grounded in the actual value vectors.
function zoneWeakValuesBlock() {
  const weak = state.currentZone?.weak_values ?? []
  if (!weak.length) return ''
  return `
    <div class="result-block">
      <strong>19D 측정 기준 약한 가치 (이 영역 주변)</strong>
      <div class="hint-line">2D 화면의 빈 공간이 아니라, 주변 발화의 실제 19차원 값에서 가장 약하게 나타난 가치입니다.</div>
      <div class="value-tags">
        ${weak.map((v) => `<span title="평균 |signed| ${v.mean_abs.toFixed(3)}">${escapeHtml(v.label)} · |${v.mean_abs.toFixed(2)}|</span>`).join('')}
      </div>
    </div>
  `
}

function renderTension(result, a, b) {
  const question = questionFromResult(result, 'Cluster tension')
  el.probeOutput.classList.remove('empty')
  el.probeOutput.innerHTML = `
    ${errorBanner(result)}
    <div class="result-title">${escapeHtml(textOf(result.title) || `C${a.cluster_id} ↔ C${b.cluster_id} 가치 긴장`)}</div>
    <div class="tension-pair">
      <span class="tension-chip">C${a.cluster_id} ${escapeHtml(a.label)}</span>
      <span class="tension-vs">↔</span>
      <span class="tension-chip">C${b.cluster_id} ${escapeHtml(b.label)}</span>
    </div>
    <div class="result-block">
      <strong>이 긴장의 이름</strong>
      ${escapeHtml(textOf(result.tension_naming))}
    </div>
    <div class="result-block">
      <strong>실제 충돌인가, 다른 범위의 관심인가?</strong>
      ${escapeHtml(textOf(result.is_real_conflict))}
    </div>
    ${textOf(result.interpretation) ? `<div class="result-block"><strong>해석</strong>${escapeHtml(textOf(result.interpretation))}</div>` : ''}
    <div class="result-block">
      <strong>Question to examine the tension</strong>
      ${escapeHtml(question.question)}
      <div class="question-meta">
        <span>Target: ${escapeHtml(question.target)}</span>
        <span>Delivery: ${escapeHtml(question.delivery)}</span>
      </div>
    </div>
    ${textOf(result.record_as_tradeoff_hint) ? `<div class="result-block"><strong>Trade-off로 남길지</strong>${escapeHtml(textOf(result.record_as_tradeoff_hint))}</div>` : ''}
    <div class="hint-line">두 cluster의 상위 19D signed 값을 근거로 생성된 해석입니다. 해결을 강요하지 않으며, Explore/Defer/Exclude로 처리 방침을 남길 수 있습니다.</div>
  `
}

function showClusterTooltip(event) {
  const clusterId = Number(event.currentTarget.dataset.clusterNode)
  const cluster = state.data.clusters.find((c) => c.cluster_id === clusterId)
  if (!cluster) return
  const selectedNote = state.tensionSelection.includes(clusterId)
    ? '<br><span style="color:#f0b5ae">선택됨 — 다시 클릭하면 해제</span>'
    : state.tensionSelection.length === 1
      ? '<br><span style="color:#9fd8c4">클릭하면 첫 cluster와의 가치 긴장을 분석합니다</span>'
      : '<br><span style="color:#9fd8c4">Tension Probe: 클릭해서 첫 cluster를 고르세요</span>'
  const values = cluster.top_values.map((v) => `${v.label} ${formatSigned(v.signed)}`).join(' · ')
  el.tooltip.innerHTML = `<strong>C${cluster.cluster_id} ${escapeHtml(cluster.label)}</strong><br>${escapeHtml(values)}${selectedNote}`
  positionTooltip(event)
}

function renderEmptyChair(result, addedPoint = null) {
  const emptyChair = normalizeEmptyChair(result)
  const stakeholderName = emptyChair.speaker || stakeholderNameOf(result.stakeholder) || '이해관계자'
  const label = emptyChair.label || `[AI가 생성한 가상의 ${stakeholderName} 관점]`
  const utterance = emptyChair.text
  const question = emptyChair.question
  const valueMapAddition = result.value_map_addition ?? result.valueMapAddition ?? result.valueMapAdd ?? result.value_map_add ?? {}
  const mapNote = textOf(
    valueMapAddition.note ??
    valueMapAddition.map_note ??
    result.possible_map_label ??
    result.map_label ??
    '',
  ) || '가상 발화가 강조하는 가치 차원을 지도에 점선 다이아몬드로 추가합니다.'
  const targetValues = valueMapAddition.target_values ?? valueMapAddition.targetValues ?? []
  el.emptyChairOutput.classList.remove('empty')
  el.emptyChairOutput.innerHTML = `
    ${errorBanner(result)}
    <div class="result-title">${escapeHtml(label)}</div>
    <div>${escapeHtml(utterance)}</div>
    <div class="result-block">
      <strong>Inclusion question</strong>
      ${escapeHtml(question)}
    </div>
    <div class="result-block">
      <strong>Map label</strong>
      ${escapeHtml(mapNote)}
      ${targetValues.length ? `<div class="value-tags">${targetValues.map((v) => `<span>${escapeHtml(v.label ?? v.key)} · ${escapeHtml(v.strength ?? v.direction ?? '')}</span>`).join('')}</div>` : ''}
    </div>
    ${addedPoint ? `<div class="add-note">지도에 Empty Chair 발화를 점선 다이아몬드로 추가했습니다: ${escapeHtml(addedPoint.argument.speaker)}</div>` : ''}
  `

  if (question) {
    setCurrentQuestion({
      source: 'Empty Chair',
      question,
      target: '전체 그룹',
      why: `${stakeholderName} 관점을 실제 결정에 어떻게 반영할지 확인하기 위해`,
      delivery: '가상 발화 직후 진행자가 그대로 읽고, 참석자별 1분 응답을 요청',
    })
  }
}

function renderStakeholderSuggestions(result) {
  const candidates =
    result.candidates ??
    result.empty_chair_candidates ??
    result.emptyChairCandidates ??
    result.absent_stakeholders ??
    result.absentStakeholders ??
    result.stakeholders ??
    []
  el.emptyChairOutput.classList.remove('empty')
  el.emptyChairOutput.innerHTML = `
    ${errorBanner(result)}
    <div class="result-title">${escapeHtml(result.title ?? '추가할 수 있는 Empty Chair 후보')}</div>
    <div class="stakeholder-list">
      ${candidates.map((item, index) => stakeholderTemplate(item, index)).join('')}
    </div>
  `

  el.emptyChairOutput.querySelectorAll('[data-stakeholder]').forEach((button) => {
    button.addEventListener('click', () => createEmptyChair(candidates[Number(button.dataset.stakeholder)]))
  })
}

function renderQuestion() {
  const q = state.currentQuestion
  if (!q) {
    el.questionOutput.className = 'question-card empty'
    el.questionOutput.textContent = '아직 전달할 질문이 없습니다. 빈 영역을 클릭하거나 체크인을 실행하세요.'
    return
  }

  el.questionOutput.className = 'question-card'
  el.questionOutput.innerHTML = `
    <div class="panel-label">${escapeHtml(q.source)}</div>
    <div class="question-text">${escapeHtml(q.question)}</div>
    <div class="question-meta">
      <span><strong>To</strong> ${escapeHtml(q.target)}</span>
      <span><strong>Why now</strong> ${escapeHtml(q.why)}</span>
      <span><strong>Delivery</strong> ${escapeHtml(q.delivery)}</span>
    </div>
  `
}

function renderAnswer(result) {
  const responses = normalizePartyResponses(result)
  el.answerOutput.classList.remove('empty')
  el.answerOutput.innerHTML = `
    ${errorBanner(result)}
    <div class="result-title">${escapeHtml(result.title ?? '정당별 예상 응답')}</div>
    <div>${escapeHtml(textOf(result.direct_answer ?? result.summary ?? result.meta))}</div>
    <div class="result-block">
      <strong>Expected participant responses</strong>
      <div class="party-response-list">
        ${responses.map((item) => `
          <div class="party-response">
            <span class="dot" style="background:${speakerColors[item.speaker] ?? '#68726c'}"></span>
            <strong>${escapeHtml(item.speaker)}</strong>
            <p>${escapeHtml(item.text)}</p>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="result-block">
      <strong>Follow-up</strong>
      ${escapeHtml(textOf(result.follow_up_question ?? result.next_question ?? result.follow_up))}
    </div>
  `
}

function stakeholderTemplate(item, index) {
  const name = stakeholderNameOf(item)
  const whyAbsent = textOf(item.why_absent ?? item.whyAbsent ?? item.reason ?? item.rationale)
  const likelyValues = item.likely_values ?? item.likelyValues ?? item.values ?? []
  // Collect all prompt-like fields and deduplicate by text so the same sentence
  // never appears twice (LLM sometimes returns both `prompt` and `reopen_prompts[0]`).
  const rawPrompts = [
    textOf(item.prompt ?? item.reopenPrompt ?? item.suggested_question ?? item.suggestedQuestion),
    ...(item.reopen_prompts ?? item.prompts ?? []).map(textOf),
  ].filter(Boolean)
  const seen = new Set()
  const prompts = rawPrompts.filter((p) => { if (seen.has(p)) return false; seen.add(p); return true })
  const expectedAnswer = textOf(item.questionAnswer ?? item.expectedAnswer ?? item.possible_response)
  return `
    <div class="stakeholder-item">
      <strong>${escapeHtml(name)}</strong>
      ${whyAbsent ? `<div>${escapeHtml(whyAbsent)}</div>` : ''}
      ${likelyValues.length ? `<div><em>${escapeHtml(likelyValues.map(textOf).join(' · '))}</em></div>` : ''}
      ${prompts.length ? `<div>${escapeHtml(prompts.slice(0, 2).join(' / '))}</div>` : ''}
      ${expectedAnswer ? `<div class="candidate-answer">${escapeHtml(expectedAnswer)}</div>` : ''}
      <button class="mini-action" data-stakeholder="${index}">Empty Chair</button>
    </div>
  `
}

function stakeholderNameOf(item) {
  if (!item) return ''
  if (typeof item === 'string') return item
  return textOf(
    item.name ??
    item.stakeholder ??
    item.speaker ??
    item.role ??
    item.title ??
    item.candidate ??
    item.utterance?.speaker ??
    item.empty_chair_utterance?.speaker ??
    item.emptyChairUtterance?.speaker ??
    item.label,
  )
}

function addTrace(decision) {
  const meta = DECISION_META[decision] ?? { label: decision, tone: 'explore', meaning: '' }
  const source = state.currentQuestion?.source ?? state.currentProbe?.area_label ?? state.currentProbe?.title ?? 'Current probe'
  const question = textOf(state.currentQuestion?.question ?? state.currentProbe?.discussion_question ?? state.currentProbe?.next_question)

  if (!question) {
    renderTraces('먼저 빈 영역을 클릭하거나 체크인을 실행해서 결정할 질문을 만든 뒤 Explore/Defer/Exclude를 누르세요.')
    return
  }

  // One probe = one decision. Re-deciding the same question updates the row in
  // place (so a later Exclude overrides an earlier Explore) instead of stacking.
  const key = question.trim()
  const now = new Date()
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  // The trace is a general register over every probe type, not just blind spots.
  // `kind` lets the Rationale Composer group decisions (blind spot vs tension vs
  // check-in vs empty chair) when it composes the final decision rationale.
  const kind = traceKindFromSource(source)
  const existing = state.traces.find((trace) => trace.key === key)
  if (existing) {
    if (existing.label !== meta.label) {
      existing.history.push({ label: existing.label, time: existing.time })
    }
    existing.label = meta.label
    existing.tone = meta.tone
    existing.meaning = meta.meaning
    existing.source = source
    existing.kind = kind
    existing.time = time
  } else {
    state.traces.unshift({ key, label: meta.label, tone: meta.tone, meaning: meta.meaning, source, kind, question, time, history: [] })
  }
  renderTraces()
}

function traceKindLabel(kind) {
  return {
    blind_spot: 'Blind spot',
    tension: 'Tension',
    checkin: 'Check-in',
    empty_chair: 'Empty Chair',
  }[kind] ?? 'Probe'
}

// Map a human-readable probe source to a stable kind tag.
function traceKindFromSource(source) {
  const s = String(source ?? '')
  if (/tension|충돌|cluster/i.test(s)) return 'tension'
  if (/check-?in|체크인/i.test(s)) return 'checkin'
  if (/empty chair/i.test(s)) return 'empty_chair'
  return 'blind_spot'
}

function removeTrace(key) {
  state.traces = state.traces.filter((trace) => trace.key !== key)
  renderTraces()
}

function renderTraces(hint) {
  if (hint) {
    el.decisionTrace.innerHTML = `<div class="trace-hint warn">${escapeHtml(hint)}</div>`
    return
  }
  if (state.traces.length === 0) {
    el.decisionTrace.innerHTML = `<div class="trace-hint">아직 결정 기록이 없습니다. 질문을 만든 뒤 Explore / Defer / Exclude로 회의의 처리 방침을 남기면 여기에 한 줄씩 쌓입니다. 같은 질문을 다시 결정하면 새 줄이 아니라 기존 줄이 갱신됩니다.</div>`
    return
  }
  el.decisionTrace.innerHTML = state.traces.map((trace) => `
    <div class="trace-item tone-${trace.tone}">
      <div class="trace-head">
        <span class="trace-badge ${trace.tone}">${escapeHtml(trace.label)}</span>
        <span class="trace-kind">${escapeHtml(traceKindLabel(trace.kind))}</span>
        <span class="trace-time">${escapeHtml(trace.time)}</span>
        <button class="trace-remove" data-trace-key="${escapeHtml(trace.key)}" title="이 기록 삭제">×</button>
      </div>
      <div class="trace-meaning">${escapeHtml(trace.meaning)}</div>
      <div class="trace-source">${escapeHtml(trace.source)}</div>
      <div class="trace-question">${escapeHtml(trace.question)}</div>
      ${trace.history.length ? `<div class="trace-history">이전 결정: ${escapeHtml(trace.history.map((h) => `${h.label}(${h.time})`).join(' → '))}</div>` : ''}
    </div>
  `).join('')

  el.decisionTrace.querySelectorAll('[data-trace-key]').forEach((button) => {
    button.addEventListener('click', () => removeTrace(button.dataset.traceKey))
  })
}

function bindEvents() {
  el.checkinButton.addEventListener('click', runCheckin)
  el.suggestStakeholdersButton.addEventListener('click', suggestStakeholders)
  el.answerQuestionButton.addEventListener('click', answerCurrentQuestion)
  el.composeRationaleButton.addEventListener('click', composeRationale)
  el.referenceToggle.addEventListener('click', () => {
    el.referenceFrame.src = state.data.reference_html
    el.referenceModal.classList.remove('hidden')
  })
  el.closeReference.addEventListener('click', () => el.referenceModal.classList.add('hidden'))
  document.querySelectorAll('[data-decision]').forEach((button) => {
    button.addEventListener('click', () => addTrace(button.dataset.decision))
  })
}

function filteredPoints() {
  return [...state.points, ...state.virtualPoints]
}

function toggleSpeaker(speaker) {
  if (!speaker) return
  if (state.selectedSpeakers.has(speaker)) {
    state.selectedSpeakers.delete(speaker)
  } else {
    state.selectedSpeakers.add(speaker)
  }
  syncFilterChips()
  renderMap()
  renderSelectionSummary()
}

function toggleCluster(clusterId) {
  if (!Number.isFinite(clusterId)) return
  if (state.selectedClusters.has(clusterId)) {
    state.selectedClusters.delete(clusterId)
  } else {
    state.selectedClusters.add(clusterId)
  }
  syncFilterChips()
  renderMap()
  renderSelectionSummary()
}

function syncFilterChips() {
  el.speakerLegend.querySelectorAll('[data-speaker]').forEach((chip) => {
    const active = state.selectedSpeakers.has(chip.dataset.speaker)
    chip.classList.toggle('active', active || state.selectedSpeakers.size === 0)
    chip.classList.toggle('inactive', state.selectedSpeakers.size > 0 && !active)
  })
  el.clusterLegend.querySelectorAll('[data-cluster]').forEach((chip) => {
    const active = state.selectedClusters.has(Number(chip.dataset.cluster))
    chip.classList.toggle('active', active || state.selectedClusters.size === 0)
    chip.classList.toggle('inactive', state.selectedClusters.size > 0 && !active)
  })
}

function filteredRealPoints() {
  return state.points.filter((point) => !isPointDimmed(point))
}

function renderSelectionSummary() {
  const highlighted = filteredRealPoints()
  const partyLines = state.data.speakers
    .filter((speaker) => state.selectedSpeakers.size === 0 || state.selectedSpeakers.has(speaker))
    .map((speaker) => `${speaker}: ${state.points.filter((point) => point.argument.speaker === speaker && !isPointDimmed(point)).length}`)
    .join(' · ')

  const activeClusterDescriptions = state.data.clusters
    .filter((cluster) => state.selectedClusters.size === 0 || state.selectedClusters.has(cluster.cluster_id))
    .slice(0, 3)
    .map((cluster) => `C${cluster.cluster_id} ${cluster.label}: ${cluster.top_values.map((v) => `${v.label} ${formatSigned(v.signed)}`).join(', ')}`)

  el.selectionSummary.innerHTML = `
    <strong>${highlighted.length}/${state.points.length}</strong> real arguments highlighted<br>
    ${escapeHtml(partyLines)}<br>
    <span>${escapeHtml(activeClusterDescriptions.join(' / '))}</span>
    ${state.virtualPoints.length ? `<br><strong>${state.virtualPoints.length}</strong> Empty Chair utterance${state.virtualPoints.length > 1 ? 's' : ''} added` : ''}
  `
}

function isPointDimmed(point) {
  const arg = point.argument
  if (arg.is_virtual) return false
  const speakerSelected = state.selectedSpeakers.size === 0 || state.selectedSpeakers.has(arg.speaker)
  const clusterSelected = state.selectedClusters.size === 0 || state.selectedClusters.has(arg.cluster_id)
  return !(speakerSelected && clusterSelected)
}

function speakerSummary(speaker) {
  const points = state.points.filter((point) => point.argument.speaker === speaker)
  const clusterCounts = new Map()
  for (const point of points) {
    clusterCounts.set(point.argument.cluster_id, (clusterCounts.get(point.argument.cluster_id) ?? 0) + 1)
  }
  const topClusters = [...clusterCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([clusterId, count]) => {
      const cluster = state.data.clusters.find((item) => item.cluster_id === clusterId)
      return `C${clusterId} ${cluster?.label ?? ''} ${count}`
    })
  return `${speaker}: ${points.length} 발화 · ${topClusters.join(' · ')}`
}

function clusterDescription(cluster) {
  const values = cluster.top_values.map((v) => `${v.label} ${formatSigned(v.signed)}`).join(', ')
  const examples = cluster.examples.slice(0, 2).join(' / ')
  return `C${cluster.cluster_id} ${cluster.label} · ${cluster.size} 발화 · ${values} · 예: ${examples}`
}

function questionFromResult(result, source) {
  const prompt = result.reopen_prompts?.[0]
  // The model sometimes nests the question as {exact: "..."} or {question: "..."},
  // and interpretation/why_now under an `interpretation` object. Unwrap defensively.
  const interp = (result.interpretation && typeof result.interpretation === 'object') ? result.interpretation : {}
  const question =
    result.facilitator_question ??
    result.facilitatorQuestion ??
    result.discussion_question ??
    result.discussionQuestion ??
    result.next_question ??
    result.nextQuestion ??
    result.question ??
    result.question_to_group ??
    result.group_question ??
    result.groupQuestion ??
    prompt?.prompt ??
    ''
  return {
    source,
    question: unwrapQuestionText(question),
    target: textOf(result.target_audience ?? result.targetAudience ?? result.target ?? result.audience ?? interp.invited_stakeholder ?? prompt?.target) || '전체 그룹',
    why: textOf(result.why_now ?? result.whyNow ?? result.rationale ?? interp.why_now ?? interp.underexplored_value ?? result.emptyAreaInterpretation) || '현재 논의에서 약하게 드러난 관점을 명시적으로 다루기 위해',
    delivery: textOf(result.delivery ?? result.suggested_delivery ?? result.suggestedDelivery ?? result.delivery_method ?? interp.delivery) || '진행자가 화면의 질문을 그대로 읽고, 각 정당/참석자에게 짧게 응답 요청',
  }
}

// Pull the actual question string out of a string or a wrapper object like
// {exact}, {question}, {text}, {prompt}.
function unwrapQuestionText(value) {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    return textOf(value.exact ?? value.question ?? value.text ?? value.prompt ?? value)
  }
  return textOf(value)
}

function splitAxisLabel(label) {
  const parts = String(label ?? '').split('↔').map((part) => part.trim()).filter(Boolean)
  const left = parts[0] || label || ''
  const right = parts[1] || ''
  return {
    left,
    right,
    bottom: left,
    top: right || left,
  }
}

// Axis end-point labels live in the outer MARGIN band, outside the plot frame,
// so they never overlap data points. `edge` says which side of the plot we hug.
function axisEndLabel(x, y, direction, label, edge) {
  const wrapped = wrapLabel(label, 22)
  if (edge === 'left' || edge === 'right') {
    const anchor = edge === 'left' ? 'end' : 'start'
    const dirY = y - 8 * (wrapped.length / 2) - 12
    return `
      <g class="axis-end" transform="translate(${x}, ${y})">
        <text x="0" y="${dirY - y}" text-anchor="${anchor}" font-size="9.5" font-weight="850" letter-spacing="0.08em" fill="#9a8f7f">${escapeHtml(direction.toUpperCase())}</text>
        ${wrapped.map((line, i) => `<text x="0" y="${(i - (wrapped.length - 1) / 2) * 14 + 4}" text-anchor="${anchor}" font-size="12.5" font-weight="850" fill="#33423d">${escapeHtml(line)}</text>`).join('')}
      </g>
    `
  }
  // top / bottom
  const baseDy = edge === 'top' ? -(wrapped.length * 14) : 4
  const dirDy = edge === 'top' ? baseDy - 6 : baseDy + wrapped.length * 14 + 4
  return `
    <g class="axis-end" transform="translate(${x}, ${y})">
      <text x="0" y="${dirDy}" text-anchor="middle" font-size="9.5" font-weight="850" letter-spacing="0.08em" fill="#9a8f7f">${escapeHtml(direction.toUpperCase())}</text>
      ${wrapped.map((line, i) => `<text x="0" y="${baseDy + i * 14 + 11}" text-anchor="middle" font-size="12.5" font-weight="850" fill="#33423d">${escapeHtml(line)}</text>`).join('')}
    </g>
  `
}

function wrapLabel(label, maxChars) {
  const words = String(label ?? '').split(/\s+/).filter(Boolean)
  const lines = []
  let current = ''
  for (const word of words) {
    if (current && (current.length + 1 + word.length) > maxChars) {
      lines.push(current)
      current = word
    } else {
      current = current ? `${current} ${word}` : word
    }
  }
  if (current) lines.push(current)
  return lines.length ? lines.slice(0, 3) : ['']
}

function normalizeEmptyChair(result) {
  const utteranceObj = result.utterance && typeof result.utterance === 'object'
    ? result.utterance
    : result.empty_chair_utterance && typeof result.empty_chair_utterance === 'object'
      ? result.empty_chair_utterance
      : result.emptyChairUtterance && typeof result.emptyChairUtterance === 'object'
        ? result.emptyChairUtterance
        : result.first_person_utterance && typeof result.first_person_utterance === 'object'
          ? result.first_person_utterance
          : result.utterances?.[0] ?? {}

  const speaker = textOf(
    utteranceObj.speaker ??
    result.speaker ??
    result.stakeholder ??
    result.role ??
    result.name,
  )

  const text = textOf(
    utteranceObj.text ??
    utteranceObj.utterance ??
    result.utterance ??
    result.empty_chair_utterance ??
    result.emptyChairUtterance ??
    result.first_person_utterance,
  )

  const question = textOf(
    utteranceObj.reopen_prompt ??
    utteranceObj.reopenPrompt ??
    result.inclusion_question ??
    result.question ??
    result.follow_up_question ??
    result.reopen_deliberation ??
    result.questionAnswer?.reopen_deliberation?.[0] ??
    result.questionAnswer?.speaker_specific_prompt,
  )

  const rawLabel = textOf(utteranceObj.label ?? result.label)
  return {
    speaker,
    text,
    question,
    label: rawLabel ? `[AI가 생성한 가상의 ${speaker || rawLabel} 관점]` : '',
  }
}

function normalizePartyResponses(result) {
  const raw =
    result.party_responses ??
    result.participant_responses ??
    result.expected_responses ??
    result.responses ??
    result.group_responses ??
    result.possible_responses ??
    result.answers ??
    result.prompts ??
    []

  if (!Array.isArray(raw)) return []
  return raw.map((item, index) => {
    if (typeof item === 'string') {
      return {
        speaker: state.data.speakers[index] ?? `참가자 ${index + 1}`,
        text: item,
      }
    }
    return {
      speaker: textOf(item.speaker ?? item.party ?? item.participant ?? item.name ?? item.role) || state.data.speakers[index] || `참가자 ${index + 1}`,
      text: textOf(item.text ?? item.response ?? item.answer ?? item.prompt ?? item.expected_response ?? item.content),
    }
  }).filter((item) => item.text)
}

function setCurrentQuestion(question) {
  if (!question?.question) return
  state.currentQuestion = question
  renderQuestion()
  el.answerOutput.className = 'output empty compact-output'
  el.answerOutput.textContent = '이 질문에 대한 가능한 그룹 응답을 LLM으로 생성할 수 있습니다.'
}

function addVirtualUtterance(result, stakeholder) {
  const emptyChair = normalizeEmptyChair({ ...result, stakeholder })
  const speaker = emptyChair.speaker || stakeholderNameOf(stakeholder) || 'Empty Chair'
  const text = emptyChair.text
  if (!text) return null

  const valueMapAddition = result.value_map_addition ?? result.valueMapAddition ?? result.valueMapAdd ?? result.value_map_add ?? {}
  const clusterId = Number(valueMapAddition.add_to_cluster_id ?? valueMapAddition.addToClusterId)
  const clusterAnchor = Number.isFinite(clusterId) ? centroidOf(state.points.filter((point) => point.argument.cluster_id === clusterId)) : null
  const anchor = clusterAnchor ?? state.currentZone ?? centroidOf(filteredRealPoints()) ?? { sx: W / 2, sy: H / 2 }
  const index = state.virtualPoints.length
  const point = {
    sx: clamp(anchor.sx + 18 + index * 10, PAD + 20, W - PAD - 20),
    sy: clamp(anchor.sy - 18 - index * 8, PAD + 20, H - PAD - 20),
    argument: {
      unit_id: `empty-chair-${Date.now()}-${index}`,
      speaker,
      time: 'AI',
      korean_text: text,
      english_text: text,
      cluster_id: -1,
      top_values: [],
      source: '[AI가 생성한 가상의 이해관계자 관점]',
      is_virtual: true,
    },
  }
  state.virtualPoints.push(point)
  return point
}

function scalePoints(args) {
  const xs = args.map((arg) => arg.x)
  const ys = args.map((arg) => arg.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const spanX = maxX - minX || 1
  const spanY = maxY - minY || 1

  return args.map((argument) => ({
    argument,
    sx: PAD + ((argument.x - minX) / spanX) * (W - PAD * 2),
    sy: H - PAD - ((argument.y - minY) / spanY) * (H - PAD * 2),
  }))
}

function findSparseZones(points) {
  if (points.length === 0) return []
  const candidates = []
  const cols = 6
  const rows = 4
  for (let col = 1; col < cols; col += 1) {
    for (let row = 1; row < rows; row += 1) {
      const sx = PAD + (col / cols) * (W - PAD * 2)
      const sy = PAD + (row / rows) * (H - PAD * 2)
      const nearestDistance = Math.min(...points.map((point) => Math.hypot(point.sx - sx, point.sy - sy)))
      const edgePenalty = Math.min(sx - PAD, W - PAD - sx, sy - PAD, H - PAD - sy)
      candidates.push({ sx, sy, radius: 34, emptiness: nearestDistance + edgePenalty * 0.08 })
    }
  }
  const zones = candidates.sort((a, b) => b.emptiness - a.emptiness).slice(0, 5)
  // Attach 19D value weakness: of the arguments physically near this zone,
  // which Schwartz values are least expressed? This is the real measurement,
  // not the 2D emptiness. The 2D gap only tells us where to look.
  for (const zone of zones) {
    zone.weak_values = weakestValuesNear(zone, 8)
  }
  return zones
}

// For the real arguments nearest a zone, return the 19D values with the lowest
// mean absolute signed strength — i.e. values barely touched in that neighborhood.
function weakestValuesNear(zone, neighborCount) {
  const neighbors = nearestPoints(zone, neighborCount)
  if (neighbors.length === 0) return []
  const keys = Object.keys((neighbors[0].argument.values) ?? {})
  return keys
    .map((key) => {
      const absVals = neighbors.map((n) => Math.abs(n.argument.values?.[key]?.signed ?? 0))
      const signedVals = neighbors.map((n) => n.argument.values?.[key]?.signed ?? 0)
      return {
        key,
        label: VALUE_LABELS[key] ?? key,
        mean_abs: mean(absVals),
        mean_signed: mean(signedVals),
      }
    })
    .sort((a, b) => a.mean_abs - b.mean_abs)
    .slice(0, 4)
}

function nearestPoints(anchor, limit) {
  return filteredRealPoints()
    .map((point) => ({
      argument: point.argument,
      distance: Math.hypot(point.sx - anchor.sx, point.sy - anchor.sy),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
}

function summarizeClusters(args) {
  const counts = new Map()
  for (const arg of args) counts.set(arg.cluster_id, (counts.get(arg.cluster_id) ?? 0) + 1)
  return [...counts.entries()].map(([clusterId, count]) => {
    const cluster = state.data.clusters.find((item) => item.cluster_id === clusterId)
    return { cluster_id: clusterId, count, label: cluster?.label ?? `C${clusterId}` }
  })
}

function showPointTooltip(event) {
  const arg = [...state.points, ...state.virtualPoints]
    .map((point) => point.argument)
    .find((item) => item.unit_id === event.target.dataset.point)
  if (!arg) return
  const valueLine = arg.is_virtual
    ? arg.source
    : arg.top_values.slice(0, 3).map((v) => `${v.label} ${formatSigned(v.signed)}`).join(' · ')
  el.tooltip.innerHTML = `
    <strong>${escapeHtml(arg.speaker)} · ${escapeHtml(arg.time)} · C${arg.cluster_id}</strong><br>
    ${escapeHtml(arg.korean_text)}<br>
    <span style="color:#c9beb0">${escapeHtml(valueLine)}</span>
  `
  positionTooltip(event)
}

function showZoneTooltip(event) {
  const zoneIndex = Number(event.currentTarget.dataset.zone)
  const zone = state.zones[zoneIndex]
  const weak = zone?.weak_values ?? []
  const weakLine = weak.length
    ? `<br><span style="color:#9fd8c4">주변에서 약한 19D 가치: ${escapeHtml(weak.map((v) => v.label).join(' · '))}</span>`
    : ''
  el.tooltip.innerHTML = `<strong>Value blind spot probe</strong><br>화면상 점이 드문 영역입니다(2D 레이아웃 기준). 클릭하면 주변 발화의 <b>19D 가치 약점</b>과 함께 덜 탐색된 이해관계자/가치 관점을 생성합니다.${weakLine}`
  positionTooltip(event)
}

function positionTooltip(event) {
  el.tooltip.style.left = `${event.clientX + 14}px`
  el.tooltip.style.top = `${event.clientY + 14}px`
  el.tooltip.classList.remove('hidden')
}

function hideTooltip() {
  el.tooltip.classList.add('hidden')
}

async function postJson(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return res.json()
}

function setLoading(node, text) {
  node.classList.add('empty')
  node.textContent = text
}

function list(values) {
  if (!values || values.length === 0) return ''
  return `<ul>${values.map((value) => `<li>${escapeHtml(readableItem(value))}</li>`).join('')}</ul>`
}

function readableItem(value) {
  if (typeof value === 'string') return value
  if (!value) return ''
  if (value.label && value.detail) return `${value.label}: ${value.detail}`
  if (value.value && value.gap) return `${value.value}: ${value.gap}`
  if (value.value && value.reason) return `${value.value}: ${value.reason}`
  if (value.name && value.reason) return `${value.name}: ${value.reason}`
  if (value.name && value.why_absent) return `${value.name}: ${value.why_absent}`
  if (value.speaker && value.text) return `${value.speaker}: ${value.text}`
  if (value.prompt) return value.prompt
  return textOf(value)
}

function textOf(value) {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(textOf).filter(Boolean).join(' · ')
  if (typeof value === 'object' && typeof value.ko === 'string') return value.ko
  if (typeof value === 'object' && typeof value.kr === 'string') return value.kr
  if (typeof value === 'object' && typeof value.korean === 'string') return value.korean
  if (typeof value === 'object' && typeof value.en === 'string') return value.en
  return (
    textOf(value.question) ||
    textOf(value.prompt) ||
    textOf(value.text) ||
    textOf(value.content) ||
    textOf(value.label) ||
    textOf(value.name) ||
    textOf(value.summary) ||
    textOf(value.detail) ||
    textOf(value.reason) ||
    textOf(value.gap) ||
    textOf(value.audience) ||
    textOf(value.target) ||
    textOf(value.method) ||
    textOf(value.delivery) ||
    JSON.stringify(value)
  )
}

function errorBanner(result) {
  return result.api_error ? `<div class="result-block"><strong>API fallback</strong>${escapeHtml(result.api_error)}</div>` : ''
}

function clusterColor(id) {
  return clusterColors[id % clusterColors.length]
}

function mean(values) {
  if (!values.length) return Number.NaN
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function centroidOf(points) {
  if (!points.length) return null
  return {
    sx: mean(points.map((point) => point.sx)),
    sy: mean(points.map((point) => point.sy)),
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function formatSigned(value) {
  if (Math.abs(value) < 0.001) return '0.00'
  return `${value > 0 ? '+' : '-'}${Math.abs(value).toFixed(2)}`
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
