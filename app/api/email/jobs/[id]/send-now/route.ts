import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

// Force-send a scheduled email job immediately, marking it sent/failed.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = params.id
  try {
    const { data: job, error: jerr } = await supabase.from('email_jobs').select('*').eq('id', id).single()
    if (jerr || !job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (job.status !== 'scheduled') return NextResponse.json({ error: 'Job already processed' }, { status: 400 })

  let ok = false
    try {
      const resp = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/email/send`, { method:'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ provider: 'mock', to: job.to_recipients?.[0] ? [job.to_recipients[0]] : [], subject: job.subject, bodyMd: job.body_text || job.body_html || '' }) })
      ok = resp.ok
    } catch (e) {
      ok = false
    }
    const { error: uerr } = await supabase.from('email_jobs').update({ status: ok? 'sent':'failed', updated_at: new Date().toISOString(), error: ok? null: 'send_failed_manual' }).eq('id', id)
    if (uerr) return NextResponse.json({ error: uerr.message }, { status: 500 })
    if (ok) {
      try {
        // Reconcile queued email record (match subject, queued status, most recent)
        const { data: queued } = await supabase
          .from('emails')
          .select('id,status,subject,body_html,body_md')
          .eq('owner_id', job.user_id)
          .eq('client_id', job.client_id)
          .eq('subject', job.subject)
          .eq('status', 'queued')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        const sentAt = new Date().toISOString()
        if (queued?.id) {
          await supabase.from('emails').update({ status: 'sent', sent_at: sentAt }).eq('id', queued.id)
        } else {
          // Insert a new sent email row if no existing queued record
          await supabase.from('emails').insert({
            owner_id: job.user_id,
            client_id: job.client_id,
            to_emails: job.to_recipients || [],
            subject: job.subject,
            body_html: job.body_html,
            body_md: job.body_text || job.body_html,
            status: 'sent',
            sent_at: sentAt
          })
        }
        await supabase.from('normalized_items').insert({ user_id: job.user_id, client_id: job.client_id, kind: 'email', title: `Email: ${job.subject}`, body: job.body_text || job.body_html, source: 'user_note' })
      } catch {}
    }
    return NextResponse.json({ success: true, sent: ok, reconciled: ok })
  } catch (e:any) {
    return NextResponse.json({ error: e.message || 'Unexpected' }, { status: 500 })
  }
}
