import { NextResponse } from 'next/server'
import { checkPasswordPolicy } from '@/lib/security/password'
import { supabaseServer } from '@/lib/supabaseServer'

export async function POST(req: Request) {
  const { newPassword } = await req.json()
  if (!newPassword) return NextResponse.json({ error: 'Missing new password' }, { status: 400 })
  const policy = await checkPasswordPolicy({ password: newPassword })
  if (!policy.ok) return NextResponse.json({ error: 'Weak password', issues: policy.issues }, { status: 400 })
  const supabase = supabaseServer()
  const { error } = await (supabase as any).auth.updateUser({ password: newPassword })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
