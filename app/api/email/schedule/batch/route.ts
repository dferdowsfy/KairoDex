export const runtime = 'edge'
import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()
    const supabase = supabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

    const { client_id, to_recipients, subject, body_text, send_at_list } = payload || {}
    if (!client_id || !Array.isArray(to_recipients) || !subject || !body_text || !Array.isArray(send_at_list) || send_at_list.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 })
    }
    const nowIso = new Date().toISOString()
    const rows = send_at_list.map((iso: string) => ({
      client_id,
      to_recipients,
      subject,
      body_text,
      send_at: iso,
      status: 'scheduled',
      user_id: user.id,
      created_at: nowIso,
      updated_at: nowIso,
    }))
    const { data, error } = await supabase.from('email_jobs').insert(rows).select('*')
    if (error) throw error
    return new Response(JSON.stringify({ jobs: data }), { status: 200 })
  } catch (e:any) {
    return new Response(JSON.stringify({ error: e?.message || 'Unexpected' }), { status: 500 })
  }
}
