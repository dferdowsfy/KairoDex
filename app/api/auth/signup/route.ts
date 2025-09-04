import { NextResponse } from 'next/server'
import { rateLimit, deviceFingerprint } from '@/lib/security/rateLimit'
import { checkPasswordPolicy } from '@/lib/security/password'
import { supabaseServer } from '@/lib/supabaseServer'

export async function POST(req: Request) {
  const headers = req.headers
  const ip = headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'ip:unknown'
  const fp = deviceFingerprint(headers)
  const key = `signup:${ip}:${fp}`
  const rl = rateLimit({ key, limit: 10, windowMs: 10 * 60_000 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 })
  }

  const { email, password, firstName, lastName } = await req.json()
  if (!email || !password) return NextResponse.json({ error: 'Missing email or password' }, { status: 400 })
  const policy = await checkPasswordPolicy({ password, email, firstName, lastName })
  if (!policy.ok) return NextResponse.json({ error: 'Weak password', issues: policy.issues }, { status: 400 })

  const supabase = supabaseServer()
  
  const { data, error } = await (supabase as any).auth.signUp({ 
    email, 
    password, 
    options: { data: { first_name: firstName, last_name: lastName } } 
  })
  
  if (error) {
    // Check if error indicates user already exists
    if (error.message.includes('already') || error.message.includes('exists') || error.message.includes('registered')) {
      return NextResponse.json({ error: 'An account with this email already exists. Please log in instead.' }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  
  // Check if user already existed (Supabase sometimes returns existing user without error)
  if (data.user && data.user.email_confirmed_at) {
    // If email is already confirmed, this user already existed
    return NextResponse.json({ error: 'An account with this email already exists. Please log in instead.' }, { status: 400 })
  }
  
  return NextResponse.json({ user: data.user, message: 'Check email to confirm account.' })
}
