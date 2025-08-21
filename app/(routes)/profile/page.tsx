"use client"
export const dynamic = 'force-dynamic'
import { useTheme, THEME_PRESETS, ThemeName } from '@/store/theme'
import { Check } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseBrowser'
import { useSessionUser } from '@/hooks/useSessionUser'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const router = useRouter()
  useEffect(() => { router.replace('/settings') }, [router])
  const { name, colors, setTheme, setColors, reset } = useTheme()
  const presetEntries = Object.entries(THEME_PRESETS) as [ThemeName, typeof colors][]
  const { user } = useSessionUser()

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwMessage, setPwMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const provider: string | undefined = (user as any)?.app_metadata?.provider || (user as any)?.identities?.[0]?.provider

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwMessage(null)
    if (!user) {
      setPwMessage({ type: 'error', text: 'You must be logged in to change your password.' })
      return
    }
    if (provider && provider !== 'email') {
      setPwMessage({ type: 'error', text: 'Your account uses an external provider (e.g. Google). Manage your password via your provider.' })
      return
    }
    if (newPassword.length < 8) {
      setPwMessage({ type: 'error', text: 'New password must be at least 8 characters.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPwMessage({ type: 'error', text: 'New password and confirmation do not match.' })
      return
    }
    setPwLoading(true)
    try {
      // Optional: verify current password by re-authenticating
      if (currentPassword) {
        const email = (user as any)?.email
        if (email) {
          const { error: signInErr } = await (supabase as any).auth.signInWithPassword({ email, password: currentPassword })
          if (signInErr) {
            setPwLoading(false)
            setPwMessage({ type: 'error', text: 'Current password is incorrect.' })
            return
          }
        }
      }
      const { error } = await (supabase as any).auth.updateUser({ password: newPassword })
      if (error) {
        setPwMessage({ type: 'error', text: error.message || 'Failed to change password.' })
      } else {
        setPwMessage({ type: 'success', text: 'Password updated successfully.' })
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch (err: any) {
      setPwMessage({ type: 'error', text: err?.message || 'Auth is not configured in this environment.' })
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <main className="p-4">
  <h1 className="text-xl font-semibold mb-4 text-ink">Profile & Theme</h1>

      <section className="mb-6">
  <h2 className="text-sm font-medium text-ink/80 mb-2">Change password</h2>
        <div className="bg-white rounded-2xl border border-slate-200 p-3">
          {!user ? (
            <p className="text-sm text-ink/60">Sign in to manage your password.</p>
          ) : provider && provider !== 'email' ? (
            <p className="text-sm text-ink/60">This account uses {provider}. Manage your password in your identity provider settings.</p>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="w-40 text-sm text-ink/60">Current password</label>
                <input
                  type="password"
                  className="flex-1 h-9 input-neon px-2 text-sm"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="w-40 text-sm text-ink/60">New password</label>
                <input
                  type="password"
                  className="flex-1 h-9 input-neon px-2 text-sm"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="w-40 text-sm text-ink/60">Confirm new password</label>
                <input
                  type="password"
                  className="flex-1 h-9 input-neon px-2 text-sm"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  required
                  minLength={8}
                />
              </div>
              {pwMessage && (
                <div className={pwMessage.type === 'success' ? 'text-green-600 text-sm' : 'text-red-600 text-sm'}>
                  {pwMessage.text}
                </div>
              )}
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-lg bg-primary/90 hover:bg-primary text-white text-sm px-4 py-2 disabled:opacity-50"
                  disabled={pwLoading}
                >
                  {pwLoading ? 'Updating…' : 'Update password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      <section className="mb-6">
  <h2 className="text-sm font-medium text-ink/80 mb-2">Quick themes</h2>
        <div className="grid grid-cols-2 gap-3">
          {presetEntries.map(([key, c]) => (
            <button key={key} onClick={() => setTheme(key)} className={`text-left rounded-xl border px-3 py-3 bg-white transition hover:shadow-sm ${name===key? 'border-primary ring-2 ring-primary/20' : 'border-slate-200'}`} aria-pressed={name===key}>
              <div className="flex items-center justify-between">
                <span className="capitalize font-medium text-ink">{key}</span>
                {name===key && <Check className="h-4 w-4 text-primary" />}
              </div>
              <div className="mt-2 flex gap-1">
                {['primary','accent','warn','danger'].map((k) => (
                  <span key={k} className="h-5 w-5 rounded-full border border-slate-200" style={{ backgroundColor: (c as any)[k] }} />
                ))}
              </div>
            </button>
          ))}
        </div>
        <div className="mt-3">
          <button onClick={reset} className="text-xs text-ink/80 underline">Reset to default</button>
        </div>
      </section>

      <section>
  <h2 className="text-sm font-medium text-ink/80 mb-2">Custom colors</h2>
        <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-3">
          <div className="flex items-center gap-3">
            <label className="w-32 text-sm text-ink/60">Page background</label>
            {/* Color picker for solid colors */}
            <input
              type="color"
              aria-label="Page background color"
              className="h-9 w-14 rounded border border-slate-200"
              value={/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(colors.pageBg || '') ? (colors.pageBg as string) : '#ffffff'}
              onChange={(e) => setColors({ pageBg: e.target.value })}
              title="Pick a solid color. For gradients, use the text field."
            />
            {/* Freeform text for gradients or CSS color strings */}
            <input
              type="text"
              className="flex-1 h-9 input-neon px-2 text-sm"
              placeholder="CSS color or gradient, e.g. linear-gradient(180deg,#fff,var(--surface))"
              value={colors.pageBg || ''}
              onChange={(e) => setColors({ pageBg: e.target.value })}
            />
            <span className="h-6 w-6 rounded-full border border-slate-200" style={{ background: colors.pageBg || 'var(--surface)' }} />
          </div>
          {([
            ['primary','Primary'],
            ['primarySoft','Primary soft'],
            ['accent','Accent'],
            ['accentSoft','Accent soft'],
            ['warn','Warning'],
            ['warnSoft','Warning soft'],
            ['danger','Danger'],
            ['dangerSoft','Danger soft'],
            ['ink','Text (ink)'],
            ['surface','Surface'],
            ['card','Card']
          ] as const).map(([key, label]) => (
            <div key={key} className="flex items-center gap-3">
              <label className="w-32 text-sm text-ink/60">{label}</label>
              <input type="color" aria-label={`${label} color`} className="h-9 w-14 rounded border border-slate-200" value={(colors as any)[key]} onChange={(e) => setColors({ [key]: e.target.value } as any)} />
              <input type="text" className="flex-1 h-9 input-neon px-2 text-sm" value={(colors as any)[key]} onChange={(e) => setColors({ [key]: e.target.value } as any)} />
              <span className="h-6 w-6 rounded-full border border-slate-200" style={{ backgroundColor: (colors as any)[key] }} />
            </div>
          ))}
          <div className="text-xs text-ink/60">Changes save automatically to this device.</div>
        </div>
      </section>
    </main>
  )
}
