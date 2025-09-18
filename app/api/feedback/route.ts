import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'
import { resend } from '@/lib/resend'

// POST /api/feedback - Store user feedback and send notification email
export async function POST(req: NextRequest) {
  const supabase = supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  try {
    const body = await req.json().catch(() => ({}))
    const { liked = [], disliked = [], rating, message = '' } = body || {}

    // Sanitize inputs
    const likedList = Array.isArray(liked) ? liked.slice(0, 10) : []
    const dislikedList = Array.isArray(disliked) ? disliked.slice(0, 10) : []
    const safeMessage = (message || '').toString().slice(0, 5000)
    const ratingVal = typeof rating === 'number' ? Math.min(10, Math.max(1, rating)) : null
    const feedbackId = crypto.randomUUID()

    // Get user agent and IP for tracking (optional)
    const userAgent = req.headers.get('user-agent') || null
    const forwardedFor = req.headers.get('x-forwarded-for')
    const realIp = req.headers.get('x-real-ip')
    const ipAddress = forwardedFor?.split(',')[0] || realIp || null

    // Store feedback in dedicated table
    const { data: feedbackData, error: insertError } = await supabase
      .from('feedback')
      .insert({
        user_id: user.id,
        user_email: user.email || 'unknown',
        rating: ratingVal,
        liked: likedList,
        disliked: dislikedList,
        message: safeMessage,
        feedback_id: feedbackId,
        status: 'pending',
        user_agent: userAgent,
        ip_address: ipAddress,
        source: 'feedback_widget'
      })
      .select()
      .single()

    if (insertError) {
      console.error('[feedback] Database insert failed:', insertError)
      return NextResponse.json({ error: 'Failed to store feedback' }, { status: 500 })
    }

    // Send email notification to owner
    let emailStatus: 'sent' | 'failed' = 'sent'
    let emailError: string | null = null

    try {
      const ownerEmail = 'dferdows@gmail.com'
      const fromEmail = process.env.FEEDBACK_FROM || process.env.RESEND_FROM || 'noreply@kairodex.com'
      
      const html = `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">New Platform Feedback</h2>
          
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151; width: 120px;">User:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">${user.email}</td>
              </tr>
              ${ratingVal ? `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Rating:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">${ratingVal} / 10</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Liked:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">
                  ${likedList.length ? likedList.map(l => `<span style="background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-size: 12px; margin-right: 4px;">${l}</span>`).join(' ') : '—'}
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Didn't Like:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">
                  ${dislikedList.length ? dislikedList.map(d => `<span style="background: #fee2e2; color: #dc2626; padding: 2px 6px; border-radius: 4px; font-size: 12px; margin-right: 4px;">${d}</span>`).join(' ') : '—'}
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151; vertical-align: top;">Message:</td>
                <td style="padding: 8px 0; color: #111827;">
                  <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #d1d5db; white-space: pre-wrap; font-family: system-ui, sans-serif;">${safeMessage || '—'}</div>
                </td>
              </tr>
            </table>
          </div>
          
          <div style="text-align: center; padding: 15px; background: #f3f4f6; border-radius: 6px; font-size: 12px; color: #6b7280;">
            <strong>Feedback ID:</strong> ${feedbackId}<br/>
            <strong>Submitted:</strong> ${new Date().toLocaleString('en-US', { 
              timeZone: 'America/New_York',
              year: 'numeric',
              month: 'long', 
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              timeZoneName: 'short'
            })}
          </div>
        </div>
      `

      const text = [
        '==== NEW PLATFORM FEEDBACK ====',
        '',
        `User: ${user.email}`,
        ratingVal ? `Rating: ${ratingVal} / 10` : undefined,
        '',
        `Liked: ${likedList.join(', ') || '—'}`,
        `Didn't Like: ${dislikedList.join(', ') || '—'}`,
        '',
        'Message:',
        '--------',
        safeMessage || '—',
        '',
        '==== DETAILS ====',
        `Feedback ID: ${feedbackId}`,
        `Submitted: ${new Date().toLocaleString('en-US', { 
          timeZone: 'America/New_York',
          year: 'numeric',
          month: 'long', 
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZoneName: 'short'
        })}`
      ].filter(Boolean).join('\n')

      const sendResult = await resend.emails.send({
        from: fromEmail,
        to: ownerEmail,
        subject: 'New Platform Feedback',
        html,
        text,
        headers: {
          'X-Feedback-ID': feedbackId,
          'X-Feedback-Rating': ratingVal ? String(ratingVal) : 'na'
        }
      })

      if ((sendResult as any)?.error) {
        emailStatus = 'failed'
        emailError = (sendResult as any).error?.message || 'Email send failed'
        console.error('[feedback] Email send failed:', (sendResult as any).error)
      } else {
        console.log('[feedback] Email sent successfully:', sendResult.data?.id)
      }

    } catch (emailErr: any) {
      emailStatus = 'failed'
      emailError = emailErr.message || 'Email exception'
      console.error('[feedback] Email exception:', emailErr)
    }

    // Update feedback record with email status
    const { error: updateError } = await supabase
      .from('feedback')
      .update({
        status: emailStatus,
        email_sent_at: emailStatus === 'sent' ? new Date().toISOString() : null,
        email_error: emailError
      })
      .eq('id', feedbackData.id)

    if (updateError) {
      console.error('[feedback] Failed to update email status:', updateError)
    }

    return NextResponse.json({ 
      ok: true, 
      feedback_id: feedbackId,
      email_status: emailStatus 
    })

  } catch (err: any) {
    console.error('[feedback] Unexpected error:', err)
    return NextResponse.json({ error: 'Failed to process feedback' }, { status: 500 })
  }
}
