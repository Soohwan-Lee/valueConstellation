import { z } from 'zod'

import { analyzeTranscript } from '@/lib/analyze'

/**
 * The analyse endpoint.
 *
 * Request handling only — validate, call the pipeline, shape the response. The
 * pipeline itself lives in `lib/analyze.ts` so that the committed examples are
 * produced by the same code that serves a paste.
 */

export const maxDuration = 60

const RequestSchema = z.object({
  transcript: z.string().min(1),
  /** Include facilitator speech in the map. Off by default. */
  includeModerators: z.boolean().optional(),
})

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status })
}

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return jsonError('OPENAI_API_KEY is not configured on the server.', 503)
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonError('Request body must be JSON.', 400)
  }

  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError('Expected { transcript: string }.', 400)
  }

  const outcome = await analyzeTranscript(parsed.data.transcript, {
    includeModerators: parsed.data.includeModerators,
  })

  if (!outcome.ok) return jsonError(outcome.error, outcome.status)
  return Response.json(outcome.result)
}
