import { NextResponse } from 'next/server'
import { rateLimit, deviceFingerprint } from '@/lib/security/rateLimit'
import { supabaseServer } from '@/lib/supabaseServer'
import { buildResetPasswordUrl } from '@/lib/authOrigins'

export async function POST(req: Request) {
  const headers = req.headers
  const ip = headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'ip:unknown'
  const fp = deviceFingerprint(headers)
  const rl = rateLimit({ key: `pwreset:${ip}:${fp}`, limit: 5, windowMs: 10 * 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many attempts' }, { status: 429 })
  const { email, redirectTo } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })
  const supabase = supabaseServer()
  
  // Get site URL from environment with appropriate fallbacks
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                 process.env.NEXT_PUBLIC_AUTH_BROWSER_ORIGIN || 
                 'https://kairodex.com'
  
  // Ensure site URL doesn't end with a slash
  const baseUrl = siteUrl.replace(/\/$/, '')
  
  // Explicitly build the redirect URL to ensure it points to the reset-password page
  const builtRedirect = `${baseUrl}/reset-password?email=${encodeURIComponent(email)}&forceBrowser=1`
  
  // Prefer provided redirectTo, else our custom built URL (which ensures forceBrowser=1 param)
  const finalRedirect = redirectTo || builtRedirect
  
  // Ensure the redirect URL contains /reset-password path
  const validatedRedirect = finalRedirect.includes('/reset-password') 
    ? finalRedirect 
    : builtRedirect
    
  const { error } = await (supabase as any).auth.resetPasswordForEmail(email, { redirectTo: validatedRedirect })
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log('[pw-reset] requested for', email, 'redirectTo ->', finalRedirect)
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
