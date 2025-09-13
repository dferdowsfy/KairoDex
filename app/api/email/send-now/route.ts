import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'
import { resend, RESEND_FROM } from '@/lib/resend'

function base64UrlEncode(str: string) {
  return Buffer.from(str, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

async function sendViaGmail(refreshToken: string, from: string, to: string[], subject: string, bodyHtml: string) {
  // exchange refresh token for access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: {'Content-Type':'application/x-www-form-urlencoded'}, body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || '', client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '' }) })
  const tokenJson: any = await tokenRes.json()
  if (tokenJson?.error) throw new Error(tokenJson.error_description || tokenJson.error || 'Failed to refresh token')
  const accessToken = tokenJson.access_token
  if (!accessToken) throw new Error('No access token from Google')

  // Build a simple MIME message
  const toHeader = to.join(', ')
  const raw = `From: ${from}\r\nTo: ${toHeader}\r\nSubject: ${subject}\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n${bodyHtml}`
  const encoded = base64UrlEncode(raw)
  const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ raw: encoded }) })
  const jr = await sendRes.json()
  if (!sendRes.ok) throw new Error(jr?.error?.message || 'Gmail send failed')
  return jr
}

export async function POST(req: NextRequest) {
  const supabase = supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { to, subject, bodyMd, clientId, senderId } = await req.json()
    
    if (!to || !Array.isArray(to) || to.length === 0) {
      return NextResponse.json({ error: 'Recipients required' }, { status: 400 })
    }
    
    if (!subject) {
      return NextResponse.json({ error: 'Subject required' }, { status: 400 })
    }
    
    if (!bodyMd) {
      return NextResponse.json({ error: 'Email body required' }, { status: 400 })
    }

    console.log('[email/send-now] Sending email immediately', { 
      to: to.length, 
      subject,
      hasBody: !!bodyMd,
      senderId: senderId || 'default' 
    })

    // Convert markdown to HTML (simple conversion)
    const bodyHtml = bodyMd.replace(/\n/g, '<br>')
    
    let status: 'sent' | 'failed' = 'sent'
    let error_text: string | null = null
    let sendResponse: any = null
    
    // If senderId provided, validate and attempt provider-specific send
    let senderRow: any = null
    if (senderId) {
      const sres = await supabase.from('senders').select('*').eq('id', senderId).single()
      if (sres.error) return NextResponse.json({ error: 'Invalid sender' }, { status: 400 })
      senderRow = sres.data
      if (senderRow.owner_id !== user.id) return NextResponse.json({ error: 'Sender not owned by user' }, { status: 403 })
      
      try {
        if (senderRow.method === 'oauth_google' && senderRow.oauth_refresh_token) {
          console.log('[email/send-now] Sending via Gmail:', senderRow.email)
          const gmailRes = await sendViaGmail(senderRow.oauth_refresh_token, senderRow.email, to, subject, bodyHtml)
          sendResponse = gmailRes
          status = 'sent'
        } else {
          // fallback to Resend but try to use sender email as from when possible
          console.log('[email/send-now] Sending via Resend with custom from:', senderRow.email)
          const fromAddr = senderRow.email || RESEND_FROM
          const sendRes = await resend.emails.send({ from: fromAddr, to, subject, html: bodyHtml }) as any
          sendResponse = sendRes
          if (sendRes?.error) {
            status = 'failed'
            error_text = sendRes.error?.message || 'Resend error'
          }
        }
      } catch (e: any) {
        status = 'failed'
        error_text = e.message
        console.error('[email/send-now] Provider send error:', e)
      }
    } else {
      // Default: Send via Resend
      try {
        console.log('[email/send-now] Sending via Resend (default)')
        const sendRes = await resend.emails.send({
          from: RESEND_FROM,
          to,
          subject,
          html: bodyHtml
        })
        sendResponse = sendRes
        if (sendRes?.error) {
          status = 'failed'
          error_text = sendRes.error?.message || 'Resend error'
        }
      } catch (e: any) {
        status = 'failed'
        error_text = e.message
        console.error('[email/send-now] Resend error:', e)
      }
    }

    if (status === 'failed') {
      return NextResponse.json({ 
        error: 'Failed to send email', 
        details: error_text 
      }, { status: 500 })
    }

    console.log('[email/send-now] Email sent successfully:', sendResponse.data?.id || sendResponse.id)

    // Log to database for tracking
    try {
      const dbResult = await supabase.from('emails').insert({
        owner_id: user.id,
        client_id: clientId || user.id,
        to_emails: to,
        subject,
        body_md: bodyMd,
        body_html: bodyHtml,
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      
      if (dbResult.error) {
        console.warn('[email/send-now] Failed to log to database:', dbResult.error)
      } else {
        console.log('[email/send-now] Successfully logged to database')
      }
    } catch (dbError) {
      console.warn('[email/send-now] Failed to log to database:', dbError)
      // Don't fail the request if logging fails
    }

    return NextResponse.json({ 
      success: true,
      emailId: sendResponse.data?.id || sendResponse.id,
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
