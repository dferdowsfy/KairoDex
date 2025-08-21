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
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Notifications (stored locally for now)
  const [notifEmail, setNotifEmail] = useState<boolean>(true)
  const [notifSms, setNotifSms] = useState<boolean>(false)
  const [notifTaskReminders, setNotifTaskReminders] = useState<boolean>(true)
  const [notifMsg, setNotifMsg] = useState<string>('')

  // Appearance (stored locally; applied via CSS variables)
  const [reduceMotion, setReduceMotion] = useState<boolean>(false)
  const [compactMode, setCompactMode] = useState<boolean>(false)
  const [chatBotColor, setChatBotColor] = useState<string>('')
  const [chatBgPreset, setChatBgPreset] = useState<'default' | 'midnight' | 'slate'>('default')
  const [appearanceMsg, setAppearanceMsg] = useState<string>('')

  useEffect(() => {
    const dn = (user as any)?.user_metadata?.display_name || (user as any)?.user_metadata?.name || ''
    setDisplayName(dn)
    if (typeof window !== 'undefined') {
      try {
        const rawN = window.localStorage.getItem('agenthub-settings.notifications')
        if (rawN) {
          const n = JSON.parse(rawN)
          setNotifEmail(!!n.email)
          setNotifSms(!!n.sms)
          setNotifTaskReminders(!!n.taskReminders)
        }
        const rawA = window.localStorage.getItem('agenthub-settings.appearance')
        if (rawA) {
          const a = JSON.parse(rawA)
          setReduceMotion(!!a.reduceMotion)
          setCompactMode(!!a.compactMode)
          if (a.chatBotColor) setChatBotColor(a.chatBotColor)
          if (a.chatBgPreset) setChatBgPreset(a.chatBgPreset)
          applyAppearance({
            reduceMotion: !!a.reduceMotion,
            compactMode: !!a.compactMode,
            chatBotColor: a.chatBotColor,
            chatBgPreset: a.chatBgPreset || 'default'
          })
        }
      } catch {}
    }
  }, [user])

  function applyAppearance(opts: { reduceMotion?: boolean; compactMode?: boolean; chatBotColor?: string; chatBgPreset?: 'default'|'midnight'|'slate' }) {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    root.dataset.reduceMotion = opts.reduceMotion ? '1' : ''
    root.dataset.density = opts.compactMode ? 'compact' : ''
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
      const { error } = await (supabase as any).auth.updateUser({ data: { display_name: displayName } })
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
      window.localStorage.setItem('agenthub-settings.notifications', JSON.stringify(data))
      setNotifMsg('Saved. Stored on this device.')
      setTimeout(()=>setNotifMsg(''), 1500)
    } catch {
      setNotifMsg('Could not save locally.')
    }
  }

  function saveAppearance(e: React.FormEvent) {
    e.preventDefault()
    try {
      const data = { reduceMotion, compactMode, chatBotColor, chatBgPreset }
      window.localStorage.setItem('agenthub-settings.appearance', JSON.stringify(data))
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

  const [tab, setTab] = useState<'profile'|'password'|'notifications'|'appearance'|'security'>('profile')
  const tabList = [
    { key: 'profile', label: 'Profile' },
    { key: 'password', label: 'Password' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'appearance', label: 'Appearance' },
    { key: 'security', label: 'Security' }
  ]
  return (
    <main className="min-h-screen p-0" style={{ background: 'var(--page-bg)' }}>
      <h1 className="sf-display h2 px-4 pt-4 pb-2 text-white">Settings</h1>
      {/* Mobile-optimized tab bar */}
      <nav className="sticky top-0 z-20 bg-gradient-to-b from-black/60 to-transparent px-2 pt-1 pb-2">
        <ul className="flex overflow-x-auto no-scrollbar gap-2 sm:gap-4 md:gap-6 lg:gap-8 max-w-full">
          {tabList.map(t => (
            <li key={t.key} className="flex-1 min-w-[80px]">
              <button
                className={`w-full px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all
                  ${tab === t.key ? 'bg-cyan-500/80 text-white shadow' : 'bg-white/10 text-gray-300'}
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
      <div className="p-2 sm:p-4 max-w-xl mx-auto">
        {tab === 'profile' && (
          <section className="mb-6">
            <h2 className="text-sm font-medium text-gray-200 mb-2">Profile</h2>
            <div className="panel-glass rounded-apple border border-white/10 p-3">
              {!user ? (
                <p className="text-sm text-ink/60">Sign in to manage your profile.</p>
              ) : (
                <form onSubmit={saveProfile} className="space-y-3">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                    <label className="w-full sm:w-40 text-sm text-gray-300">Display name</label>
                    <input type="text" className="flex-1 h-10 input-neon px-3 text-sm" value={displayName} onChange={(e)=>setDisplayName(e.target.value)} placeholder="Your name" />
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                    <label className="w-full sm:w-40 text-sm text-gray-300">Email</label>
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
            <h2 className="text-sm font-medium text-gray-200 mb-2">Change password</h2>
            <div className="panel-glass rounded-apple border border-white/10 p-3">
              {!user ? (
                <p className="text-sm text-ink/60">Sign in to manage your password.</p>
              ) : provider && provider !== 'email' ? (
                <p className="text-sm text-ink/60">This account uses {provider}. Manage your password in your identity provider settings.</p>
              ) : (
                <form onSubmit={handleChangePassword} className="space-y-3">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                    <label className="w-full sm:w-40 text-sm text-gray-300">Current password</label>
                    <input type="password" className="flex-1 h-10 input-neon px-3 text-sm" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" />
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                    <label className="w-full sm:w-40 text-sm text-gray-300">New password</label>
                    <input type="password" className="flex-1 h-10 input-neon px-3 text-sm" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" required minLength={8} />
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                    <label className="w-full sm:w-40 text-sm text-gray-300">Confirm new password</label>
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
            <h2 className="text-sm font-medium text-gray-200 mb-2">Notifications</h2>
            <form onSubmit={saveNotifications} className="panel-glass rounded-apple border border-white/10 p-3 space-y-3">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-200">Email notifications</span>
                <Toggle checked={notifEmail} onChange={setNotifEmail} />
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-200">SMS notifications</span>
                <Toggle checked={notifSms} onChange={setNotifSms} />
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-200">Task reminders</span>
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
            <h2 className="text-sm font-medium text-gray-200 mb-2">Appearance</h2>
            <form onSubmit={saveAppearance} className="panel-glass rounded-apple border border-white/10 p-3 space-y-3">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-200">Reduce motion</span>
                <Toggle checked={reduceMotion} onChange={setReduceMotion} />
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-200">Compact mode</span>
                <Toggle checked={compactMode} onChange={setCompactMode} />
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <label className="w-full sm:w-40 text-sm text-gray-300">Chat background</label>
                <select className="flex-1 h-10 input-neon px-3 text-sm" value={chatBgPreset} onChange={(e)=>setChatBgPreset(e.target.value as any)}>
                  <option value="default">Default</option>
                  <option value="midnight">Midnight</option>
                  <option value="slate">Slate</option>
                </select>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <label className="w-full sm:w-40 text-sm text-gray-300">Bot bubble color</label>
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
        {tab === 'security' && (
          <section className="mb-10">
            <h2 className="text-sm font-medium text-gray-200 mb-2">Security</h2>
            <div className="panel-glass rounded-apple border border-white/10 p-3 space-y-3">
              <div className="text-xs text-gray-400">You can log out from the top-right menu. Two-factor auth and device management are coming soon.</div>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
