export const runtime = 'edge'
import { NextRequest } from 'next/server'
import { parseNotes } from '@/lib/noteParser'
import { supabaseServer } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: NextRequest) {
  try {
    const { clientId, text } = await req.json()
    if (!clientId || !text) return new Response(JSON.stringify({ error: 'clientId and text required' }), { status: 400 })
    const supabase = supabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

    // Also append the raw text to AgentHub_DB.Notes_Inputted for history
    try {
      const admin = supabaseAdmin()
      const { data: row, error: rowErr } = await admin.from('AgentHub_DB').select('client_id, Notes_Inputted').eq('client_id', clientId).maybeSingle()
      if (rowErr) throw rowErr
      const current = (() => { const v = (row as any)?.Notes_Inputted; if (!v) return [] as any[]; try { return typeof v === 'string' ? JSON.parse(v) : Array.isArray(v) ? v : [] } catch { return [] } })()
      const entry = { id: `ni_${Date.now()}`, text, user_id: user.id, created_at: new Date().toISOString() }
      const next = [entry, ...current]
      const { error: upErr } = await admin.from('AgentHub_DB').update({ Notes_Inputted: next }).eq('client_id', clientId)
      if (upErr) throw upErr
    } catch (e) {
      // ignore history failure; parsing still returns
      console.error('[notes/parse] history append failed', e)
    }

    const items = await parseNotes(text, clientId, user.id)
    return new Response(JSON.stringify({ items }), { status: 200, headers: { 'Content-Type':'application/json' } })
  } catch (e:any) {
    return new Response(JSON.stringify({ error: e?.message || 'Unexpected' }), { status: 500 })
  }
}
