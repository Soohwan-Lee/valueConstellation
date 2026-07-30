// ── State ─────────────────────────────────────────────────
let data = null
let activeCollisionIndex = null
let currentView = 'story'

const SPEAKER_COLORS = {
  '개혁신당': '#ff9d4d',
  '국민의힘': '#ff6b4d',
  '민주당':   '#58c4f0',
  '정의당':   '#ffd23f',
  '조국혁신당': '#b58bff',
}

function speakerColor(speaker) {
  return SPEAKER_COLORS[speaker] ?? '#8899aa'
}

// ── Init ──────────────────────────────────────────────────
async function init() {
  const loading = document.getElementById('loadingScreen')
  try {
    const res = await fetch('/api/data')
    data = await res.json()
    loading?.remove()
    render()
    bindTabs()
  } catch (err) {
    if (loading) loading.textContent = '데이터 로드 실패: ' + err.message
  }
}

function render() {
  document.getElementById('counterNum').textContent = data.collisions.length
  document.getElementById('counterTotal').textContent = data.collisions.length
  renderFeed()
  renderMap()
  renderConceptList()
}

// ── Tab switching ─────────────────────────────────────────
function bindTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      document.getElementById('viewStory').hidden = view !== 'story'
      document.getElementById('viewMap').hidden = view !== 'map'
      currentView = view
    })
  })
}

// ── STORY VIEW ────────────────────────────────────────────
function renderFeed() {
  const feed = document.getElementById('collisionFeed')
  feed.innerHTML = ''

  if (data.collisions.length === 0) {
    feed.innerHTML = '<p style="color:var(--muted);font-size:13px;padding:12px">감지된 충돌이 없습니다.</p>'
    return
  }

  data.collisions.forEach((col, i) => {
    const card = document.createElement('button')
    card.className = 'feed-card'
    card.setAttribute('aria-label', col.pair_label)
    card.dataset.index = i

    const pct = Math.round(col.intensity * 100)
    card.innerHTML = `
      <div class="fc-time">${col.time}</div>
      <div class="fc-pair">
        <span class="fc-chip" style="background:${col.side_a.color}">${col.side_a.label}</span>
        <span class="fc-vs">⚡</span>
        <span class="fc-chip" style="background:${col.side_b.color}">${col.side_b.label}</span>
      </div>
      <div class="fc-intensity">
        <div class="fc-intensity-fill" style="width:${pct}%"></div>
      </div>
    `
    card.addEventListener('click', () => selectCollision(i))
    feed.appendChild(card)
  })
}

function selectCollision(index) {
  activeCollisionIndex = index

  // update feed card states
  document.querySelectorAll('.feed-card').forEach((card, i) => {
    card.classList.toggle('active', i === index)
  })

  const col = data.collisions[index]
  document.getElementById('detailEmpty').hidden = true
  const panel = document.getElementById('detailPanel')
  panel.hidden = false

  const pct = Math.round(col.intensity * 100)
  const stanceLabel = (stance) => stance === 'constraint' ? '위협받음' : '지지됨'
  const stanceClass = (stance) => stance === 'constraint' ? 'constraint' : 'support'

  document.getElementById('detailContent').innerHTML = `
    <div class="dc-head">
      <div class="dc-kicker">충돌 순간 · ${col.time}</div>
      <div class="dc-title">
        <span style="color:${col.side_a.color}">${col.side_a.label}</span>
        <span class="vs-icon">⚡</span>
        <span style="color:${col.side_b.color}">${col.side_b.label}</span>
      </div>
      <div class="dc-intensity-row">
        <div class="dc-intensity-bar"><span style="width:${pct}%"></span></div>
        <span class="dc-intensity-label">충돌 강도 ${pct}%</span>
      </div>
    </div>

    <div class="dc-sides">
      <div class="dc-side" style="--side-color:${col.side_a.color}">
        <style>.dc-side:first-child::before { background: ${col.side_a.color}; }</style>
        <div class="dc-side-label" style="color:${col.side_a.color}">한 쪽</div>
        <div class="dc-concept-name" style="color:${col.side_a.color}">${col.side_a.label}</div>
        <div class="dc-stance ${stanceClass(col.side_a.stance)}">
          ${col.side_a.stance === 'constraint' ? '⚠ ' : '✓ '}${stanceLabel(col.side_a.stance)}
        </div>
        <div class="dc-quote">${col.side_a.korean_text}</div>
        <div class="dc-src">
          <span style="color:${speakerColor(col.side_a.speaker)};font-weight:700">${col.side_a.speaker}</span>
          · ${col.side_a.time}
        </div>
      </div>

      <div class="dc-side" style="--side-color:${col.side_b.color}">
        <style>.dc-side:last-child::before { background: ${col.side_b.color}; }</style>
        <div class="dc-side-label" style="color:${col.side_b.color}">다른 쪽</div>
        <div class="dc-concept-name" style="color:${col.side_b.color}">${col.side_b.label}</div>
        <div class="dc-stance ${stanceClass(col.side_b.stance)}">
          ${col.side_b.stance === 'constraint' ? '⚠ ' : '✓ '}${stanceLabel(col.side_b.stance)}
        </div>
        <div class="dc-quote">${col.side_b.korean_text}</div>
        <div class="dc-src">
          <span style="color:${speakerColor(col.side_b.speaker)};font-weight:700">${col.side_b.speaker}</span>
          · ${col.side_b.time}
        </div>
      </div>
    </div>

    <div class="dc-bridge">
      <div class="dc-bridge-kicker">진행자 다리 질문</div>
      <div class="dc-bridge-q">${col.question}</div>
    </div>
  `

  // scroll card into view in feed
  const activeCard = document.querySelector('.feed-card.active')
  activeCard?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

// ── MAP VIEW ──────────────────────────────────────────────
const NODE_POSITIONS = {
  regional_survival:    { x: 0.50, y: 0.10 },
  resident_agency:      { x: 0.13, y: 0.40 },
  national_coordination:{ x: 0.87, y: 0.40 },
  procedural_legitimacy:{ x: 0.26, y: 0.72 },
  reform_momentum:      { x: 0.74, y: 0.72 },
  resource_distribution:{ x: 0.50, y: 0.90 },
  basic_rights:         { x: 0.09, y: 0.85 },
  livelihood_safety:    { x: 0.91, y: 0.85 },
}

function renderMap() {
  const svg = document.getElementById('mapSvg')
  const W = 800, H = 560

  // Compute max mentions for scaling
  const maxMentions = Math.max(...data.concepts.map(c => c.mentions || 1), 1)

  // Compute collision strength per pair for edge thickness
  const pairStrength = {}
  for (const col of data.collisions) {
    pairStrength[col.pair_id] = Math.max(pairStrength[col.pair_id] ?? 0, col.intensity)
  }

  // defs: glow filter
  let svgContent = `
    <defs>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="4" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
  `

  // Edges
  for (const pair of data.tension_pairs) {
    const posA = NODE_POSITIONS[pair.a]
    const posB = NODE_POSITIONS[pair.b]
    if (!posA || !posB) continue
    const x1 = posA.x * W, y1 = posA.y * H
    const x2 = posB.x * W, y2 = posB.y * H
    const strength = pairStrength[pair.id] ?? 0
    const strokeW = 1.5 + strength * 8
    const opacity = 0.25 + strength * 0.55
    const colCount = data.collisions.filter(c => c.pair_id === pair.id).length
    svgContent += `
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
        stroke="#ff5f3d" stroke-width="${strokeW.toFixed(1)}" stroke-opacity="${opacity.toFixed(2)}"
        stroke-linecap="round"/>
    `
    // edge label if collisions exist
    if (colCount > 0) {
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
      svgContent += `
        <rect x="${mx - 18}" y="${my - 10}" width="36" height="18" rx="9"
          fill="rgba(255,95,61,0.18)" stroke="rgba(255,95,61,0.4)" stroke-width="1"/>
        <text x="${mx}" y="${my + 4}" text-anchor="middle"
          font-size="11" font-weight="800" fill="#ff8c70" font-family="system-ui">${colCount}회</text>
      `
    }
  }

  // Nodes
  for (const concept of data.concepts) {
    const pos = NODE_POSITIONS[concept.id]
    if (!pos) continue
    const cx = pos.x * W, cy = pos.y * H
    const mentions = concept.mentions ?? 0
    const r = 18 + (mentions / maxMentions) * 28
    const total = (concept.support ?? 0) + (concept.constraint ?? 0) || 1
    const supportPct = (concept.support ?? 0) / total

    svgContent += `
      <circle cx="${cx}" cy="${cy}" r="${r + 6}" fill="${concept.color}" opacity="0.08"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${concept.color}" opacity="0.85"
        filter="url(#glow)"/>
    `

    // support arc overlay (top arc = support fraction)
    if (supportPct < 1 && supportPct > 0) {
      const angle = supportPct * 360
      const rad = (angle - 90) * Math.PI / 180
      const x2 = cx + r * Math.cos(rad)
      const y2 = cy + r * Math.sin(rad)
      const largeArc = angle > 180 ? 1 : 0
      svgContent += `
        <path d="M${cx},${cy - r} A${r},${r} 0 ${largeArc},1 ${x2.toFixed(1)},${y2.toFixed(1)} L${cx},${cy} Z"
          fill="rgba(62,207,160,0.25)"/>
      `
    }

    // label
    const labelY = cy + r + 16
    svgContent += `
      <text x="${cx}" y="${labelY}" text-anchor="middle"
        font-size="13" font-weight="800" fill="${concept.color}"
        font-family="'Apple SD Gothic Neo',system-ui"
        paint-order="stroke" stroke="rgba(12,17,23,0.85)" stroke-width="3"
      >${concept.label}</text>
      <text x="${cx}" y="${labelY + 14}" text-anchor="middle"
        font-size="10.5" fill="rgba(168,189,201,0.75)"
        font-family="system-ui" font-variant-numeric="tabular-nums"
        paint-order="stroke" stroke="rgba(12,17,23,0.7)" stroke-width="3"
      >${mentions}회</text>
    `
  }

  svg.innerHTML = svgContent
}

// ── CONCEPT LIST (map side panel) ─────────────────────────
function renderConceptList() {
  const container = document.getElementById('mapConceptList')
  container.innerHTML = ''

  const sorted = [...data.concepts].sort((a, b) => (b.mentions ?? 0) - (a.mentions ?? 0))

  for (const concept of sorted) {
    const total = (concept.support ?? 0) + (concept.constraint ?? 0) || 1
    const supportPct = Math.round(((concept.support ?? 0) / total) * 100)
    const constraintPct = 100 - supportPct

    const item = document.createElement('div')
    item.className = 'mc-item'
    item.innerHTML = `
      <div class="mc-head">
        <span class="mc-swatch" style="background:${concept.color}"></span>
        <span class="mc-name">${concept.label}</span>
        <span class="mc-mentions">${concept.mentions ?? 0}회</span>
      </div>
      <div class="mc-bar">
        <div class="good" style="width:${supportPct}%"></div>
        <div class="bad"  style="width:${constraintPct}%"></div>
      </div>
      <div class="mc-bar-label">
        <span>지지 ${supportPct}%</span>
        <span>위협 ${constraintPct}%</span>
      </div>
    `
    container.appendChild(item)
  }
}

// ── Boot ──────────────────────────────────────────────────
// Insert loading screen into DOM before init
const loadingEl = document.createElement('div')
loadingEl.id = 'loadingScreen'
loadingEl.textContent = '회의 데이터를 불러오는 중…'
document.body.appendChild(loadingEl)

init()
