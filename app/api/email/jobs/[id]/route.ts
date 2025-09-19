import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

// Delete a scheduled email job (only if still scheduled)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = params.id
  try {
    // Fetch job to ensure ownership via RLS and status
    const { data: job, error: jerr } = await supabase.from('email_jobs').select('*').eq('id', id).single()
    if (jerr) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (job.status !== 'scheduled') {
      return NextResponse.json({ error: 'Cannot delete: already processed' }, { status: 400 })
    }
    const { error: derr } = await supabase.from('email_jobs').delete().eq('id', id)
    if (derr) return NextResponse.json({ error: derr.message }, { status: 500 })

    // Attempt to locate corresponding queued email row (we did not previously store email_id on the job)
    try {
      const { data: candidateEmails } = await supabase
        .from('emails')
        .select('id,status,subject,created_at')
        .eq('owner_id', job.user_id)
        .eq('client_id', job.client_id)
        .eq('subject', job.subject)
        .eq('status', 'queued')
        .order('created_at', { ascending: false })
        .limit(3)
      if (candidateEmails && candidateEmails.length) {
        // Prefer most recent queued
        const target = candidateEmails[0]
        // Try to update status to canceled; if column enum rejects, fallback to delete
        const { error: cancelErr } = await supabase.from('emails').update({ status: 'canceled' }).eq('id', target.id)
        if (cancelErr) {
          // fallback: delete the email row
          await supabase.from('emails').delete().eq('id', target.id)
        }
      }
    } catch {}

    return NextResponse.json({ success: true, canceledEmail: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unexpected' }, { status: 500 })
  }
}
