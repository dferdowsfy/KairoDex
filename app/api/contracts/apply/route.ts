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
    const system = `You are a contracts editor. Apply requested changes to the provided contract text.
- Show the UPDATED CONTRACT first, preserving formatting.
- Then include a short SUMMARY of changes in bullet points.
- If any detail is ambiguous, add [confirm] next to it.`
    const user = `CLIENT_CONTEXT: ${JSON.stringify(clientContext ?? {})}
CONTRACT:
${contractTemplate}

REQUESTED CHANGES (natural language):
${naturalChanges}`
    const result = await aiComplete(system, user)
    // Heuristic split
    const parts = result.split(/\n\s*SUMMARY[:\-]?/i)
    const updated = parts[0].trim()
    const summary = parts[1]?.trim() || ''
    return new Response(JSON.stringify({ updated, summary }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Unexpected', details: e?.message }), { status: 500 })
  }
}
