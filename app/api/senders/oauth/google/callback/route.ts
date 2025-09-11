import { NextRequest, NextResponse } from 'next/server'
// use built-in fetch and URLSearchParams
import { supabaseServer } from '@/lib/supabaseServer'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 })

  // Exchange code for tokens
  const tokenBody = new URLSearchParams({
    code: code || '',
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
    client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/senders/oauth/google/callback`,
    grant_type: 'authorization_code'
  })
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenBody.toString()
  })
  const tokenJson: any = await tokenRes.json()
  if (tokenJson?.error) return NextResponse.json({ error: tokenJson.error_description || tokenJson.error }, { status: 400 })

  const refresh_token: string | undefined = tokenJson.refresh_token
  const access_token: string | undefined = tokenJson.access_token

  // Use access_token to get user's primary email
  const meRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${access_token}` } })
  const me: any = await meRes.json()
  const email: string | undefined = me?.email
  if (!email) return NextResponse.json({ error: 'Unable to determine user email' }, { status: 400 })

  // Save sender row
  const supabase = supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const upsert = await supabase.from('senders').upsert({ owner_id: user.id, email, method: 'oauth_google', verified: true, oauth_refresh_token: refresh_token, meta: { provider: 'google' } }, { onConflict: 'owner_id,email' }).select().single()
  if (upsert.error) return NextResponse.json({ error: upsert.error.message }, { status: 500 })

  // Redirect back to app sender management
  return NextResponse.redirect(process.env.NEXT_PUBLIC_APP_URL || '/')
}
