// Deno Edge Function for processing due email_jobs
// Deploy as a Supabase Edge Function. Expects SENDGRID_API_KEY or RESEND_API_KEY in env.
import { serve } from 'https://deno.land/std@0.203.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

async function sendEmailViaResend(to: string, subject: string, html: string) {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) throw new Error('RESEND_API_KEY not set')
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ to: [to], from: 'noreply@yourapp.com', subject, html })
  })
  return res.ok
}

serve(async (req) => {
  // Only allow internal calls or CRON like access — service role key used here
  // Fetch due pending jobs (lock via update -> status = processing)
  const now = new Date().toISOString()
  // Transactional handling: select FOR UPDATE is not in supabase postgrest; we'll use simple safe updates with dedupe key checks

  const { data: jobs, error } = await sb.from('email_jobs').select('*').eq('status', 'scheduled').lte('send_at', now).limit(50)
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  for (const job of jobs as any[]) {
    try {
      // Idempotency: if dedupe_key is present and a processed row exists, skip
      if (job.dedupe_key) {
        const { data: exists } = await sb.from('email_jobs').select('id').eq('dedupe_key', job.dedupe_key).neq('status', 'pending').limit(1)
        if (exists && exists.length) {
          // mark this job as skipped
          await sb.from('email_jobs').update({ status: 'skipped', processed_at: new Date().toISOString() }).eq('id', job.id)
          continue
        }
      }

      // Attempt to set to processing
      const { error: lockErr } = await sb.from('email_jobs').update({ status: 'processing' }).eq('id', job.id).eq('status', 'scheduled')
      if (lockErr) {
        // someone else locked it
        continue
      }

      // Read email data from job fields directly
      const to = job.to_recipients?.[0]
      const subject = job.subject  
      const html = job.body_html
      
      if (!to || !subject || !html) {
        await sb.from('email_jobs').update({ status: 'failed', processed_at: new Date().toISOString(), error: 'Missing required fields' }).eq('id', job.id)
        continue
      }
      
      const sent = await sendEmailViaResend(to, subject, html)

      if (sent) {
        await sb.from('email_jobs').update({ status: 'processed', processed_at: new Date().toISOString() }).eq('id', job.id)
      } else {
        await sb.from('email_jobs').update({ status: 'failed', processed_at: new Date().toISOString() }).eq('id', job.id)
      }
    } catch (e) {
      console.error('job error', e)
      await sb.from('email_jobs').update({ status: 'failed', processed_at: new Date().toISOString() }).eq('id', job.id)
    }
  }

  return new Response(JSON.stringify({ processed: jobs.length }), { headers: { 'content-type': 'application/json' } })
})
