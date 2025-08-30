import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'
import { generateTotpSecret, otpauthURL } from '@/lib/security/totp'

export async function POST() {
  const supabase = supabaseServer()
  const { data: { user } } = await (supabase as any).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { secret } = generateTotpSecret()
  const url = otpauthURL({ secretB32: secret, label: `${user.email}`, issuer: 'AgentHub' })
  // Store temp secret in metadata until verified
  const meta = { ...(user.user_metadata || {}), mfa_pending_secret: secret }
  const { error } = await (supabase as any).auth.updateUser({ data: meta })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ secret, otpauth: url })
}
