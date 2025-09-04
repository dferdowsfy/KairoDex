import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

type Entry = { id: string; text: string; user_id: string; created_at: string }

async function getRow(clientId: string) {
  const admin = supabaseAdmin()
  const { data, error } = await admin.from('AgentHub_DB').select('client_id, Notes_Inputted').eq('client_id', clientId).maybeSingle()
  if (error) throw error
  return (data || { client_id: clientId, Notes_Inputted: [] }) as any as { client_id: string; Notes_Inputted: any }
}

function parseHistory(value: any): Entry[] {
  if (!value) return []
  try {
    if (typeof value === 'string') return JSON.parse(value) as Entry[]
    if (Array.isArray(value)) return value as Entry[]
    return []
  } catch { return [] }
}

async function updateHistory(clientId: string, history: Entry[]) {
  const admin = supabaseAdmin()
  // ensure row exists
  const { data: existing, error: selErr } = await admin.from('AgentHub_DB').select('client_id').eq('client_id', clientId).maybeSingle()
  if (selErr) throw selErr
  if (!existing) {
    const { error: insErr } = await admin.from('AgentHub_DB').insert({ client_id: clientId, Notes_Inputted: history }).single()
    if (insErr) throw insErr
    return
  }
  const { error } = await admin.from('AgentHub_DB').update({ Notes_Inputted: history }).eq('client_id', clientId)
  if (error) throw error
}

export async function GET(req: NextRequest) {
  try {
    const clientId = req.nextUrl.searchParams.get('clientId') || ''
    if (!clientId) return new Response(JSON.stringify({ error: 'clientId required' }), { status: 400 })
    const supabase = supabaseServer()
  const getUserRes = await supabase.auth.getUser()
  const user = getUserRes?.data?.user
  if (getUserRes?.error) throw getUserRes.error
  if (!user?.id) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    const row = await getRow(clientId)
    const history = parseHistory(row?.Notes_Inputted)
    return new Response(JSON.stringify({ items: history }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Unexpected' }), { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { clientId, text } = await req.json()
    if (!clientId || !text) return new Response(JSON.stringify({ error: 'clientId and text required' }), { status: 400 })
  const supabase = supabaseServer()
  const getUserRes = await supabase.auth.getUser()
  const user = getUserRes?.data?.user
  if (getUserRes?.error) throw getUserRes.error
  if (!user?.id) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    const row = await getRow(clientId)
    const history = parseHistory(row?.Notes_Inputted)
    const entry: Entry = { id: `ni_${Date.now()}`, text, user_id: user.id, created_at: new Date().toISOString() }
    history.unshift(entry)
    await updateHistory(clientId, history)
    return new Response(JSON.stringify({ item: entry, items: history }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Unexpected' }), { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get('clientId') || ''
    const id = searchParams.get('id') || ''
    if (!clientId || !id) return new Response(JSON.stringify({ error: 'clientId and id required' }), { status: 400 })
  const supabase = supabaseServer()
  const getUserRes = await supabase.auth.getUser()
  const user = getUserRes?.data?.user
  if (getUserRes?.error) throw getUserRes.error
  if (!user?.id) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    const row = await getRow(clientId)
    const history = parseHistory(row?.Notes_Inputted)
    const next = history.filter(e => e.id !== id)
    await updateHistory(clientId, next)
    return new Response(JSON.stringify({ items: next }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Unexpected' }), { status: 500 })
  }
}
