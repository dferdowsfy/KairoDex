import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'
import crypto from 'crypto'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 })

  // Exchange code for tokens
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/senders/oauth/google/callback`
  const tokenBody = new URLSearchParams({
    code: code || '',
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
    client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
    redirect_uri: redirectUri,
    grant_type: 'authorization_code'
  })
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenBody.toString()
  })
  const tokenJson: any = await tokenRes.json()
  if (tokenJson?.error) {
    console.warn('[oauth] token exchange failed', tokenRes.status, tokenJson)
    return NextResponse.json({ error: tokenJson.error_description || tokenJson.error, detail: tokenJson }, { status: 400 })
  }

  const refresh_token: string | undefined = tokenJson.refresh_token
  const access_token: string | undefined = tokenJson.access_token

  // Use access_token to get user's primary email
  const meRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${access_token}` } })
  const me: any = await meRes.json()
  const email: string | undefined = me?.email
  if (!email) {
    console.warn('[oauth] userinfo failed', meRes.status, me)
    return NextResponse.json({ error: 'Unable to determine user email', detail: me }, { status: 400 })
  }

  // Save sender row
  const supabase = supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  let userId = user?.id as string | undefined

  if (!userId) {
    // Attempt state-based fallback
    try {
      if (state) {
        const parsed = JSON.parse(state)
        if (parsed?.d && parsed?.s) {
          const secret = process.env.OAUTH_STATE_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret'
            const sigCheck = crypto.createHmac('sha256', secret).update(parsed.d).digest('hex')
          if (sigCheck === parsed.s) {
            const inner = JSON.parse(parsed.d)
            if (inner?.uid) userId = inner.uid
          } else {
            console.warn('[oauth] state signature mismatch')
          }
        }
      }
    } catch (e) {
      console.warn('[oauth] state parse error', (e as any)?.message)
    }
  }

  if (!userId) {
    console.warn('[oauth] no user id after fallback – state:', state)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const upsert = await supabase.from('senders').upsert({ owner_id: userId, email, method: 'oauth_google', verified: true, oauth_refresh_token: refresh_token, meta: { provider: 'google' } }, { onConflict: 'owner_id,email' }).select().single()
  if (upsert.error) return NextResponse.json({ error: upsert.error.message }, { status: 500 })

  // Redirect back to app sender management
  return NextResponse.redirect(process.env.NEXT_PUBLIC_APP_URL || '/')
}
