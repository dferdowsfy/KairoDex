"use client"
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import Toggle from '@/components/Toggle'
import { supabase } from '@/lib/supabaseBrowser'
import { useSessionUser } from '@/hooks/useSessionUser'

// ...existing code...
export default function SettingsPage() {
  const { user } = useSessionUser()

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwMessage, setPwMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const provider: string | undefined = (user as any)?.app_metadata?.provider || (user as any)?.identities?.[0]?.provider

  // Profile
  const [displayName, setDisplayName] = useState<string>('')
  const [firstName, setFirstName] = useState<string>('')
  const [lastName, setLastName] = useState<string>('')
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Notifications (stored locally for now)
  const [notifEmail, setNotifEmail] = useState<boolean>(true)
  const [notifSms, setNotifSms] = useState<boolean>(false)
  const [notifTaskReminders, setNotifTaskReminders] = useState<boolean>(true)
  const [notifMsg, setNotifMsg] = useState<string>('')

  // Appearance (stored locally; applied via CSS variables)
  const [chatBotColor, setChatBotColor] = useState<string>('')
  const [chatBgPreset, setChatBgPreset] = useState<'default' | 'midnight' | 'slate'>('default')
  const [appearanceMsg, setAppearanceMsg] = useState<string>('')

  useEffect(() => {
  const meta = (user as any)?.user_metadata || {}
  const dn = meta?.display_name || meta?.name || ''
    setDisplayName(dn)
  setFirstName(meta?.first_name || '')
  setLastName(meta?.last_name || '')
    if (typeof window !== 'undefined') {
      try {
  // Backward-compatible migration: agenthub-settings.* -> kairodex-settings.*
  const rawN = window.localStorage.getItem('kairodex-settings.notifications') || window.localStorage.getItem('agenthub-settings.notifications')
        if (rawN) {
          const n = JSON.parse(rawN)
          setNotifEmail(!!n.email)
          setNotifSms(!!n.sms)
          setNotifTaskReminders(!!n.taskReminders)
        }
  const rawA = window.localStorage.getItem('kairodex-settings.appearance') || window.localStorage.getItem('agenthub-settings.appearance')
        if (rawA) {
          const a = JSON.parse(rawA)
          if (a.chatBotColor) setChatBotColor(a.chatBotColor)
          if (a.chatBgPreset) setChatBgPreset(a.chatBgPreset)
          applyAppearance({ chatBotColor: a.chatBotColor, chatBgPreset: a.chatBgPreset || 'default' })
        }
      } catch {}
    }
  }, [user])

  function applyAppearance(opts: { chatBotColor?: string; chatBgPreset?: 'default'|'midnight'|'slate' }) {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    if (opts.chatBotColor) root.style.setProperty('--chat-bot-bg', opts.chatBotColor)
    const bg = (() => {
      const p = opts.chatBgPreset || 'default'
      if (p === 'midnight') return 'linear-gradient(180deg, rgba(3,7,18,0.96), rgba(2,6,23,0.94))'
      if (p === 'slate') return 'linear-gradient(180deg, rgba(15,23,42,0.92), rgba(30,41,59,0.92))'
      return 'linear-gradient(180deg, rgba(2, 9, 36, 0.95), rgba(17, 4, 30, 0.95))'
    })()
    root.style.setProperty('--chat-bg', bg)
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfileMsg(null)
    if (!user) { setProfileMsg({ type: 'error', text: 'You must be logged in.' }); return }
    try {
      const fullName = (firstName || lastName) ? `${firstName} ${lastName}`.trim() : displayName
      const { error } = await (supabase as any).auth.updateUser({ data: { display_name: fullName, first_name: firstName, last_name: lastName } })
      if (error) throw error
      setProfileMsg({ type: 'success', text: 'Profile updated.' })
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err?.message || 'Failed to update profile.' })
    }
  }

  function saveNotifications(e: React.FormEvent) {
    e.preventDefault()
    try {
      const data = { email: notifEmail, sms: notifSms, taskReminders: notifTaskReminders }
  try { window.localStorage.removeItem('agenthub-settings.notifications') } catch {}
  window.localStorage.setItem('kairodex-settings.notifications', JSON.stringify(data))
      setNotifMsg('Saved. Stored on this device.')
      setTimeout(()=>setNotifMsg(''), 1500)
    } catch {
      setNotifMsg('Could not save locally.')
    }
  }

  function saveAppearance(e: React.FormEvent) {
    e.preventDefault()
    try {
      const data = { chatBotColor, chatBgPreset }
  try { window.localStorage.removeItem('agenthub-settings.appearance') } catch {}
  window.localStorage.setItem('kairodex-settings.appearance', JSON.stringify(data))
      applyAppearance(data)
      setAppearanceMsg('Saved. Applied immediately.')
      setTimeout(()=>setAppearanceMsg(''), 1500)
    } catch {
      setAppearanceMsg('Could not save locally.')
    }
  }

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

  const [tab, setTab] = useState<'profile'|'password'|'notifications'|'appearance'>('profile')
  const tabList = [
    { key: 'profile', label: 'Profile' },
    { key: 'password', label: 'Password' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'appearance', label: 'Appearance' }
  ]
  return (
    <main className="min-h-screen p-0 bg-page text-ink">
      <h1 className="px-6 pt-5 pb-2 text-2xl font-semibold">Settings</h1>
      {/* Mobile-optimized tab bar */}
      <nav className="sticky top-0 z-20 bg-surface px-2 pt-1 pb-2 border-b border-default">
        <ul className="flex overflow-x-auto no-scrollbar gap-2 sm:gap-4 md:gap-6 lg:gap-8 max-w-full">
          {tabList.map(t => (
            <li key={t.key} className="flex-1 min-w-[80px]">
              <button
                className={`w-full px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all border
                  ${tab === t.key ? 'bg-accentSoft text-accent border-accent' : 'bg-surface text-ink border-default'}
                `}
                onClick={() => setTab(t.key as any)}
                aria-current={tab === t.key ? 'page' : undefined}
              >
                {t.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 sm:p-6 max-w-xl mx-auto">
        {tab === 'profile' && (
          <section className="mb-6">
            <h2 className="text-sm font-medium text-muted mb-2">Profile</h2>
            <div className="rounded-apple border border-default bg-surface p-3">
              {!user ? (
                <p className="text-sm text-ink/60">Sign in to manage your profile.</p>
              ) : (
                <form onSubmit={saveProfile} className="space-y-3">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                    <label className="w-full sm:w-40 text-sm text-muted">First name</label>
                    <input type="text" className="flex-1 h-10 input-neon px-3 text-sm" value={firstName} onChange={(e)=>setFirstName(e.target.value)} placeholder="First name" />
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                    <label className="w-full sm:w-40 text-sm text-muted">Last name</label>
                    <input type="text" className="flex-1 h-10 input-neon px-3 text-sm" value={lastName} onChange={(e)=>setLastName(e.target.value)} placeholder="Last name" />
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                    <label className="w-full sm:w-40 text-sm text-muted">Display name</label>
                    <input type="text" className="flex-1 h-10 input-neon px-3 text-sm" value={displayName} onChange={(e)=>setDisplayName(e.target.value)} placeholder="Your name" />
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                    <label className="w-full sm:w-40 text-sm text-muted">Email</label>
                    <input type="email" className="flex-1 h-10 input-neon px-3 text-sm opacity-70" value={(user as any)?.email || ''} disabled />
                  </div>
                  {profileMsg && (<div className={profileMsg.type === 'success' ? 'text-green-600 text-sm' : 'text-red-600 text-sm'}>{profileMsg.text}</div>)}
                  <div className="flex justify-end">
                    <button type="submit" className="btn-neon text-sm px-4 py-2">Save profile</button>
                  </div>
                </form>
              )}
            </div>
          </section>
        )}
    {tab === 'password' && (
          <section className="mb-6">
      <h2 className="text-sm font-medium text-ink mb-2">Change password</h2>
            <div className="panel-glass rounded-apple border border-white/10 p-3">
              {!user ? (
                <p className="text-sm text-ink/60">Sign in to manage your password.</p>
              ) : provider && provider !== 'email' ? (
                <p className="text-sm text-ink/60">This account uses {provider}. Manage your password in your identity provider settings.</p>
              ) : (
                <form onSubmit={handleChangePassword} className="space-y-3">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <label className="w-full sm:w-40 text-sm text-ink">Current password</label>
                    <input type="password" className="flex-1 h-10 input-neon px-3 text-sm" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" />
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <label className="w-full sm:w-40 text-sm text-ink">New password</label>
                    <input type="password" className="flex-1 h-10 input-neon px-3 text-sm" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" required minLength={8} />
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <label className="w-full sm:w-40 text-sm text-ink">Confirm new password</label>
                    <input type="password" className="flex-1 h-10 input-neon px-3 text-sm" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat new password" required minLength={8} />
                  </div>
                  {pwMessage && (<div className={pwMessage.type === 'success' ? 'text-green-600 text-sm' : 'text-red-600 text-sm'}>{pwMessage.text}</div>)}
                  <div className="flex justify-end">
                    <button type="submit" className="btn-neon text-sm px-4 py-2 disabled:opacity-50" disabled={pwLoading}>{pwLoading ? 'Updating…' : 'Update password'}</button>
                  </div>
                </form>
              )}
            </div>
          </section>
        )}
        {tab === 'notifications' && (
          <section className="mb-6">
      <h2 className="text-sm font-medium text-ink mb-2">Notifications</h2>
            <form onSubmit={saveNotifications} className="panel-glass rounded-apple border border-white/10 p-3 space-y-3">
              <div className="flex items-center justify-between py-2">
        <span className="text-sm text-ink">Email notifications</span>
                <Toggle checked={notifEmail} onChange={setNotifEmail} />
              </div>
              <div className="flex items-center justify-between py-2">
        <span className="text-sm text-ink">SMS notifications</span>
                <Toggle checked={notifSms} onChange={setNotifSms} />
              </div>
              <div className="flex items-center justify-between py-2">
        <span className="text-sm text-ink">Task reminders</span>
                <Toggle checked={notifTaskReminders} onChange={setNotifTaskReminders} />
              </div>
              {notifMsg && <div className="text-xs text-gray-300">{notifMsg}</div>}
              <div className="flex justify-end">
                <button type="submit" className="btn-neon text-sm px-4 py-2">Save</button>
              </div>
            </form>
          </section>
        )}
  {tab === 'appearance' && (
          <section className="mb-6">
      <h2 className="text-sm font-medium text-ink mb-2">Appearance</h2>
            <form onSubmit={saveAppearance} className="panel-glass rounded-apple border border-white/10 p-3 space-y-3">
        {/* Reduced options: removed Reduce motion and Compact mode */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
        <label className="w-full sm:w-40 text-sm text-ink">Chat background</label>
                <select className="flex-1 h-10 input-neon px-3 text-sm" value={chatBgPreset} onChange={(e)=>setChatBgPreset(e.target.value as any)}>
                  <option value="default">Default</option>
                  <option value="midnight">Midnight</option>
                  <option value="slate">Slate</option>
                </select>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
        <label className="w-full sm:w-40 text-sm text-ink">Bot bubble color</label>
                <input type="color" className="h-10 w-16 rounded-md border border-white/10" value={chatBotColor || '#1E3A8A'} onChange={(e)=>setChatBotColor(e.target.value)} />
                <span className="text-xs text-gray-400">Applies to chat bot message bubbles</span>
              </div>
              {appearanceMsg && <div className="text-xs text-gray-300">{appearanceMsg}</div>}
              <div className="flex justify-end">
                <button type="submit" className="btn-neon text-sm px-4 py-2">Save</button>
              </div>
            </form>
          </section>
        )}
      </div>
    </main>
  )
}
