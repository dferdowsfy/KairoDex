import { NextResponse } from 'next/server'
import { rateLimit, deviceFingerprint } from '@/lib/security/rateLimit'
import { supabaseServer } from '@/lib/supabaseServer'

export async function POST(req: Request) {
  const headers = req.headers
  const ip = headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'ip:unknown'
  const fp = deviceFingerprint(headers)
  const rl = rateLimit({ key: `pwreset:${ip}:${fp}`, limit: 5, windowMs: 10 * 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many attempts' }, { status: 429 })
  const { email, redirectTo } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })
  const supabase = supabaseServer()
  const { error } = await (supabase as any).auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo || `${process.env.NEXT_PUBLIC_SITE_URL || ''}/reset-password`
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
