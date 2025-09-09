import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'
import { sendEmail } from '@/lib/emailProviders'

interface EmailScheduleRow {
  id: string
  recipient_email: string
  subject: string
  content: string
  status: string
  scheduled_at: string
}

// Simple cron endpoint: POST /api/email/cron/process?limit=XX
// Secured via CRON_SECRET header or query key
export async function POST(req: NextRequest) {
  const authKey = req.headers.get('x-cron-secret') || new URL(req.url).searchParams.get('key')
  if (!process.env.CRON_SECRET || authKey !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const limit = parseInt(new URL(req.url).searchParams.get('limit') || '25')
  const now = new Date().toISOString()
  const supabase = supabaseServer()

  // Fetch due schedules (pending & scheduled_at <= now)
  const { data: due, error: fetchError } = await supabase
    .from('email_schedules')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_at', now)
    .order('scheduled_at', { ascending: true })
    .limit(limit)

  if (fetchError) {
    return NextResponse.json({ error: 'Fetch failed', details: fetchError.message }, { status: 500 })
  }

  if (!due || due.length === 0) {
    return NextResponse.json({ processed: 0, message: 'No due emails' })
  }

  const results: any[] = []
  for (const sched of due as EmailScheduleRow[]) {
    try {
      // Optimistic lock: mark sending to avoid double send if overlapping cron
      const { error: updateErr } = await supabase
        .from('email_schedules')
        .update({ status: 'sending' })
        .eq('id', sched.id)
        .eq('status', 'pending')
      if (updateErr) throw updateErr

      const sendRes = await sendEmail({
        to: sched.recipient_email,
        subject: sched.subject,
        content: sched.content,
        fromEmail: (sched as any).from_email || undefined,
        fromName: (sched as any).from_name || undefined,
        replyTo: (sched as any).reply_to || (sched as any).from_email || undefined
      })
      if (sendRes.success) {
        await supabase.from('email_schedules').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', sched.id)
        await supabase.from('email_delivery_log').insert({ schedule_id: sched.id, status: 'sent', attempted_at: new Date().toISOString(), message_id: sendRes.messageId, provider: sendRes.provider })
        results.push({ id: sched.id, status: 'sent', provider: sendRes.provider })
      } else {
        await supabase.from('email_schedules').update({ status: 'failed', error_message: sendRes.error }).eq('id', sched.id)
        await supabase.from('email_delivery_log').insert({ schedule_id: sched.id, status: 'failed', attempted_at: new Date().toISOString(), error_message: sendRes.error, provider: sendRes.provider })
        results.push({ id: sched.id, status: 'failed', error: sendRes.error })
      }
    } catch (e: any) {
      results.push({ id: (sched as any).id, status: 'error', error: e.message })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}

export const revalidate = 0