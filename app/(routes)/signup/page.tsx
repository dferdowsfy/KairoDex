"use client"
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseBrowser'
import Image from 'next/image'
import Logo from '@/components/Logo'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      const { data, error } = await (supabase as any).auth.signUp({ email, password })
      if (error) { setMessage(error.message); return }
      // Ensure the user exists in public.users for app authorization
      try {
        await (supabase as any)
          .from('users')
          .upsert({ email }, { onConflict: 'email' })
      } catch {}
      setMessage('Check your email to confirm your account. You can log in after confirming.')
    } catch (e: any) {
      setMessage(e?.message || 'Auth not configured in this environment.')
    } finally { setLoading(false) }
  }

  return (
    <main className="min-h-dvh grid lg:grid-cols-2" style={{ background: 'var(--page-bg)' }}>
      <div className="absolute top-4 left-6 z-10"><Logo className="h-9 w-auto" /></div>
      <div className="relative hidden lg:block">
        <Image
          src="https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=1600&auto=format&fit=crop"
          alt="Modern beach home at sunset"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0B1324]/70 to-transparent" />
        <div className="absolute bottom-8 left-8 text-white drop-shadow-md">
          <div className="text-3xl font-semibold">Join AgentHub</div>
          <div className="opacity-90">A faster way to work your deals</div>
        </div>
      </div>
      <div className="p-6 grid place-items-center">
        <div className="panel-glass glass-liquid rounded-2xl p-6 w-full max-w-md text-center border border-white/20">
          <div className="text-3xl font-semibold mb-2 text-white">Create account</div>
          <p className="text-sm text-gray-300 mb-6">Use email/password to sign up.</p>
          <form onSubmit={signUp} className="space-y-3 text-left">
            <input type="email" required className="w-full h-11 input-neon px-3 text-base" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
            <input type="password" required minLength={8} className="w-full h-11 input-neon px-3 text-base" placeholder="Password (min 8 chars)" value={password} onChange={(e)=>setPassword(e.target.value)} />
            <button type="submit" disabled={loading} className="w-full btn-neon">{loading ? 'Creating…' : 'Create account'}</button>
          </form>
          {message && <p className="text-sm mt-3 text-gray-300">{message}</p>}
          <p className="text-xs text-gray-300 mt-4">Already have an account? <Link href="/login" className="underline">Log in</Link></p>
        </div>
      </div>
    </main>
  )
}
