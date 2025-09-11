import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'
import crypto from 'crypto'

export async function GET(req: Request) {
  // Derive origin so dev port (3000 vs 3001) mismatches don't break redirect.
  let origin: string | undefined
  try { origin = new URL(req.url).origin } catch {}
  const dynamicRedirect = origin ? `${origin}/api/senders/oauth/google/callback` : undefined
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || dynamicRedirect || `${process.env.NEXT_PUBLIC_APP_URL}/api/senders/oauth/google/callback`
  const scope = encodeURIComponent('https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email openid')
  const clientId = encodeURIComponent(process.env.GOOGLE_OAUTH_CLIENT_ID || '')

  // Try to get current user id (session). If unavailable we still proceed and rely on callback state.
  let userId: string | null = null
  try {
    const supabase = supabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) userId = user.id
  } catch {}

  const rawState = JSON.stringify({ ts: Date.now(), uid: userId })
  const secret = process.env.OAUTH_STATE_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret'
  const sig = crypto.createHmac('sha256', secret).update(rawState).digest('hex')
  const statePayload = JSON.stringify({ d: rawState, s: sig })
  const state = encodeURIComponent(statePayload)
  const url = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&access_type=offline&prompt=consent&state=${state}`
  try { console.log('[oauth] google auth url:', url, 'redirectUri:', redirectUri, 'statePayload:', statePayload, 'uid:', userId) } catch {}
  return NextResponse.redirect(url)
}
