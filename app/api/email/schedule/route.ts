import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'
import { markdownToHtml } from '@/lib/email'

export async function POST(req: NextRequest) {
  const supabase = supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
  const { to, subject, bodyMd, sendAt, clientId, cadence } = await req.json()
  console.log('[email/schedule] incoming', { toCount: Array.isArray(to)?to.length:0, hasCadence: !!cadence, sendAt })
    if (!sendAt) return NextResponse.json({ error: 'Missing sendAt' }, { status: 400 })
    if (!Array.isArray(to) || !to.length) return NextResponse.json({ error: 'No recipients' }, { status: 400 })
    const bodyHtml = markdownToHtml(bodyMd || '')
    const baseInsert = {
      owner_id: user.id,
      client_id: clientId || user.id,
      to_emails: to,
      subject,
      body_md: bodyMd,
      body_html: bodyHtml,
      status: 'queued'
    }
    const cadenceValue = cadence && ['none','biweekly','monthly'].includes(cadence) ? cadence : 'none'
    let emailRes = await supabase.from('emails').insert({ ...baseInsert, cadence: cadenceValue }).select().single()
    let email = emailRes.data; let e1 = emailRes.error
    if (e1 && /cadence/.test(e1.message)) {
      // Retry without cadence column
      const retry = await supabase.from('emails').insert(baseInsert).select().single()
      email = retry.data; e1 = retry.error
    }
    if (e1) return NextResponse.json({ error: e1.message }, { status: 500 })
    const { error: e2 } = await supabase
      .from('email_jobs')
      .insert({ email_id: email.id, send_at: sendAt })
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })
  console.log('[email/schedule] queued job', { emailId: email.id, sendAt })
    return NextResponse.json({ emailId: email.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unexpected' }, { status: 500 })
  }
}
