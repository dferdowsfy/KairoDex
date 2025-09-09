import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/emailProviders'
import { sanitizeEmailBody } from '@/lib/emailSanitizer'
import { supabaseServer } from '@/lib/supabaseServer'

export async function POST(req: NextRequest) {
  try {
  const { to, subject, content } = await req.json()
    
    if (!to || !subject || !content) {
      return NextResponse.json({ 
        error: 'Missing required fields: to, subject, content' 
      }, { status: 400 })
    }

    console.log(`Sending immediate email to: ${to}`)
    console.log(`Subject: ${subject}`)
    
    // Attempt to get authenticated user to personalize From / Reply-To
    let fromEmail: string | undefined
    let fromName: string | undefined
    let replyTo: string | undefined
    try {
      const supabase = supabaseServer()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        fromEmail = user.email || undefined
        // If user metadata has display name fields
        const meta: any = user.user_metadata || {}
        fromName = meta.full_name || meta.name || undefined
        replyTo = fromEmail // default reply-to is user email
      }
    } catch {}

  const cleaned = sanitizeEmailBody(subject, content)
  const result = await sendEmail({ to, subject, content: cleaned, fromEmail, fromName, replyTo })
    
    if (result.success) {
      console.log(`✅ Email sent successfully to ${to}`)
      if (result.previewUrl) {
        console.log(`🔍 Preview URL (Ethereal / test): ${result.previewUrl}`)
      }
      return NextResponse.json({ 
        success: true,
        messageId: result.messageId,
        provider: result.provider,
        to,
        previewUrl: result.previewUrl,
  meta: { ...result.meta, sanitized: cleaned !== content }
      })
    } else {
      console.log(`❌ Failed to send email to ${to}: ${result.error}`)
      return NextResponse.json({ 
        error: result.error || 'Failed to send email',
        provider: result.provider,
        meta: result.meta
      }, { status: 500 })
    }

  } catch (e: any) {
    console.error('Email send API error:', e)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: e?.message 
    }, { status: 500 })
  }
}
