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

    // Fetch from emails table only since that's what actually exists
    let emailsQuery = supabase
      .from('emails')
      .select('*')
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

    const { data: emails, error: emailsError } = await emailsQuery

    if (emailsError) {
      console.error('Error fetching emails:', emailsError)
      return NextResponse.json({ 
        error: 'Failed to fetch emails',
        details: emailsError.message 
      }, { status: 500 })
    }

    // Get client details separately
    const clientIds = [...new Set(emails?.map(e => e.client_id).filter(Boolean))]

    let clients: any[] = []

    if (clientIds.length > 0) {
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, name, email')
        .in('id', clientIds)
      clients = clientsData || []
    }

    // Enrich emails with client info
    const enrichedEmails = emails?.map(email => ({
      id: email.id,
      type: email.status === 'sent' ? 'sent' : 'scheduled',
      recipient_email: Array.isArray(email.to_emails) ? email.to_emails[0] : email.to_emails,
      subject: email.subject,
      status: email.status === 'queued' ? 'scheduled' : email.status, // Map queued to scheduled for UI
      scheduled_at: email.sent_at || email.created_at,
      sent_at: email.sent_at,
      created_at: email.created_at,
      client_name: clients.find(c => c.id === email.client_id)?.name || 'Unknown',
      sender_email: 'Gmail (dferdows@gmail.com)', // Default since we don't have sender info in this table
      sender_method: 'gmail'
    })) || []

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
