"use client"
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseBrowser'

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [msg, setMsg] = useState<string|undefined>()
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(undefined)
    if (newPassword !== confirm) { setMsg('Passwords do not match.'); return }
    setLoading(true)
    try {
      // When arriving via email link, Supabase creates a recovery session in the browser
      const { data: { session } } = await (supabase as any).auth.getSession()
      if (!session) { setMsg('Recovery session not found. Open the link from your email on this device.'); return }
      const { error } = await (supabase as any).auth.updateUser({ password: newPassword })
      if (error) { setMsg(error.message); return }
      setMsg('Password updated. You can now sign in.')
      setTimeout(()=>router.push('/login'), 1000)
    } catch (e: any) {
      setMsg(e?.message || 'Unexpected error.')
    } finally { setLoading(false) }
  }

  return (
    <main className="min-h-dvh grid place-items-center">
      <form onSubmit={onSubmit} className="w-full max-w-sm border rounded-xl p-4 bg-white space-y-3">
        <h1 className="text-xl font-semibold">Set new password</h1>
        <input type="password" className="w-full h-10 input-neon px-3" placeholder="New password (min 12)" value={newPassword} onChange={e=>setNewPassword(e.target.value)} minLength={12} required />
        <input type="password" className="w-full h-10 input-neon px-3" placeholder="Confirm new password" value={confirm} onChange={e=>setConfirm(e.target.value)} minLength={12} required />
        {msg && <p className="text-sm text-red-600">{msg}</p>}
        <button disabled={loading} className="btn-neon w-full">{loading ? 'Saving…' : 'Save password'}</button>
      </form>
    </main>
  )
}
