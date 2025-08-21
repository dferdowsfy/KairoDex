"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useClients } from '@/hooks/useClients'
import { useUI } from '@/store/ui'
import { useSessionUser } from '@/hooks/useSessionUser'
import { supabase } from '@/lib/supabaseBrowser'
import Logo from '@/components/Logo'

export function ClientsTopBar() {
  const pathname = usePathname()
  const hideOn = ['/login', '/signup']
  const show = !hideOn.some(prefix => pathname?.startsWith(prefix))
  const [open, setOpen] = useState(false)
  const { data: clients = [] } = useClients()
  const activeClientId = pathname?.match(/^\/clients\/(.+?)(?:\/|$)/)?.[1]
  const { selectedClientId, setSelectedClientId } = useUI()
  const { user } = useSessionUser()
  const activeClient = clients.find(c => c.id === (activeClientId || selectedClientId))
  const isActive = (href: string) => href === '/' ? pathname === '/' : (pathname?.startsWith(href) ?? false)

  // Close the dropdown on route changes
  useEffect(() => { setOpen(false) }, [pathname])

  if (!show) return null
  return (
    <header className="sticky top-0 z-30">
      <div className="w-full border-b border-white/10" style={{ background: 'linear-gradient(180deg,#0B1324,#0E1A33)' }}>
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-6 text-white">
          <Logo className="h-8 w-auto" />
          {/* Evenly-spaced top menu with larger text */}
          <nav className="flex-1 grid grid-flow-col auto-cols-fr gap-2 px-4">
            {[
              { href: '/', label: 'Dashboard' },
              { href: '/tasks', label: 'Tasks' },
              { href: '/settings', label: 'Settings' }
            ].map(item => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`no-underline visited:text-white text-base font-semibold inline-flex items-center justify-center rounded-full px-5 py-2.5 border transition-all duration-300 ${active
                    ? 'border-white/40 text-white bg-[linear-gradient(90deg,#2563EB,#EC4899)] shadow-[0_0_18px_rgba(37,99,235,.35)]'
                    : 'border-white/10 text-white/90 hover:text-white hover:border-white/30 bg-white/10'} `}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
          {/* Clients switcher: always allow changing the selected client */}
          <div className="relative">
            <button
              onClick={()=>setOpen(v=>!v)}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
              aria-haspopup="listbox"
              aria-expanded={open}
            >
              {activeClient ? activeClient.name : 'Clients'} <ChevronDown className="h-5 w-5"/>
            </button>
            {open && (
              <div className="absolute right-0 mt-2 w-64 bg-[#0F172A] border border-white/15 rounded-md shadow-lg p-1 text-white/90 z-50">
                {clients.length ? (
                  <>
                    {clients.map(c => (
                      <button
                        key={c.id}
                        onClick={() => { setSelectedClientId(c.id); setOpen(false) }}
                        className={`w-full text-left px-3 py-2 text-base rounded hover:bg-white/10 ${c.id === (activeClientId || selectedClientId) ? 'bg-white/10' : ''}`}
                        role="option"
                        aria-selected={c.id === (activeClientId || selectedClientId)}
                      >
                        {c.name}
                      </button>
                    ))}
                    <div className="h-px bg-white/10 my-1"/>
                    <button onClick={() => { setSelectedClientId(null); setOpen(false) }} className="w-full text-left px-3 py-2 text-sm rounded hover:bg-white/10 opacity-80">Clear selection</button>
                  </>
                ) : (
                  <div className="px-3 py-2 text-sm opacity-80">No clients</div>
                )}
              </div>
            )}
          </div>
          {/* Auth actions */}
      {user ? (
            <button
              onClick={async()=>{ try{ await supabase.auth.signOut() } catch{} }}
        className="ml-3 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
            >
              Logout
            </button>
          ) : (
            <Link
              href="/login"
        className="ml-3 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 no-underline"
            >
              Login
            </Link>
          )}
    </div>
      </div>
    </header>
  )
}
