import { NextResponse } from 'next/server'
import { rateLimit, deviceFingerprint } from '@/lib/security/rateLimit'
import { supabaseServer } from '@/lib/supabaseServer'

export async function POST(req: Request) {
  const headers = req.headers
  const ip = headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'ip:unknown'
  const fp = deviceFingerprint(headers)
  const key = `login:${ip}:${fp}`
  const rl = rateLimit({ key, limit: 20, windowMs: 10 * 60_000 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many attempts. Please wait and try again.' }, { status: 429 })
  }
  const { email, password } = await req.json()
  if (!email || !password) return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })

  const supabase = supabaseServer()
  const { data, error } = await (supabase as any).auth.signInWithPassword({ email, password })
  if (error) {
    // very small backoff hint via header (client can implement)
    const res = NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    res.headers.set('X-Backoff-Suggest', '500')
    return res
  }
  const res = NextResponse.json({ user: data.user, session: data.session })
  const mfaEnabled = !!(data.user?.user_metadata as any)?.mfa_enabled
  if (mfaEnabled) {
    res.cookies.set('ah_mfa_req', '1', { httpOnly: true, secure: true, sameSite: 'strict', path: '/' })
    res.cookies.delete('ah_mfa_ok')
  } else {
    res.cookies.delete('ah_mfa_req')
    res.cookies.delete('ah_mfa_ok')
  }
  return res
}
