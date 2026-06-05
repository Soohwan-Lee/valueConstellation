import { createReadStream, existsSync, readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const REPO_ROOT = resolve(__dirname, '..', '..')
const PUBLIC_DIR = join(__dirname, 'public')
const RESULTS_DIR = join(REPO_ROOT, 'results', 'policy_discussion')
const PERSONAL_ENV = '/Users/soohwanlee/Desktop/soohwan/80 ORGANIZE/82 Tool/.env'

const PORT = Number(process.env.PORT || 5177)
const MODEL = 'gpt-5.4-mini'

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

  const headers = rows.shift().map((h) => h.replace(/^\uFEFF/, ''))
  return rows.map((values) => Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ''])))
}

function topValues(values, limit = 5) {
  return VALUE_KEYS
    .map((key) => ({
      key,
      label: VALUE_LABELS[key],
      signed: values[key]?.signed ?? 0,
      support: values[key]?.support ?? 0,
      constraint: values[key]?.constraint ?? 0,
      presence: values[key]?.presence ?? 0,
    }))
    .sort((a, b) => Math.abs(b.signed) - Math.abs(a.signed))
    .slice(0, limit)
}

function loadData() {
  if (cachedData) return cachedData

  const projectionRows = parseCsv(readFileSync(join(RESULTS_DIR, 'full_argument_projection_compare.csv'), 'utf8'))
  const vectorRows = parseCsv(readFileSync(join(RESULTS_DIR, 'full_argument_vectors.csv'), 'utf8'))
  const metadata = JSON.parse(readFileSync(join(RESULTS_DIR, 'full_argument_projection_compare_metadata.json'), 'utf8'))
  const vectorById = new Map()

  for (const row of vectorRows) {
    const values = {}
    for (const key of VALUE_KEYS) {
      values[key] = {
        presence: Number(row[`presence__${key}`] || 0),
        signed: Number(row[`signed__${key}`] || 0),
        support: Number(row[`support__${key}`] || 0),
        constraint: Number(row[`constraint__${key}`] || 0),
      }
    }
    vectorById.set(row.unit_id, values)
  }

  const argumentsById = new Map()
  for (const row of projectionRows) {
    if (row.projection_method !== 'mds') continue
    const values = vectorById.get(row.unit_id)
    if (!values) continue
    argumentsById.set(row.unit_id, {
      unit_id: row.unit_id,
      speaker: row.speaker,
      time: row.time,
      korean_text: row.korean_text,
      english_text: row.english_text,
      x: Number(row.x || 0),
      y: Number(row.y || 0),
      cluster_id: Number(row.cluster_id || 0),
      values,
      top_values: topValues(values),
    })
  }

  const argumentsList = [...argumentsById.values()]
  const labels = metadata.llm_labels ?? {}
  const labelByCluster = new Map((labels.clusters ?? []).map((c) => [c.cluster_id, c.label]))
  const clusterMeta = metadata.methods?.pca?.clusters ?? metadata.methods?.mds?.clusters ?? []
  const clusters = clusterMeta.map((cluster) => ({
    cluster_id: cluster.cluster_id,
    size: cluster.size,
    label: labelByCluster.get(cluster.cluster_id) ?? `Cluster ${cluster.cluster_id}`,
    examples: cluster.examples ?? [],
    top_values: (cluster.top_signed_values ?? []).slice(0, 5).map((v) => ({
      key: v.value,
      label: VALUE_LABELS[v.value] ?? v.value,
      signed: v.mean_signed,
    })),
  }))

  const speakers = [...new Set(argumentsList.map((arg) => arg.speaker))].sort()
  const globalValues = VALUE_KEYS.map((key) => {
    const meanAbs = mean(argumentsList.map((arg) => Math.abs(arg.values[key].signed)))
    const meanSigned = mean(argumentsList.map((arg) => arg.values[key].signed))
    return { key, label: VALUE_LABELS[key], mean_abs: meanAbs, mean_signed: meanSigned }
  }).sort((a, b) => a.mean_abs - b.mean_abs)

  cachedData = {
    arguments: argumentsList,
    clusters,
    speakers,
    axis: {
      x: labels.x_axis_label ?? 'MDS X',
      y: labels.y_axis_label ?? 'MDS Y',
    },
    low_coverage_values: globalValues.slice(0, 7),
    high_coverage_values: [...globalValues].reverse().slice(0, 7),
    reference_html: '/reference/full_argument_active_mds_party_cluster.html',
  }

  return cachedData
}

function mean(values) {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function compactContext(data) {
  return {
    topic: 'Korean policy discussion about regional extinction, administrative integration, decentralization, safety, finance, and local autonomy.',
    axis: data.axis,
    speakers: data.speakers,
    clusters: data.clusters.map((cluster) => ({
      id: cluster.cluster_id,
      label: cluster.label,
      size: cluster.size,
      top_values: cluster.top_values,
      examples: cluster.examples.slice(0, 2),
    })),
    low_coverage_values: data.low_coverage_values,
    high_coverage_values: data.high_coverage_values,
    speaker_profiles: data.speakers.map((speaker) => {
      const args = data.arguments.filter((arg) => arg.speaker === speaker)
      const valueMeans = VALUE_KEYS.map((key) => ({
        key,
        label: VALUE_LABELS[key],
        mean_signed: mean(args.map((arg) => arg.values[key].signed)),
      })).sort((a, b) => Math.abs(b.mean_signed) - Math.abs(a.mean_signed)).slice(0, 5)
      const clusterCounts = new Map()
      for (const arg of args) {
        clusterCounts.set(arg.cluster_id, (clusterCounts.get(arg.cluster_id) ?? 0) + 1)
      }
      return {
        speaker,
        argument_count: args.length,
        top_values: valueMeans,
        dominant_clusters: [...clusterCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([cluster_id, count]) => ({
            cluster_id,
            count,
            label: data.clusters.find((cluster) => cluster.cluster_id === cluster_id)?.label ?? `C${cluster_id}`,
          })),
        examples: args.slice(0, 4).map((arg) => ({
          time: arg.time,
          cluster_id: arg.cluster_id,
          korean_text: arg.korean_text,
          top_values: arg.top_values.slice(0, 3),
        })),
      }
    }),
    sample_arguments: data.arguments.slice(0, 30).map((arg) => ({
      speaker: arg.speaker,
      time: arg.time,
      cluster_id: arg.cluster_id,
      korean_text: arg.korean_text,
      top_values: arg.top_values.slice(0, 3),
    })),
  }
}

function fallback(kind, payload) {
  if (kind === 'stakeholderSuggest') {
    return {
      mode: 'fallback',
      title: '추가할 수 있는 Empty Chair 후보',
      candidates: [
        {
          name: '읍면동 생활권 주민',
          why_absent: '행정통합과 분권이 실제 이동, 민원, 돌봄, 교육 접근성을 어떻게 바꾸는지 생활권 단위 목소리가 약합니다.',
          likely_values: ['개인 안전', '배려', '자기방향성: 행동'],
          suggested_question: '행정구역 개편이 내 생활권에서 가장 먼저 바꾸는 서비스는 무엇인가요?',
        },
        {
          name: '현장 행정 실무자',
          why_absent: '권한 이전과 재정 논의는 있지만 실제 책임 소재, 업무 전환, 서비스 공백을 감당하는 실무 관점이 덜 보입니다.',
          likely_values: ['신뢰/책임', '규칙 순응', '사회 안전'],
          suggested_question: '이 개편은 현장의 책임을 명확히 하나요, 아니면 더 많은 부담을 떠넘기나요?',
        },
        {
          name: '이동약자·돌봄 이용자',
          why_absent: '지역 소멸과 안전을 말하지만 의료, 교통, 돌봄 접근성의 개인 안전 관점은 약하게 다뤄집니다.',
          likely_values: ['개인 안전', '배려', '보편주의: 관심'],
          suggested_question: '이 결정은 이동과 돌봄 접근성이 낮은 주민에게 어떤 보완 조건을 제공해야 하나요?',
        },
      ],
    }
  }

  if (kind === 'questionAnswer') {
    const speakers = payload?.context?.speakers ?? ['정의당', '민주당', '개혁신당', '국민의힘', '조국혁신당']
    return {
      mode: 'fallback',
      title: '정당별 예상 응답',
      party_responses: speakers.map((speaker) => ({
        speaker,
        text: `${speaker}은/는 이 질문을 현재 주장과 연결해 생활권 단위의 서비스 접근성, 재정 책임, 주민 결정권 중 무엇을 더 확인해야 하는지 답할 가능성이 있습니다.`,
      })),
      follow_up_question: '정당별 답변 중 실제 결정문에 남겨야 할 unresolved tension은 무엇인가요?',
    }
  }

  if (kind === 'checkin') {
    return {
      mode: 'fallback',
      title: '첫 번째 체크인: 부재한 목소리 후보',
      absent_stakeholders: [
        {
          name: '지방 소멸 지역의 청년 주민',
          why_absent: '정당별 정책 프레임은 많이 보이지만, 실제 거주자가 체감하는 선택권과 이주 압박은 직접 발화되지 않았습니다.',
          likely_values: ['자기방향성: 행동', '사회 안전', '보편주의: 관심'],
          prompt: '청년 주민의 관점에서 행정통합과 분권 개혁은 삶의 선택지를 넓히는가, 아니면 떠날 수밖에 없는 조건을 고정하는가?',
        },
        {
          name: '소규모 기초자치단체 공무원',
          why_absent: '제도 개편과 재정 위기 논의는 있으나, 현장에서 서비스를 유지하는 행정 주체의 부담은 약하게 드러납니다.',
          likely_values: ['신뢰/책임', '규칙 순응', '사회 안전'],
          prompt: '현장 공무원에게 이 개편은 책임 소재를 명확하게 만드는가, 아니면 더 많은 부담을 떠넘기는가?',
        },
        {
          name: '돌봄·복지 서비스 이용자',
          why_absent: '지역 소멸과 재정 논의가 거시적 수준에 머물러, 서비스 접근성이 떨어지는 주민의 관점이 비어 있습니다.',
          likely_values: ['배려', '보편주의: 관심', '개인 안전'],
          prompt: '행정구역 개편이 복지·돌봄 서비스 접근성을 실제로 개선한다는 증거는 무엇인가?',
        },
      ],
      blind_spots: [
        '정책 효율성과 생존 위기 논의는 강하지만, 영향을 받는 주민의 절차적 권리와 설명 가능성은 약합니다.',
        '중앙 대 지방의 권한 충돌은 보이지만, 개편 이후 책임을 누가 부담하는지에 대한 관점은 덜 탐색되었습니다.',
      ],
      next_question: '이 회의에서 반드시 방 안에 초대해야 할 “빈 의자”는 누구이며, 그 이유를 결정문에 어떻게 남길까요?',
    }
  }

  if (kind === 'tension') {
    const a = payload?.cluster_a?.label ?? 'Cluster A'
    const b = payload?.cluster_b?.label ?? 'Cluster B'
    return {
      mode: 'fallback',
      title: `${a} ↔ ${b} 가치 긴장`,
      tension_naming: `${a}이 강조하는 가치와 ${b}이 강조하는 가치 사이의 긴장`,
      is_real_conflict: '두 cluster가 실제로 충돌하는지, 아니면 서로 다른 시간 범위나 적용 범위의 관심사를 말하는지 먼저 확인할 필요가 있습니다.',
      interpretation: '한쪽은 집단 안전·질서·책임을, 다른 쪽은 자율·변화·참여를 강조하는 경향이 있어, 같은 결정에서 두 가치를 동시에 충족하기 어려울 수 있습니다.',
      facilitator_question: '이 긴장은 이번 결정에서 해결해야 하는 것인가요, 아니면 결정문에 trade-off로 남겨야 하는 것인가요?',
      target_audience: '전체 그룹',
      why_now: '두 입장이 표면적으로는 다른 주제처럼 보이지만, 실제로는 동일한 가치 축에서 반대 방향을 가리킬 수 있습니다.',
      delivery: '진행자가 두 cluster의 대표 발화를 나란히 읽고, 같은 결정에서 둘을 어떻게 다룰지 1분씩 응답을 받습니다.',
      record_as_tradeoff_hint: '완전한 합의가 어려우면 unresolved tension으로 결정문에 남기는 것을 고려하세요.',
    }
  }

  if (kind === 'rationale') {
    const traces = payload?.decision_traces ?? []
    const deferred = traces.filter((t) => /defer/i.test(t.label ?? ''))
    return {
      mode: 'fallback',
      title: '결정문 초안 (AI가 작성한 boundary 산출물)',
      decision: '현재까지의 논의를 보면, 그룹은 제도·재정 효율과 주민 생활권·참여 가치를 동시에 고려한 제한적·단계적 접근을 향하는 것으로 보입니다. (이 문장은 그룹이 직접 수정해야 합니다.)',
      prioritized_values: ['사회 안전', '신뢰/책임', '보편주의: 관심'],
      accepted_tradeoffs: ['단기 행정 효율을 일부 양보하더라도 주민 설명·참여 절차를 확보한다.'],
      unresolved_tensions: [
        ...deferred.map((t) => `이월됨: ${t.question ?? ''}`.trim()),
        '중앙 주도 효율과 지방 자율 결정권 사이의 긴장은 아직 합의되지 않았습니다.',
      ],
      justifying_context: '지역 소멸과 재정 위기라는 높은 불확실성 속에서, 되돌리기 어려운 통합을 한 번에 추진하기보다 검증 가능한 단계로 나누는 것이 정당화됩니다.',
      revisit_conditions: ['주민 설명·참여 절차가 형식적으로만 운영될 경우', '재정 부담이 예상보다 크게 증가할 경우', '취약 지역·이동약자에 대한 부정적 영향이 확인될 경우'],
      caveat: '이 초안은 AI가 그룹의 결정 기록을 합성한 boundary 산출물이며, 권위 있는 결정이 아닙니다. 그룹의 편집과 동의가 필요합니다.',
    }
  }

  if (kind === 'emptyChair') {
    const stakeholder = stakeholderName(payload?.stakeholder)
    return {
      mode: 'fallback',
      stakeholder,
      utterance: `저는 ${stakeholder}의 관점에서 묻고 싶습니다. 지금 논의는 제도와 권한의 문제를 많이 다루지만, 이 결정이 제 일상과 선택권에 어떤 변화를 만드는지는 아직 충분히 설명되지 않았습니다.`,
      label: `[AI가 생성한 가상의 ${stakeholder} 관점]`,
      inclusion_question: '이 목소리를 현재 결정에 반영한다면 어떤 조건이나 보완 장치가 추가되어야 하나요?',
      possible_map_label: '부재 이해관계자 관점',
    }
  }

  return {
    mode: 'fallback',
    title: '클릭한 빈 영역의 가능한 가치 blind spot',
    area_label: '절차적 설명 책임 / 영향받는 주민 관점',
    interpretation: '이 영역은 이미 나온 정당별 정책 주장 사이에서, 실제 영향을 받는 사람이 어떤 설명과 이의제기 권리를 갖는지 묻는 공간으로 해석할 수 있습니다.',
    missing_values: ['보편주의: 관용', '배려', '자기방향성: 행동'],
    absent_stakeholders: ['지역 주민', '청년 유권자', '현장 행정 담당자'],
    discussion_question: '이 관점을 포함하면 현재 정책 대안의 정당화 방식이 어떻게 달라져야 하나요?',
    decision_log_suggestion: '이번 회의에서 이 관점을 탐색할지, 다음 회의로 이월할지, 의도적으로 제외할지 명시적으로 기록합니다.',
  }
}

function stakeholderName(stakeholder) {
  if (!stakeholder) return '부재 이해관계자'
  if (typeof stakeholder === 'string') return stakeholder
  return stakeholder.name ?? stakeholder.role ?? stakeholder.stakeholder ?? stakeholder.speaker ?? stakeholder.label ?? '부재 이해관계자'
}

async function callOpenAI(kind, payload) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return fallback(kind, payload)

  const prompts = {
    checkin: 'You are a Korean HCI research prototype for Value Constellation. Identify absent stakeholders, value blind spots, and facilitator questions in a multi-stakeholder policy deliberation. Return compact JSON ONLY with this EXACT FLAT schema (all keys in English, all user-facing strings in Korean): {"title": string, "absent_stakeholders": [{"name": string, "why_absent": string, "likely_values": [string], "prompt": string}], "blind_spots": [string], "next_question": string, "reopen_prompts": [{"prompt": string, "target": string}]}. Use only these exact key names.',
    blindSpot: 'You are a Korean HCI research prototype. A user clicked a sparse area in a value landscape. The clicked_zone.weak_19d_values list is the measured signal: refined Schwartz values barely expressed among nearby arguments (low mean_abs_signed). Ground your interpretation in those weak values, not only the 2D emptiness. Return compact JSON ONLY with this EXACT FLAT schema (all values are plain strings or arrays of strings, NO nested objects): {"title": string, "interpretation": string, "missing_values": [string], "absent_stakeholders": [string], "facilitator_question": string, "target_audience": string, "why_now": string, "delivery": string, "decision_log_suggestion": string}. Keep all user-facing strings in Korean.',
    emptyChair: 'You are a Korean HCI research prototype. Generate one clearly labeled first-person Empty Chair utterance for an absent stakeholder. Do not pretend it is real evidence. Return compact JSON only with this schema: {utterance:{label,speaker,text,reopen_prompt}, value_map_addition:{add_to_cluster_id,target_values:[{key,label,direction,strength}],note}}.',
    stakeholderSuggest: 'You are a Korean HCI research prototype. Suggest absent stakeholder Empty Chair candidates for the current deliberation. Return compact JSON only.',
    questionAnswer: 'You are a Korean HCI research prototype. Predict how each actual participant/speaker would respond to the current facilitator question, using the provided speaker_profiles and examples as in-context evidence. In this dataset speakers are political parties, so return one response per party by party name. In other meetings, use actual participant names from the context, never generic Participant A/B labels. Do not answer as a facilitator. Return compact JSON only with party_responses: [{speaker, text}] and follow_up_question.',
    tension: 'You are a Korean HCI research prototype acting as a computational boundary object. The user clicked two value clusters (cluster_a, cluster_b) to examine a possible value tension between them, using their top 19D signed Schwartz values as evidence. Do NOT resolve the tension or pick a winner. Help the group name and examine it. Return compact JSON ONLY with this EXACT FLAT schema (plain strings or arrays of strings, NO nested objects): {"title": string, "tension_naming": string (name the underlying value tension, e.g. "안전 vs 자율"), "is_real_conflict": string (is this a real value conflict, or two different time-horizons / scopes of concern?), "interpretation": string, "facilitator_question": string (one question that helps the group decide whether to resolve this or record it as a trade-off), "target_audience": string, "why_now": string, "delivery": string, "record_as_tradeoff_hint": string (if this looks like a trade-off to keep in the decision rather than resolve, say why)}. Keep all user-facing strings in Korean.',
    rationale: 'You are a Korean HCI research prototype acting as a computational boundary object for group decision-making. Given the group\'s recorded decisions (Explore/Defer/Exclude over probe questions), the Empty Chair utterances they surfaced, and the active value clusters, compose a DRAFT decision rationale. You do NOT decide for the group; you draft text they will edit. Critically, do NOT collapse disagreement into false consensus: preserve unresolved tensions explicitly. Return compact JSON ONLY with this EXACT FLAT schema (plain strings or arrays of strings, NO nested objects): {"title": string, "decision": string (what the group appears to be deciding, hedged), "prioritized_values": [string], "accepted_tradeoffs": [string], "unresolved_tensions": [string] (value conflicts NOT resolved; include anything marked Defer and any genuine conflict; never fabricate consensus), "justifying_context": string, "revisit_conditions": [string] (what conditions should trigger reopening this decision), "caveat": string (a one-line reminder that this is an AI-drafted boundary artifact, not an authoritative decision)}. Keep all user-facing strings in Korean.',
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
        { role: 'system', content: prompts[kind] },
        {
          role: 'user',
          content: [
            'Return JSON with Korean user-facing strings.',
            'Do not recommend a final decision. Generate prompts that reopen deliberation.',
            'For questionAnswer, produce participant-specific expected responses grounded in their prior value signals and example utterances.',
            'Use this context:',
            JSON.stringify(payload),
          ].join('\n'),
        },
      ],
      max_output_tokens: 3000,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    return { ...fallback(kind, payload), api_error: `OpenAI HTTP ${response.status}: ${errorText.slice(0, 240)}` }
  }

  const json = await response.json()
  const text = extractResponseText(json)
  try {
    return JSON.parse(text)
  } catch {
    return { ...fallback(kind, payload), raw_model_text: text }
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

    if (req.method === 'GET' && url.pathname === '/api/data') {
      sendJson(res, loadData())
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/checkin') {
      const data = loadData()
      sendJson(res, await callOpenAI('checkin', compactContext(data)))
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/blind-spot') {
      const data = loadData()
      const payload = await readJson(req)
      sendJson(res, await callOpenAI('blindSpot', { ...payload, context: compactContext(data) }))
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/empty-chair') {
      const data = loadData()
      const payload = await readJson(req)
      sendJson(res, await callOpenAI('emptyChair', { ...payload, context: compactContext(data) }))
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/stakeholder-suggestions') {
      const data = loadData()
      const payload = await readJson(req)
      sendJson(res, await callOpenAI('stakeholderSuggest', { ...payload, context: compactContext(data) }))
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/answer-question') {
      const data = loadData()
      const payload = await readJson(req)
      sendJson(res, await callOpenAI('questionAnswer', { ...payload, context: compactContext(data) }))
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/tension') {
      const data = loadData()
      const payload = await readJson(req)
      sendJson(res, await callOpenAI('tension', { ...payload, context: compactContext(data) }))
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/rationale') {
      const data = loadData()
      const payload = await readJson(req)
      sendJson(res, await callOpenAI('rationale', { ...payload, context: compactContext(data) }))
      return
    }

    if (req.method === 'GET' && url.pathname.startsWith('/reference/')) {
      const safeName = url.pathname.replace('/reference/', '').replace(/\.\./g, '')
      const filePath = join(RESULTS_DIR, 'figures', safeName)
      if (existsSync(filePath)) {
        serveFile(res, filePath)
        return
      }
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
  console.log(`Absent Stakeholder prototype: http://localhost:${PORT}`)
  console.log(`Model: ${MODEL}`)
})
