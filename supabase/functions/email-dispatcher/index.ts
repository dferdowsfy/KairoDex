// Supabase Edge Function: email-dispatcher
// Deploy: supabase functions deploy email-dispatcher --no-verify-jwt
// Schedule: supabase cron create email-dispatcher "*/1 * * * *" email-dispatcher

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@3'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const RESEND_FROM = Deno.env.get('RESEND_FROM')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!

const resend = new Resend(RESEND_API_KEY)
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

Deno.serve(async () => {
  const now = new Date().toISOString()
  const { data: jobs, error: jobsErr } = await supabase
    .from('email_jobs')
    .select('id,email_id,attempts,send_at,locked_at')
    .lte('send_at', now)
    .is('locked_at', null)
    .limit(10)
  if (jobsErr) return new Response(JSON.stringify({ error: jobsErr.message }), { status: 500 })
  const results: any[] = []
  for (const job of jobs || []) {
    await supabase.from('email_jobs').update({ locked_at: new Date().toISOString(), locked_by: 'dispatcher' }).eq('id', job.id).is('locked_at', null)
  const { data: email, error: emailErr } = await supabase.from('emails').select('*').eq('id', job.email_id).single()
    if (emailErr) { results.push({ id: job.id, error: emailErr.message }); continue }
    if (email.status === 'sent') { await supabase.from('email_jobs').delete().eq('id', job.id); continue }
    try {
      await resend.emails.send({ from: RESEND_FROM, to: email.to_emails, subject: email.subject, html: email.body_html })
      await supabase.from('emails').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', email.id)
      // Recurrence handling: if email.cadence is biweekly or monthly, enqueue new job
      if (email.cadence && email.cadence !== 'none') {
        try {
          const lastSend = new Date(job.send_at)
          if (email.cadence === 'biweekly') {
            lastSend.setDate(lastSend.getDate() + 14)
          } else if (email.cadence === 'monthly') {
            lastSend.setMonth(lastSend.getMonth() + 1)
          }
          await supabase.from('email_jobs').insert({ email_id: email.id, send_at: lastSend.toISOString() })
        } catch(recErr) {
          console.log('Failed to enqueue recurring job', recErr)
        }
      }
      await supabase.from('email_jobs').delete().eq('id', job.id)
      results.push({ id: job.id, status: 'sent' })
    } catch (e) {
      const attempts = (job.attempts || 0) + 1
      const maxAttempts = 5
      if (attempts >= maxAttempts) {
        await supabase.from('emails').update({ status: 'failed', error_text: (e as Error).message }).eq('id', email.id)
        await supabase.from('email_jobs').delete().eq('id', job.id)
        results.push({ id: job.id, status: 'failed' })
      } else {
        const next = new Date(Date.now() + attempts * 120000)
        await supabase.from('email_jobs').update({ attempts, last_attempt_at: new Date().toISOString(), locked_at: null, locked_by: null, send_at: next.toISOString() }).eq('id', job.id)
        results.push({ id: job.id, status: 'retry', next: next.toISOString() })
      }
    }
  }
  return new Response(JSON.stringify({ processed: results }), { headers: { 'Content-Type': 'application/json' } })
})
