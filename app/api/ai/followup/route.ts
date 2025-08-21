export const runtime = 'edge'

import { NextRequest } from 'next/server'
import { aiComplete } from '@/lib/ai'
import { findSheetRowByHints, sheetRowToClient } from '@/lib/sheets'
import { supabaseServer } from '@/lib/supabaseServer'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get('clientId')
    if (!clientId) return new Response(JSON.stringify({ messages: [] }), { status: 200, headers: { 'Content-Type':'application/json' } })
    const supabase = supabaseServer()
    const { data, error } = await supabase.from('messages').select('*').eq('client_id', clientId).order('created_at', { ascending: false })
    if (error) throw error
    return new Response(JSON.stringify({ messages: data || [] }), { status: 200, headers: { 'Content-Type':'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ messages: [], error: e?.message }), { status: 200, headers: { 'Content-Type':'application/json' } })
  }
}

export async function POST(req: NextRequest) {
  try {
  const { clientId, channel, instruction, save, userId } = await req.json()
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

  // Optional persistence
  if (save && clientId) {
    try {
      const supabase = supabaseServer()
      const { data: msg, error } = await supabase.from('messages').insert({ client_id: clientId, agent_id: userId || 'agent', direction: 'out', channel, body: draft }).select('*').single()
      if (!error) {
        // also log to events if table exists
        try { await supabase.from('events').insert({ client_id: clientId, agent_id: userId || 'agent', type: 'message', ref_id: msg?.id, meta: { channel } }) } catch {}
      }
    } catch {}
  }

    const nextInfoNeeded = draft.includes('Next info needed:')
      ? draft.split('Next info needed:')[1]?.trim()
      : undefined

  return new Response(JSON.stringify({ draft, nextInfoNeeded }), { status: 200, headers: { 'Content-Type':'application/json' } })
  } catch (e: any) {
  return new Response(JSON.stringify({ error: 'Unexpected', details: e?.message }), { status: 500, headers: { 'Content-Type':'application/json' } })
  }
}
