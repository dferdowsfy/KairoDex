import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'
import { verifyTotp } from '@/lib/security/totp'

export async function POST(req: Request) {
  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  const supabase = supabaseServer()
  const { data: { user } } = await (supabase as any).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const pending = (user.user_metadata as any)?.mfa_pending_secret
  if (!pending) return NextResponse.json({ error: 'No pending enrollment' }, { status: 400 })
  const ok = verifyTotp(pending, token)
  if (!ok) return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
  const meta = { ...(user.user_metadata || {}), mfa_secret: pending, mfa_enabled: true }
  delete (meta as any).mfa_pending_secret
  const { error } = await (supabase as any).auth.updateUser({ data: meta })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
