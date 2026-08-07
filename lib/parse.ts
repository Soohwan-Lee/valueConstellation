/**
 * Speaker-attributed transcript parsing.
 *
 * Rule-based on purpose: for the formats below it is exact, instant, and free,
 * where an LLM would be slower, cost money, and occasionally reattribute a line
 * to the wrong person. The LLM's job is segmentation (lib/segment.ts), not this.
 */

/** Titles that trail a Korean name and should not distinguish two speakers. */
const HONORIFIC_SUFFIXES = [
  '위원장',
  '부위원장',
  '위원',
  '의원',
  '장관',
  '차관',
  '시장',
  '군수',
  '구청장',
  '교수',
  '박사',
  '변호사',
  '대표',
  '이사장',
  '이사',
  '팀장',
  '실장',
  '부장',
  '차장',
  '과장',
  '님',
  '씨',
]

/** Speaker labels that denote a facilitator rather than a stakeholder. */
const MODERATOR_LABELS = [
  '사회자',
  '진행자',
  '사회',
  '진행',
  '위원장',
  '의장',
  'moderator',
  'facilitator',
  'chair',
  'host',
]

export interface ParsedTurn {
  speaker: string
  text: string
  /** Timestamp as written, when the line carried one. */
  time?: string
}

export interface ParseResult {
  turns: ParsedTurn[]
  /** Canonical speaker names, in order of first appearance. */
  speakers: string[]
  /** Speakers detected as moderators. Excluded by default, but shown to the user. */
  moderators: string[]
  /** Raw label -> canonical name, so the UI can show what was merged. */
  aliasMap: Record<string, string>
  /** Lines that carried no speaker label and were attached to the previous turn. */
  continuationLines: number
  /** Lines discarded because they appeared before any speaker (titles, headers). */
  preambleLines: number
}

/**
 * Leading bracket/bullet markers used by Korean official minutes, e.g.
 * "◯ 김철수 위원" or "- 김철수:".
 */
const LEADING_MARKER = /^[◯○●▶▷□■※\-*·•]\s*/

/**
 * A speaker label at the start of a line.
 *
 * Matches "이름:", "[이름]", "이름 (00:12):", "이름 00:12:".
 * The name is capped at 20 chars so a long sentence containing a colon is not
 * mistaken for a label.
 */
const SPEAKER_PATTERNS: RegExp[] = [
  // [김철수] text   |   [김철수 00:12] text
  /^\[\s*(?<name>[^\]\n]{1,20}?)\s*(?:[(（]?\s*(?<time>\d{1,2}:\d{2}(?::\d{2})?)\s*[)）]?)?\s*\]\s*(?<text>.*)$/,
  // 김철수 (00:12): text   |   김철수 00:12: text   |   김철수: text
  /^(?<name>[^:：\n]{1,20}?)\s*(?:[(（]\s*(?<time>\d{1,2}:\d{2}(?::\d{2})?)\s*[)）]|\s(?<time2>\d{1,2}:\d{2}(?::\d{2})?))?\s*[:：]\s*(?<text>.*)$/,
]

/**
 * Korean official minutes (National Assembly, municipal councils, committees)
 * write the speaker as a bulleted "name + title" followed by whitespace and the
 * speech, with no colon:
 *
 *   ◯ 김철수 위원  이 사안은 신중히 봐야 합니다.
 *
 * This only applies to lines that carried a leading bullet marker, and the
 * label must end in a recognised title. Both conditions are needed: without
 * them, any sentence with two spaces in it would split into speaker + speech.
 */
const TITLED_SPEAKER_PATTERN = new RegExp(
  `^(?<name>[가-힣A-Za-z][가-힣A-Za-z\\s]{0,18}?\\s*(?:${HONORIFIC_SUFFIXES.join('|')}))` +
    `(?:\\s*[(（]\\s*(?<time>\\d{1,2}:\\d{2}(?::\\d{2})?)\\s*[)）])?` +
    `\\s{1,}(?<text>\\S.*)$`,
)

/** Strips honorific suffixes and whitespace so aliases collapse to one person. */
export function canonicalizeSpeaker(raw: string): string {
  let name = raw.trim().replace(/\s+/g, ' ')
  name = name.replace(/^[('"“”‘’\[]+|[)'"“”‘’\]]+$/g, '').trim()

  // Drop a trailing honorific, longest first so 부위원장 wins over 위원장.
  const suffixes = [...HONORIFIC_SUFFIXES].sort((a, b) => b.length - a.length)
  for (const suffix of suffixes) {
    if (name.length > suffix.length && name.endsWith(suffix)) {
      const stem = name.slice(0, -suffix.length).trim()
      // Only strip when a plausible name remains — "위원장" alone is a role.
      if (stem.length >= 2) {
        name = stem
        break
      }
    }
  }

  // Korean names are written without internal spaces: "김 철수" -> "김철수".
  if (/^[가-힣]+(\s[가-힣]+)+$/.test(name) && name.replace(/\s/g, '').length <= 5) {
    name = name.replace(/\s/g, '')
  }

  return name
}

/**
 * Whether a label denotes a facilitator rather than a stakeholder.
 *
 * Matched exactly, with only an honorific allowed to follow. An unanchored
 * prefix test would classify 사회복지사 (social worker), 사회학과 교수
 * (sociology professor), and chairperson as moderators — and since moderators
 * are excluded by default, that would silently delete real stakeholders from a
 * deliberation map.
 */
export function isModerator(speaker: string): boolean {
  const lowered = speaker.trim().toLowerCase()
  return MODERATOR_LABELS.some((label) => {
    const l = label.toLowerCase()
    if (lowered === l) return true
    // Allow a bare honorific after the role: "사회자님", "위원장님".
    return HONORIFIC_SUFFIXES.some(
      (suffix) => lowered === l + suffix.toLowerCase(),
    )
  })
}

/** A line that is only a timestamp, e.g. "00:50" or "[01:20:33]". */
const TIMESTAMP_ONLY = /^[[(（]?\s*\d{1,2}:\d{2}(?::\d{2})?\s*[)）\]]?$/

/**
 * A timestamp in brackets before the speaker label:
 *
 *   [00:03] Dave: 저는 예정대로 가야 한다고 봅니다.
 *
 * The form every transcription export and every video platform writes. Without
 * this the label patterns read "[00" as the name, reject it for being mostly
 * digits, and the whole line is swallowed as a continuation of whoever spoke
 * last — so a timestamped paste silently loses one speaker's every word.
 *
 * Only the bracketed form is stripped. A bare "00:03 Dave: ..." is left to the
 * label patterns, since a leading number with no brackets is as likely to be a
 * clause as a clock.
 */
const LEADING_TIMESTAMP =
  /^[[(（]\s*(?<time>\d{1,2}:\d{2}(?::\d{2})?)\s*[)）\]]\s*(?=\S)/

/**
 * A speaker header on its own line, with the speech following:
 *
 *   사회자 00:00
 *   자 두 번째 토론 주제로 넘어가겠습니다.
 *
 * Common in transcription-tool exports (Clova, Otter, Daglo). Without this the
 * timestamp's colon is read as the label separator, producing a distinct phantom
 * speaker for every minute mark — "정의당 00", "정의당 02", and so on.
 */
const SPEAKER_HEADER_LINE =
  /^(?<name>.{1,30}?)\s+(?<time>\d{1,2}:\d{2}(?::\d{2})?)\s*$/

/**
 * Field labels common in Korean minutes headers. Without this, "장소: 시청 3층"
 * ("Location: City Hall 3F") becomes a speaker named 장소.
 */
const HEADER_FIELD_LABELS = [
  '장소',
  '일시',
  '날짜',
  '시간',
  '참석',
  '참석자',
  '불참',
  '안건',
  '제목',
  '작성자',
  '기록',
  '배석',
  '의결사항',
  'date',
  'time',
  'location',
  'venue',
  'attendees',
  'present',
  'agenda',
  'subject',
]

/**
 * A label is only credible if it looks like a name. This rejects prose that
 * happens to contain a colon ("제 생각은: 그렇습니다"), bare timestamps, and
 * minutes-header fields.
 */
function looksLikeSpeakerLabel(name: string): boolean {
  if (!name || name.length > 20) return false
  // A timestamp is not a speaker: "00:50" would otherwise yield speaker "00".
  if (/^\d+$/.test(name)) return false
  if (TIMESTAMP_ONLY.test(name)) return false
  // Recording metadata, e.g. "2026.05.21 Thu AM 11" from a transcription export.
  if (/\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2}/.test(name)) return false
  if (/\b(AM|PM)\b/i.test(name)) return false
  // A label that is mostly digits is a measurement, not a name.
  if ((name.replace(/\D/g, '').length / name.length) > 0.5) return false
  // Header fields describe the meeting, not a participant.
  if (HEADER_FIELD_LABELS.includes(name.trim().toLowerCase())) return false
  // Sentence-ending punctuation means we are mid-prose, not at a label.
  if (/[.!?。,]$/.test(name)) return false
  // Korean sentence endings that would not appear in a name.
  if (/(습니다|입니다|however|therefore)$/i.test(name)) return false
  // Connective/clausal endings marking prose rather than a label.
  if (/(하면|말하면|정리하면|보면|때문|결과)$/.test(name)) return false
  // Particles marking this as a clause rather than a label.
  if (/(은|는|이|가|을|를|에서|으로|와|과)$/.test(name) && name.length > 4) return false
  return true
}

export function parseTranscript(input: string): ParseResult {
  const lines = input.split(/\r?\n/)
  const turns: ParsedTurn[] = []
  const aliasMap: Record<string, string> = {}
  const order: string[] = []
  let continuationLines = 0
  /** Lines discarded before any speaker was seen (titles, headers). */
  let preambleLines = 0
  /** Timestamp from a standalone line, applied to the next turn. */
  let pendingTime: string | undefined

  for (const rawLine of lines) {
    const trimmedRaw = rawLine.trim()
    const hadMarker = LEADING_MARKER.test(trimmedRaw)
    let line = trimmedRaw.replace(LEADING_MARKER, '').trim()
    if (!line) continue

    // A standalone timestamp is a structural marker, not speech. Record it so
    // the following turn can carry it, and never treat it as a speaker.
    if (TIMESTAMP_ONLY.test(line)) {
      pendingTime = line.replace(/[^\d:]/g, '')
      continue
    }

    // "[00:03] Dave: ..." — the time belongs to the turn that follows it on the
    // same line, so it is lifted off before the label is read.
    const leading = LEADING_TIMESTAMP.exec(line)
    if (leading?.groups) {
      pendingTime = leading.groups.time
      line = line.replace(LEADING_TIMESTAMP, '')
    }

    // "이름 00:00" alone on a line: open a turn whose speech follows.
    const header = SPEAKER_HEADER_LINE.exec(line)
    if (header?.groups) {
      const rawName = header.groups.name.trim()
      if (looksLikeSpeakerLabel(rawName)) {
        const canonical = canonicalizeSpeaker(rawName)
        if (canonical) {
          aliasMap[rawName] = canonical
          if (!order.includes(canonical)) order.push(canonical)
          pendingTime = undefined
          turns.push({
            speaker: canonical,
            text: '',
            time: header.groups.time,
          })
          continue
        }
      }
    }

    let matched = false

    // Official-minutes form, only for bulleted lines (see TITLED_SPEAKER_PATTERN).
    if (hadMarker) {
      const m = TITLED_SPEAKER_PATTERN.exec(line)
      if (m?.groups) {
        const rawName = (m.groups.name ?? '').trim()
        const text = (m.groups.text ?? '').trim()
        const canonical = canonicalizeSpeaker(rawName)

        if (canonical && text) {
          aliasMap[rawName] = canonical
          if (!order.includes(canonical)) order.push(canonical)
          const time = m.groups.time ?? pendingTime
          pendingTime = undefined
          turns.push({ speaker: canonical, text, ...(time ? { time } : {}) })
          continue
        }
      }
    }

    for (const pattern of SPEAKER_PATTERNS) {
      const m = pattern.exec(line)
      if (!m?.groups) continue

      const rawName = (m.groups.name ?? '').trim()
      if (!looksLikeSpeakerLabel(rawName)) continue

      const text = (m.groups.text ?? '').trim()
      const time = m.groups.time ?? m.groups.time2 ?? pendingTime

      const canonical = canonicalizeSpeaker(rawName)
      if (!canonical) continue

      pendingTime = undefined
      aliasMap[rawName] = canonical
      if (!order.includes(canonical)) order.push(canonical)

      // A label with no text yet — the speech is on following lines.
      turns.push({ speaker: canonical, text, ...(time ? { time } : {}) })
      matched = true
      break
    }

    if (matched) continue

    // No label: continuation of the current speaker's turn.
    const last = turns[turns.length - 1]
    if (last) {
      last.text = last.text ? `${last.text} ${line}` : line
      continuationLines += 1
    } else {
      // Before any speaker: a title or header block. Counted so that silently
      // discarded input is visible in diagnostics.
      preambleLines += 1
    }
  }

  // Drop turns that never accumulated text.
  const withText = turns.filter((t) => t.text.trim().length > 0)

  const speakers = order.filter((s) => withText.some((t) => t.speaker === s))
  const moderators = speakers.filter(isModerator)

  return {
    turns: withText,
    speakers,
    moderators,
    aliasMap,
    continuationLines,
    preambleLines,
  }
}
