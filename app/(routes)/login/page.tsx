"use client"
export const dynamic = 'force-dynamic'
import { supabase } from '@/lib/supabaseBrowser'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const signIn = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' })
  }

  const signInEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setLoading(true)
    try {
      const { error } = await (supabase as any).auth.signInWithPassword({ email, password })
      if (error) { setMessage(error.message); return }
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
          return
        }
      } catch {}
      router.push('/')
    } catch (e: any) {
      setMessage(e?.message || 'Auth not configured in this environment.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-dvh grid place-items-center" style={{ background: 'var(--page-bg)' }}>
      <div className="absolute top-4 left-6"><Logo className="h-9 w-auto" /></div>
      <div className="p-6 w-full max-w-md">
        <div className="panel-glass glass-liquid rounded-2xl p-6 text-center border border-white/20">
          <div className="text-3xl font-semibold mb-2 text-white">Sign in</div>
          <p className="text-sm text-gray-300 mb-6">Use Google or your email to continue.</p>
          <button onClick={signIn} className="w-full btn-neon mb-3">Continue with Google</button>
          <div className="text-xs text-gray-300 my-2">or</div>
          <form onSubmit={signInEmail} className="space-y-3 text-left">
            <input type="email" required className="w-full h-11 input-neon px-3 text-base" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
            <input type="password" required className="w-full h-11 input-neon px-3 text-base" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} />
            <button type="submit" disabled={loading} className="w-full btn-neon">{loading ? 'Signing in…' : 'Sign in'}</button>
          </form>
          {message && <p className="text-sm mt-3 text-red-400">{message}</p>}
          <div className="mt-4 space-y-2">
            <p className="text-xs text-gray-300">By continuing you agree to our <Link href="#" className="underline">Terms</Link>.</p>
            <Link href="/signup" className="inline-block w-full rounded-xl border border-white/20 text-white py-3 font-semibold hover:bg-white/10 transition-colors text-center">
              Create account
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
