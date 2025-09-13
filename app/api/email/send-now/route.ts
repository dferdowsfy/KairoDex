import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'
import { resend, RESEND_FROM } from '@/lib/resend'

export async function POST(req: NextRequest) {
  const supabase = supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { to, subject, bodyMd, clientId } = await req.json()
    
    if (!to || !Array.isArray(to) || to.length === 0) {
      return NextResponse.json({ error: 'Recipients required' }, { status: 400 })
    }
    
    if (!subject) {
      return NextResponse.json({ error: 'Subject required' }, { status: 400 })
    }
    
    if (!bodyMd) {
      return NextResponse.json({ error: 'Email body required' }, { status: 400 })
    }

    console.log('[email/send-now] Sending email immediately via Resend', { 
      to: to.length, 
      subject,
      hasBody: !!bodyMd 
    })

    // Convert markdown to HTML (simple conversion)
    const bodyHtml = bodyMd.replace(/\n/g, '<br>')
    
    // Send email immediately via Resend
    const sendRes = await resend.emails.send({
      from: RESEND_FROM,
      to,
      subject,
      html: bodyHtml
    })

    if (sendRes?.error) {
      console.error('[email/send-now] Resend error:', sendRes.error)
      return NextResponse.json({ 
        error: 'Failed to send email', 
        details: sendRes.error.message 
      }, { status: 500 })
    }

    console.log('[email/send-now] Email sent successfully:', sendRes.data?.id)

    // Optionally log to database for tracking
    try {
      await supabase.from('emails').insert({
        owner_id: user.id,
        client_id: clientId || user.id,
        to_emails: to,
        subject,
        body_md: bodyMd,
        body_html: bodyHtml,
        status: 'sent',
        sent_at: new Date().toISOString(),
        provider_id: sendRes.data?.id
      })
    } catch (dbError) {
      console.warn('[email/send-now] Failed to log to database:', dbError)
      // Don't fail the request if logging fails
    }

    return NextResponse.json({ 
      success: true,
      emailId: sendRes.data?.id,
      message: 'Email sent successfully'
    })

  } catch (error: any) {
    console.error('[email/send-now] Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Failed to send email', 
      details: error.message 
    }, { status: 500 })
  }
}
