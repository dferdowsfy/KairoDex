export const runtime = 'edge'

import { NextRequest } from 'next/server'
import { aiComplete } from '@/lib/ai'

/*
POST /api/contracts/apply
{ contractTemplate: string, naturalChanges: string, clientContext?: any }
-> returns { updated: string, summary: string }
*/
export async function POST(req: NextRequest) {
  try {
    const { contractTemplate, naturalChanges, clientContext } = await req.json()
    if (!contractTemplate || !naturalChanges) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 })
    }
  const system = `You are an expert real estate contracts editor.
Apply EVERY requested change to the contract text precisely.

RULES:
1. Edit the original contract directly; don't paraphrase.
2. For instructions like "change date to <Month Day, Year>", replace the first date-like token with the new date exactly.
3. Apply all numeric / monetary changes exactly.
4. Keep formatting & sections intact; only edit what is requested.
5. Use [confirm] for ambiguous edits.

OUTPUT FORMAT:
UPDATED CONTRACT
<amended contract>

SUMMARY
<bullet list of changes>`
    const user = `CLIENT_CONTEXT: ${JSON.stringify(clientContext ?? {})}
CONTRACT:
${contractTemplate}

REQUESTED CHANGES (natural language):
${naturalChanges}`
    const result = await aiComplete(system, user)
    const parts = result.split(/\n\s*SUMMARY[:\-]?/i)
    let updated = parts[0].trim()
    const summary = parts[1]?.trim() || ''
    // Deterministic date fallback
    const dateReqMatch = (naturalChanges || '').match(/change\s+(the\s+)?(contract\s+)?date\s+(to|=)\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/i)
    const requestedDate = dateReqMatch ? dateReqMatch[4] : null
    const firstDateRegex = /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/
    if (requestedDate && !updated.includes(requestedDate)) {
      updated = updated.replace(firstDateRegex, requestedDate)
    }
    return new Response(JSON.stringify({ updated, summary, appliedDeterministicDate: !!requestedDate }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Unexpected', details: e?.message }), { status: 500 })
  }
}
