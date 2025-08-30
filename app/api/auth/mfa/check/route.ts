import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'
import { verifyTotp } from '@/lib/security/totp'

export async function POST(req: Request) {
  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  const supabase = supabaseServer()
  const { data: { user } } = await (supabase as any).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const secret = (user.user_metadata as any)?.mfa_secret
  if (!secret) return NextResponse.json({ error: 'MFA not enabled' }, { status: 400 })
  const ok = verifyTotp(secret, token)
  if (!ok) return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
  const res = NextResponse.json({ ok: true })
  res.cookies.set('ah_mfa_ok', '1', { httpOnly: true, secure: true, sameSite: 'strict', path: '/' })
  res.cookies.delete('ah_mfa_req')
  return res
}
