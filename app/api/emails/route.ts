import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

// GET /api/emails - List all emails (sent and scheduled)
export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const limit = parseInt(url.searchParams.get('limit') || '100')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    // Fetch from emails table; attempt to pull related pending job id (email_jobs) for queued/scheduled emails.
    // We use a left join via RPC style select since Supabase supports foreign tables when relationship is defined.
    // Fallback: if relationship not defined, we will do a second query to map job ids.
    let emailsQuery = supabase
      .from('emails')
      .select('*, email_jobs:email_jobs(id, email_id, send_at, status)')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status === 'sent') {
      emailsQuery = emailsQuery.eq('status', 'sent')
    } else if (status === 'failed') {
      emailsQuery = emailsQuery.eq('status', 'failed')
    } else if (status === 'scheduled') {
      emailsQuery = emailsQuery.eq('status', 'queued')
    } else if (status === 'queued') {
      emailsQuery = emailsQuery.eq('status', 'queued')
    }

  interface RawJoinedJob { id: string; email_id?: string; send_at?: string; status?: string }
  interface EmailRecord { id:string; client_id:string|null; to_emails?: string[]; subject:string; status:string; sent_at:string|null; created_at:string; email_jobs?: RawJoinedJob | RawJoinedJob[] }
  const { data: emails, error: emailsError } = await emailsQuery as unknown as { data: EmailRecord[] | null, error: any }

    if (emailsError) {
      console.error('Error fetching emails:', emailsError)
      return NextResponse.json({ 
        error: 'Failed to fetch emails',
        details: emailsError.message 
      }, { status: 500 })
    }

    // Get client details separately
    const clientIdsSet = new Set<string | null>()
    for (const em of (emails || []) as EmailRecord[]) {
      if (em.client_id) clientIdsSet.add(em.client_id)
    }
    const clientIds = Array.from(clientIdsSet)

    let clients: any[] = []

    if (clientIds.length > 0) {
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, name, email')
        .in('id', clientIds)
      clients = clientsData || []
    }

    // Enrich emails with client info
    // Build map of email_id -> job id if join failed (no email_jobs field present)
    let jobMap: Record<string, string> = {}
    if (emails && emails.length > 0) {
      const needsJobLookup = emails.some(e => !('email_jobs' in e))
      if (needsJobLookup || emails.every(e => !e.email_jobs)) {
        // Secondary lookup for queued emails only
        const queuedIds = emails.filter(e => e.status === 'queued').map(e => e.id)
        if (queuedIds.length) {
          const { data: jobsData } = await supabase
            .from('email_jobs')
            .select('id, email_id')
            .in('email_id', queuedIds)
          for (const j of jobsData || []) {
            if (j.email_id) jobMap[j.email_id] = j.id
          }
        }
      }
    }

    const enrichedEmails = ((emails || []) as EmailRecord[]).map((email) => {
      const joined = email.email_jobs
      let jobId: string | undefined
      if (Array.isArray(joined)) jobId = joined[0]?.id
      else if (joined && typeof joined === 'object') jobId = (joined as any)?.id
      if (!jobId && jobMap[email.id]) jobId = jobMap[email.id]
      // Map queued->scheduled, canceled->cancelled (UI uses British spelling currently) 
      let uiStatus = email.status === 'queued' ? 'scheduled' : email.status
      if (uiStatus === 'canceled') uiStatus = 'cancelled'
      return {
        id: email.id,
        job_id: jobId,
        type: email.status === 'sent' ? 'sent' : 'scheduled',
        recipient_email: Array.isArray(email.to_emails) ? email.to_emails[0] : email.to_emails,
        subject: email.subject,
        status: uiStatus, // normalized UI status
        scheduled_at: email.sent_at || email.created_at,
        sent_at: email.sent_at,
        created_at: email.created_at,
        client_name: clients.find(c => c.id === email.client_id)?.name || 'Unknown',
        sender_email: 'Gmail (dferdows@gmail.com)',
        sender_method: 'gmail'
      }
    }) || []

    // Calculate stats using the mapped status
    const stats = {
      total: enrichedEmails.length,
      sent: enrichedEmails.filter(e => e.status === 'sent').length,
      scheduled: enrichedEmails.filter(e => e.status === 'scheduled').length,
      failed: enrichedEmails.filter(e => e.status === 'failed').length
    }

    return NextResponse.json({
      emails: enrichedEmails,
      stats,
      total: enrichedEmails.length
    })

  } catch (error: any) {
    console.error('Error in /api/emails:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}
