import { NextRequest } from 'next/server'
import { aiComplete } from '@/lib/ai'
import { findSheetRowByHints, sheetRowToClient } from '@/lib/sheets'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { clientId, message } = await req.json()
    if (!message) {
      return new Response(JSON.stringify({ error: 'Missing message' }), { status: 400 })
    }
    let client: any = null
    let sheetRow: any = null
    if (clientId) {
      try { sheetRow = await findSheetRowByHints({ id: clientId }) } catch {}
      if (sheetRow) client = sheetRowToClient(sheetRow)
    }
    const system = `You are AgentHub’s assistant. Answer using only the provided CLIENT_CONTEXT. If sheetRow is present, prefer its values. Keep answers brief and actionable.`
    const user = `CLIENT_CONTEXT:\n${JSON.stringify({ client, sheetRow }, null, 2)}\n\nUSER:\n${message}`
    const response = await aiComplete(system, user)
    return new Response(JSON.stringify({ reply: response, sheetRow: !!sheetRow }), { status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Chat failed' }), { status: 500 })
  }
}
