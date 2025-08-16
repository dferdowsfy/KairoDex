export const runtime = 'edge'

import { NextRequest } from 'next/server'
import { aiComplete } from '@/lib/ai'
import { findSheetRowByHints, sheetRowToClient } from '@/lib/sheets'

export async function POST(req: NextRequest) {
  try {
    const { clientId, description } = await req.json()
    if (!clientId || !description) return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 })

    // Load client context from Sheets for better AI grounding
    let client: any = null
    let sheetRow: any | null = null
    try { sheetRow = await findSheetRowByHints({ id: clientId }) } catch {}
    if (sheetRow) client = sheetRowToClient(sheetRow)

    const system = 'You are a contract assistant. Generate a concise redline-style amendment summary. Use clear headings and bullet points. If dates or amounts are ambiguous, add [confirm] tags.'
    const user = `CLIENT_CONTEXT: ${JSON.stringify({ client, sheetRow })}\nRequested amendment: ${description}`

    const content = await aiComplete(system, user)

    return new Response(JSON.stringify({ content }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Unexpected', details: e?.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
