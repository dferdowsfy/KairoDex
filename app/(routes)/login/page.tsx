"use client"
export const dynamic = 'force-dynamic'
import { supabase } from '@/lib/supabaseBrowser'
import { sleep } from '@/lib/utils'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [requireMfa, setRequireMfa] = useState(false)
  const [mfaToken, setMfaToken] = useState('')
  const [failCount, setFailCount] = useState(0)
  const router = useRouter()


  const signInEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setLoading(true)
    try {
      // Route via our API to apply rate limits/backoff
      const resp = await fetch('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) })
      if (!resp.ok) {
        const backoffMs = Math.min(200 * 2 ** failCount, 5000)
        if (backoffMs) await sleep(backoffMs)
        const j = await resp.json().catch(()=>({}))
        setMessage(j.error || 'Failed to sign in.')
        setFailCount((n)=>Math.min(n+1, 6))
        return
      }
      setFailCount(0)
      // Sync browser Supabase session with server response
      const payload = await resp.json().catch(()=>({}))
      try {
        if (payload?.session) {
          await (supabase as any).auth.setSession(payload.session)
        }
      } catch {}

      // If MFA is enabled for this user, prompt for code (based on payload)
      try {
        const enabled = !!(payload?.user?.user_metadata?.mfa_enabled)
        if (enabled) {
          setRequireMfa(true)
          return
        }
      } catch {}

      // Gate by public.users: only allow emails present in that table
      try {
        const { data: row } = await (supabase as any)
          .from('users')
          .select('id')
          .eq('email', email)
          .maybeSingle()
        if (!row) {
          await (supabase as any).auth.signOut()
          setMessage('Your email is not registered. Please contact support or sign up first.')
          window.location.href = '/kairodex.html'
          return
        }
      } catch {}
  router.push('/')
  // Ensure server components and caches reflect the new auth state
  try { (router as any).refresh?.() } catch {}
    } catch (e: any) {
      setMessage(e?.message || 'Auth not configured in this environment.')
    } finally {
      setLoading(false)
    }
  }

  const submitMfa = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      const resp = await fetch('/api/auth/mfa/check', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: mfaToken }) })
      const j = await resp.json().catch(()=>({}))
      if (!resp.ok) { setMessage(j.error || 'Invalid code'); return }
  router.push('/')
  try { (router as any).refresh?.() } catch {}
    } catch (e: any) {
      setMessage(e?.message || 'MFA check failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-dvh grid place-items-center" style={{ background: 'linear-gradient(180deg,#F8FAFF,#F2F7FF 60%, #ECF3FF)' }}>
      <div className="absolute top-4 left-6"><Logo className="h-9 w-auto" /></div>
      <div className="p-6 w-full max-w-md">
        <div className="rounded-2xl p-6 text-center border border-slate-200 bg-white shadow-sm">
          <div className="text-3xl font-semibold mb-2 text-slate-900">Sign in</div>
          <p className="text-sm text-slate-600 mb-6">Use your email to continue.</p>
          {!requireMfa ? (
          <form onSubmit={signInEmail} className="space-y-3 text-left">
            <input type="email" required className="w-full h-11 input-neon px-3 text-base" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
            <input type="password" required className="w-full h-11 input-neon px-3 text-base" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} />
            <div className="text-right -mt-1">
              <Link href="/forgot-password" className="text-xs text-slate-500 hover:text-slate-700 underline">Forgot password?</Link>
            </div>
            <button type="submit" disabled={loading} className="w-full btn-neon">{loading ? 'Signing in…' : 'Sign in'}</button>
          </form>
          ) : (
            <form onSubmit={submitMfa} className="space-y-3 text-left">
              <input type="text" required className="w-full h-11 input-neon px-3 text-base" placeholder="6-digit code" value={mfaToken} onChange={(e)=>setMfaToken(e.target.value)} />
              <button type="submit" disabled={loading} className="w-full btn-neon">{loading ? 'Verifying…' : 'Verify code'}</button>
            </form>
          )}
          {message && <p className="text-sm mt-3 text-red-600">{message}</p>}
          <div className="mt-4 space-y-2">
            <p className="text-xs text-slate-500">By continuing you agree to our <Link href="#" className="underline">Terms</Link>.</p>
            <Link href="/signup" className="inline-block w-full rounded-xl border border-slate-200 text-slate-900 py-3 font-semibold hover:bg-slate-50 transition-colors text-center">
              Create account
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
