import { z } from 'zod'
import type { Utterance } from './types.ts'

/**
 * Who answered whom, and what they did to it.
 *
 * The map says where people ended up and says nothing about how they got there.
 * A meeting is not a set of positions; it is people taking each other's
 * arguments apart in an order, and two maps with identical coordinates can come
 * from a room that argued and a room that took turns monologuing.
 *
 * Extracted rather than inferred from adjacency. Adjacency is wrong often
 * enough to matter — the next person to speak is frequently continuing their
 * own point, and the reply to something said ten minutes ago is the one worth
 * seeing — so this asks the model and then throws away everything it cannot
 * check: an edge must point at real statements, backwards in time, between two
 * different people. What survives is a claim a reader can go and verify by
 * reading both statements, which is the standard every other generated thing in
 * this codebase is held to.
 *
 * Nothing downstream requires an edge. A transcript where nobody engaged
 * produces none, and that is a finding rather than a gap.
 */

export const EXCHANGE_KINDS = [
  'challenges',
  'builds',
  'concedes',
  'answers',
  'reframes',
] as const

export type ExchangeKind = (typeof EXCHANGE_KINDS)[number]

const ExchangeSchema = z.object({
  from: z.string().describe('Id of the later statement, the one responding.'),
  to: z.string().describe('Id of the earlier statement it responds to.'),
  kind: z.enum(EXCHANGE_KINDS).describe(
    'challenges: disputes it. builds: accepts and extends it. ' +
      'concedes: gives ground to it. answers: supplies what it asked for. ' +
      'reframes: accepts the fact and changes what it means.',
  ),
  note: z
    .object({ ko: z.string(), en: z.string() })
    .describe('Under 12 words: what the response does to the earlier point.'),
})

export const ExchangesSchema = z.object({
  exchanges: z.array(ExchangeSchema),
})

export type Exchange = z.infer<typeof ExchangeSchema>

export const EXCHANGE_SYSTEM_PROMPT = `You trace how a meeting's statements answer one another.

You are given every substantive statement in order, each with an id, a speaker and a time.

Report each place where one statement is clearly responding to an earlier statement by a DIFFERENT speaker. For each:
- "from": the later statement, "to": the earlier one it answers.
- "kind": challenges | builds | concedes | answers | reframes.
- "note": under 12 words, what it does to the earlier point — "cost is real but hiring back is slower", not "disagrees".

Rules:
- Only where the response is visible in the words: it picks up the earlier statement's subject, term, number or objection. Two people arguing separately about the same agenda item are NOT responding to each other.
- Not every statement responds to something. A speaker continuing their own point is not an exchange. Report nothing rather than guessing, and expect to report far fewer exchanges than there are statements.
- "to" must always come before "from" in the list, and the two must have different speakers.
- One "from" answers one "to". Pick the statement it engages most directly.
- Both languages for "note". The Korean is primary and reads naturally.
- Neutral register: report the move, never say who was right.`

export function formatForExchanges(utterances: Utterance[]): string {
  return utterances
    .map((u) => `[${u.id}] ${u.speaker}${u.at ? ` (${u.at})` : ''}: ${u.text}`)
    .join('\n')
}

/**
 * Drops every edge the transcript does not support.
 *
 * All four checks have to be here rather than in the prompt. An edge pointing
 * forwards in time would draw a reply to something not yet said; an edge
 * between one speaker's own statements would show a person arguing with
 * themselves; a duplicate would thicken one line for no reason. Each is a
 * picture that reads as a finding, and none of them costs the model anything to
 * produce.
 */
export function verifyExchanges(
  exchanges: Exchange[],
  utterances: Utterance[],
): { kept: Exchange[]; dropped: number } {
  const byId = new Map(utterances.map((u) => [u.id, u]))
  const seen = new Set<string>()
  const kept: Exchange[] = []
  let dropped = 0

  for (const e of exchanges) {
    const from = byId.get(e.from)
    const to = byId.get(e.to)
    const key = `${e.from}->${e.to}`
    if (
      !from ||
      !to ||
      from.index <= to.index ||
      from.speaker === to.speaker ||
      seen.has(key)
    ) {
      dropped += 1
      continue
    }
    seen.add(key)
    kept.push(e)
  }

  return { kept, dropped }
}

/** Every exchange touching a statement, for the inspector. */
export function exchangesFor(exchanges: Exchange[], id: string): Exchange[] {
  return exchanges.filter((e) => e.from === id || e.to === id)
}
