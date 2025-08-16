export const runtime = 'edge'

import { NextRequest } from 'next/server'
import { aiComplete } from '@/lib/ai'
import { findSheetRowByHints, sheetRowToClient } from '@/lib/sheets'

export async function POST(req: NextRequest) {
  try {
  const { clientId, channel, instruction } = await req.json()
    if (!['email', 'sms'].includes(channel)) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 })
    }

    // Fetch client context if provided
    let client: any = null
    let sheetRow: any | null = null
    if (clientId) {
  // Sheets row for this client (match by id/email/name)
  try { sheetRow = await findSheetRowByHints({ id: clientId }) } catch {}
  if (sheetRow) client = sheetRowToClient(sheetRow)
    }

  const system = `You are AgentHub’s assistant. Use provided CLIENT_CONTEXT only. Draft concise, friendly follow-ups in the selected channel. Insert short placeholders like [time] when details are missing. End with 'Next info needed:' only if concrete items are missing. Prefer details from SHEET_ROW when present.`
  const clientContext = clientId ? { client, lastNotes: [], sheetRow } : { client: null, lastNotes: [], sheetRow: null }

    const prompt = `CLIENT_CONTEXT:\n${JSON.stringify(clientContext, null, 2)}\nChannel: ${channel}\nInstruction: ${instruction ?? 'Draft a brief, friendly follow-up email.'}`

  // Call AI using provider selected via env keys
  const draft: string = await aiComplete(system, prompt)

  // No persistence; Sheets is the source of truth

    const nextInfoNeeded = draft.includes('Next info needed:')
      ? draft.split('Next info needed:')[1]?.trim()
      : undefined

  return new Response(JSON.stringify({ draft, nextInfoNeeded }), { status: 200, headers: { 'Content-Type':'application/json' } })
  } catch (e: any) {
  return new Response(JSON.stringify({ error: 'Unexpected', details: e?.message }), { status: 500, headers: { 'Content-Type':'application/json' } })
  }
}
