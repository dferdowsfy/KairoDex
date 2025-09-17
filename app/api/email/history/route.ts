import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function GET(req: NextRequest) {
  const supabase = supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const clientId = url.searchParams.get('clientId')
  const limit = parseInt(url.searchParams.get('limit') || '10')

  if (!clientId) {
    return NextResponse.json({ error: 'Missing clientId parameter' }, { status: 400 })
  }

  try {
    // Get email history for the client
    const { data: emails, error } = await supabase
      .from('emails')
      .select('id, subject, body_md, status, sent_at, created_at, to_emails')
      .eq('client_id', clientId)
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Also check for scheduled emails from the email automation system
    const { data: scheduledEmails } = await supabase
      .from('email_schedules')
      .select('id, email_subject, email_content, status, sent_at, created_at, recipient_email')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Combine and sort all emails by date
    const allEmails = [
      ...(emails || []).map(email => ({
        ...email,
        source: 'emails' as const,
        recipient_email: email.to_emails?.[0] || ''
      })),
      ...(scheduledEmails || []).map(email => ({
        id: email.id,
        subject: email.email_subject,
        body_md: email.email_content,
        status: email.status,
        sent_at: email.sent_at,
        created_at: email.created_at,
        source: 'email_schedules' as const,
        to_emails: [email.recipient_email],
        recipient_email: email.recipient_email
      }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit)

    return NextResponse.json({ 
      emails: allEmails,
      total: allEmails.length 
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
