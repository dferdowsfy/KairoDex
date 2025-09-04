"use client"
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ChevronDown, Menu } from 'lucide-react'
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
  // Show the pricing CTA only for non-authenticated users (public/marketing pages)
  // Never show pricing for authenticated users, regardless of the page they're on
  const showPricing = !user
  const isActive = (href: string) => href === '/' ? pathname === '/' : (pathname?.startsWith(href) ?? false)

  // Close the dropdown on route changes
  useEffect(() => { setOpen(false) }, [pathname])
  // no mobile drawer in simplified header

  if (!show) return null
  return (
    <header className="sticky top-0 z-30">
      <div className="w-full border-b border-default" style={{ background: 'var(--surface-2)' }}>
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-3 sm:gap-6 text-ink">
          <Logo className="h-8 w-auto" />
          {/* Simplified header: only client switcher on the right */}
          <div className="relative ml-auto">
            <button
              onClick={()=>setOpen(v=>!v)}
              className="inline-flex items-center gap-2 rounded-full border border-default bg-surface px-4 py-2 text-sm font-semibold text-ink hover:bg-surface-2"
              aria-haspopup="listbox"
              aria-expanded={open}
            >
              {activeClient ? activeClient.name : 'Clients'} <ChevronDown className="h-5 w-5"/>
            </button>
            {open && (
              <div className="absolute right-0 mt-2 w-72 max-h-72 overflow-auto bg-surface border border-default rounded-md shadow-lg p-1 text-ink z-50 visible-scrollbar">
                {clients.length ? (
                  <>
                    {clients.map(c => (
                      <button
                        key={c.id}
                        onClick={() => { setSelectedClientId(c.id); setOpen(false) }}
                        className={`w-full text-left px-3 py-2 text-base rounded hover:bg-surface-2 ${c.id === (activeClientId || selectedClientId) ? 'bg-surface-2' : ''}`}
                        role="option"
                        aria-selected={c.id === (activeClientId || selectedClientId)}
                      >
                        {c.name}
                      </button>
                    ))}
                    <div className="h-px bg-slate-200 my-1"/>
                    <a href="/clients/list" className="block px-3 py-2 text-sm rounded hover:bg-surface-2 text-ink no-underline">View clients list</a>
                    <button onClick={() => { setSelectedClientId(null); setOpen(false) }} className="w-full text-left px-3 py-2 text-sm rounded hover:bg-surface-2 text-muted">Clear selection</button>
                  </>
                ) : (
                  <div className="px-3 py-2 text-sm text-muted">No clients</div>
                )}
              </div>
            )}
          </div>
          {/* Right controls: hamburger -> menu (Settings), and auth */}
          <div className="ml-2 relative">
            <details>
              <summary className="list-none inline-flex items-center justify-center rounded-full border border-default bg-white h-9 w-9 text-ink hover:bg-surface-2 cursor-pointer" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </summary>
              <div className="absolute right-0 mt-2 w-40 bg-surface border border-default rounded-md shadow-lg p-1 text-ink z-50">
                <a href="/settings" className="block px-3 py-2 rounded hover:bg-surface-2 no-underline text-ink">Settings</a>
              </div>
            </details>
          </div>
          {/* Pricing link (visible only on public pages / when not authenticated) */}
          {showPricing && (
            <a href="/kairodex.html" className="ml-2 inline-flex items-center rounded-xl bg-orange-500 text-white px-4 py-2 text-sm font-semibold hover:bg-orange-600 shadow-sm no-underline">
              Pricing
            </a>
          )}

          {user ? (
            <button
              onClick={async()=>{ try{ await supabase.auth.signOut(); window.location.href = '/kairodex.html' } catch{ window.location.href = '/kairodex.html' } }}
              className="ml-2 inline-flex items-center rounded-full border border-default bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-surface-2"
            >
              Logout
            </button>
          ) : (
            <a
              href="/login"
              className="ml-2 inline-flex items-center rounded-full border border-default bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-surface-2 no-underline"
            >
              Login
            </a>
          )}
    </div>
      </div>
      {/* No mobile drawer in simplified header */}
    </header>
  )
}
