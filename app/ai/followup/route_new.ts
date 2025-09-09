export const runtime = 'edge'

import { NextRequest } from 'next/server'
import { aiComplete } from '@/lib/ai'
import { findSheetRowByHints, sheetRowToClient } from '@/lib/sheets'
import { supabaseServer } from '@/lib/supabaseServer'

export async function handleFollowupGET(req: NextRequest) {
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

export async function handleFollowupPOST(req: NextRequest) {
  try {
  const { clientId, channel, instruction, save, userId } = await req.json()
    if (!['email', 'sms'].includes(channel)) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 })
    }

    // Fetch client context if provided
  let client: any = null
  let sheetRow: any | null = null
  let structuredNotes: any[] = []
    if (clientId) {
  // Sheets row for this client (match by id/email/name)
  try { sheetRow = await findSheetRowByHints({ id: clientId }) } catch {}
  if (sheetRow) client = sheetRowToClient(sheetRow)
  // Also load structured normalized items from Supabase
  try {
    const supabase = supabaseServer()
    const { data: ni } = await supabase
      .from('normalized_items')
      .select('kind,title,date,status,party,tags,created_at')
      .eq('client_id', clientId)
      .order('date', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(50)
    if (Array.isArray(ni)) structuredNotes = ni
  } catch {}
    }

  const system = `You are Kairodex's assistant writing personalized client communications.

CRITICAL REQUIREMENTS:
- You MUST use the actual CLIENT_CONTEXT data provided. DO NOT create generic marketing content about trends or strategies.
- Reference specific client details like their name, company, recent interactions, or project status from the context.
- If the client context shows specific activities, notes, or deadlines, reference those directly.
- Write as if you personally know this client and their current situation.
- Keep it conversational and specific to their circumstances.

Writing constraints:
- Use only CLIENT_CONTEXT; do not invent facts or commitments.
- Keep it tight: 4–7 short sentences max for email; 2–3 for SMS.
- Use the client's preferred method if present; otherwise use the requested channel.
- If key details are missing, use square-bracket placeholders like [time] or [address].
- End with a single line 'Next info needed:' only if concrete items are missing.
- Maintain a professional, warm tone and avoid repetition.

Grounding:
- Prefer STRUCTURED_NOTES (normalized items) and then fields from SHEET_ROW when present. If a field is unknown, omit it.
- If a do-not-contact flag is true, do not draft outreach; instead, return a short internal checklist.`
  const clientContext = clientId ? { client, lastNotes: [], sheetRow, structured_notes: structuredNotes } : { client: null, lastNotes: [], sheetRow: null, structured_notes: [] }

    const prompt = `CLIENT_CONTEXT:\n${JSON.stringify(clientContext, null, 2)}\nChannel: ${channel}\nInstruction: ${instruction ?? 'Draft a brief, friendly follow-up email.'}`

  // Call AI using provider selected via env keys
  const draft: string = await aiComplete(system, prompt, { temperature: 0.3 })

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

// keep named exports compatible with Next.js route handler API
export const GET = handleFollowupGET
export const POST = handleFollowupPOST
