import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'
import { markdownToHtml } from '@/lib/email'
import { resend, RESEND_FROM } from '@/lib/resend'

function base64UrlEncode(str: string) {
  return Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
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
  const { to, subject, bodyMd, clientId, cadence, senderId } = await req.json()
    if (!Array.isArray(to) || !to.length) return NextResponse.json({ error: 'No recipients' }, { status: 400 })
    if (!subject || !bodyMd) return NextResponse.json({ error: 'Missing subject/body' }, { status: 400 })

    const bodyHtml = markdownToHtml(bodyMd)
    let status: 'sent' | 'failed' = 'sent'
    let error_text: string | null = null

    let resendResponse: any = null
    // If senderId provided, validate and attempt provider-specific send
    let senderRow: any = null
    if (senderId) {
      const sres = await supabase.from('senders').select('*').eq('id', senderId).single()
      if (sres.error) return NextResponse.json({ error: 'Invalid sender' }, { status: 400 })
      senderRow = sres.data
      if (senderRow.owner_id !== user.id) return NextResponse.json({ error: 'Sender not owned by user' }, { status: 403 })
      try {
        if (senderRow.method === 'oauth_google' && senderRow.oauth_refresh_token) {
          const gmailRes = await sendViaGmail(senderRow.oauth_refresh_token, senderRow.email, to, subject, bodyHtml)
          resendResponse = gmailRes
          status = 'sent'
        } else {
          // fallback to Resend but try to use sender email as from when possible
          const fromAddr = senderRow.email || RESEND_FROM
          const sendRes = await resend.emails.send({ from: fromAddr, to, subject, html: bodyHtml }) as any
          resendResponse = sendRes
          if (sendRes?.error) {
            status = 'failed'
            error_text = sendRes.error?.message || 'Resend error'
          }
        }
      } catch (e: any) {
        status = 'failed'
        error_text = e.message
      }
    } else {
      try {
        const sendRes = await resend.emails.send({ from: RESEND_FROM, to, subject, html: bodyHtml }) as any
        resendResponse = sendRes
        if (sendRes?.error) {
          status = 'failed'
          error_text = sendRes.error?.message || 'Resend error'
        }
        console.log('[email] resend response', JSON.stringify(sendRes))
      } catch (e: any) {
        status = 'failed'
        error_text = e.message
        console.error('[email] resend error', e)
      }
    }

    let emailRow: any
    let error: any
    const baseInsert: any = {
      owner_id: user.id,
      client_id: clientId || user.id,
      to_emails: to,
      subject,
      body_md: bodyMd,
      body_html: bodyHtml,
      sender_id: senderId || null,
      status,
      sent_at: status === 'sent' ? new Date().toISOString() : null,
      error_text,
    }
    const cadenceValue = cadence && ['none','biweekly','monthly'].includes(cadence) ? cadence : 'none'
    // Try with cadence column first
    let insertRes = await supabase.from('emails').insert({ ...baseInsert, cadence: cadenceValue }).select().single()
    emailRow = insertRes.data; error = insertRes.error
    if (error && /cadence/.test(error.message)) {
      // Retry without cadence column (migration not applied yet)
      const retry = await supabase.from('emails').insert(baseInsert).select().single()
      emailRow = retry.data; error = retry.error
    }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ email: emailRow, resend: resendResponse })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unexpected' }, { status: 500 })
  }
}
