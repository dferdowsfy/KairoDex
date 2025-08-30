export const runtime = 'edge'
import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function POST(req: NextRequest) {
  try {
    const supabase = supabaseServer()
    const nowIso = new Date().toISOString()
    // Fetch due jobs for current user context (RLS enforces)
    const { data: jobs, error } = await supabase.from('email_jobs').select('*').eq('status','scheduled').lte('send_at', nowIso).limit(20)
    if (error) throw error
    let sent = 0
    for (const job of jobs || []) {
      let ok = false
      try {
        // Attempt to send via local API (mock or provider)
        const resp = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/email/send`, { method:'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ provider: 'mock', to: job.to_recipients?.[0], subject: job.subject, body: job.body_text || job.body_html }) })
        ok = resp.ok
      } catch {}
      // Update status
      await supabase.from('email_jobs').update({ status: ok? 'sent':'failed', updated_at: new Date().toISOString(), error: ok? null: 'send_failed' }).eq('id', job.id)
      if (ok) {
        try {
          await supabase.from('normalized_items').insert({ user_id: job.user_id, client_id: job.client_id, kind: 'email', title: `Email: ${job.subject}`, body: job.body_text || job.body_html, source: 'user_note' })
        } catch {}
        sent++
      }
    }
    return new Response(JSON.stringify({ processed: jobs?.length || 0, sent }), { status: 200 })
  } catch (e:any) {
    return new Response(JSON.stringify({ error: e?.message || 'Unexpected' }), { status: 500 })
  }
}
