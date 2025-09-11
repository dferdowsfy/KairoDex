import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/senders/oauth/google/callback`
  const scope = encodeURIComponent('https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email openid')
  const clientId = encodeURIComponent(process.env.GOOGLE_OAUTH_CLIENT_ID || '')
  const state = encodeURIComponent(JSON.stringify({ ts: Date.now() }))
  const url = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&access_type=offline&prompt=consent&state=${state}`
  // Log the exact redirect URL to help debug redirect_uri_mismatch errors
  try { console.log('[oauth] google auth url:', url) } catch (e) { /* ignore logging errors */ }
  return NextResponse.redirect(url)
}
