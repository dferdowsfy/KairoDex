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
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const [heroSrc, setHeroSrc] = useState('/img/signup-hero.jpg')
  const router = useRouter()

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    setIsError(false)
    try {
  const resp = await fetch('/api/auth/signup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password, firstName, lastName }) })
      const j = await resp.json()
      if (!resp.ok) {
        const detail = j.issues ? `\n- ${j.issues.join('\n- ')}` : ''
        setMessage((j.error || 'Failed to sign up.') + detail)
        setIsError(true)
        return
      }
      setMessage('Check your email to confirm your account. You can log in after confirming.')
      setIsError(false)
    } catch (e: any) {
      setMessage(e?.message || 'Auth not configured in this environment.')
      setIsError(true)
    } finally { setLoading(false) }
  }

  return (
  <main className="h-dvh overflow-hidden grid lg:grid-cols-2" style={{ background: 'linear-gradient(180deg,#F7F3EE,#F3EEE7 60%, #EFE8DF)' }}>
  <div className="absolute top-4 left-6 z-10"><Logo className="h-9 w-auto" /></div>
    <div className="relative hidden lg:block">
        <Image
      src={heroSrc}
      alt="Modern home exterior"
          fill
          priority
          className="object-cover"
      onError={() => setHeroSrc('https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=1600&auto=format&fit=crop')}
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0B1324]/70 to-transparent" />
        <div className="absolute bottom-8 left-8 text-white drop-shadow-md">
          <div className="text-3xl font-semibold">Join Kairodex</div>
          <div className="opacity-90">A faster way to work your deals</div>
        </div>
      </div>
  <div className="p-6 grid place-items-center">
        <div className="rounded-2xl p-6 w-full max-w-md text-center border border-slate-200 bg-white shadow-sm">
          <div className="text-3xl font-semibold mb-2 text-slate-900">Create account</div>
          <p className="text-sm text-slate-600 mb-6">Use email/password to sign up.</p>
          <form onSubmit={signUp} className="space-y-3 text-left">
            <div className="grid grid-cols-2 gap-2">
              <input type="text" required className="h-11 input-neon px-3 text-base" placeholder="First name" value={firstName} onChange={(e)=>setFirstName(e.target.value)} />
              <input type="text" required className="h-11 input-neon px-3 text-base" placeholder="Last name" value={lastName} onChange={(e)=>setLastName(e.target.value)} />
            </div>
            <input type="email" required className="w-full h-11 input-neon px-3 text-base" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
            <input type="password" required minLength={8} className="w-full h-11 input-neon px-3 text-base" placeholder="Password (min 8 characters)" value={password} onChange={(e)=>setPassword(e.target.value)} />
            <button type="submit" disabled={loading} className="w-full btn-neon">{loading ? 'Creating…' : 'Create account'}</button>
          </form>
          {message && <p className={`text-sm mt-3 ${isError ? 'text-red-600' : 'text-green-600'}`}>{message}</p>}
          <div className="text-xs text-slate-500 mt-4 space-y-1">
            <p>Already have an account? <Link href="/login" className="underline">Log in</Link></p>
            <p>Forgot your password? <Link href="/forgot-password" className="underline">Reset it</Link></p>
          </div>
        </div>
      </div>
    </main>
  )
}
