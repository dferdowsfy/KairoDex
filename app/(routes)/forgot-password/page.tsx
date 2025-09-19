"use client"
import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseBrowser'
import { buildResetPasswordUrl } from '@/lib/authOrigins'
import Logo from '@/components/Logo'

// This page lets a user request a password reset email. It stores the email in
// localStorage so that the /reset-password page can use it when verifying the
// recovery token via supabase.auth.verifyOtp.

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setIsError(false)
    setLoading(true)
    try {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        setMessage('Enter a valid email')
        setIsError(true)
        return
      }
      // Ensure email stored locally for reset verification step later
      try { localStorage.setItem('pw-reset-email', email) } catch {}
      // Include email param so the reset page can recover it even if localStorage isolated
      const { error } = await (supabase as any).auth.resetPasswordForEmail(email, {
        redirectTo: buildResetPasswordUrl(email)
      })
      if (error) {
        setMessage(error.message)
        setIsError(true)
        return
      }
      setMessage('If an account exists, a reset link has been sent. Check your email.')
      setIsError(false)
    } catch (e: any) {
      setMessage(e?.message || 'Unexpected error sending reset email.')
      setIsError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-dvh grid place-items-center" style={{ background: 'linear-gradient(180deg,#F8FAFF,#F2F7FF 60%, #ECF3FF)' }}>
      <div className="absolute top-4 left-6"><Logo className="h-9 w-auto" /></div>
      <div className="p-6 w-full max-w-md">
        <div className="rounded-2xl p-6 text-center border border-slate-200 bg-white shadow-sm">
          <div className="text-3xl font-semibold mb-2 text-slate-900">Forgot password</div>
          <p className="text-sm text-slate-600 mb-6">Enter your email to receive a reset link.</p>
          <form onSubmit={submit} className="space-y-3 text-left">
            <input type="email" required className="w-full h-11 input-neon px-3 text-base" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} />
            <button type="submit" disabled={loading} className="w-full btn-neon">{loading ? 'Sending…' : 'Send reset link'}</button>
          </form>
          {message && <p className={`text-sm mt-3 ${isError ? 'text-red-600' : 'text-green-600'}`}>{message}</p>}
          <div className="mt-4 space-y-2 text-sm">
            <p><Link href="/login" className="underline">Back to sign in</Link></p>
            <p className="text-xs text-slate-500">Did you remember? You can just sign in again.</p>
          </div>
        </div>
      </div>
    </main>
  )
}
