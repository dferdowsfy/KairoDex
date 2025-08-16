"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useClients } from '@/hooks/useClients'
import type { Client } from '@/lib/types'

export function ClientsTopBar() {
  const pathname = usePathname()
  const show = !pathname?.startsWith('/login')
  const [open, setOpen] = useState(false)
  const { data: clients = [] } = useClients()
  const activeClientId = pathname?.match(/^\/clients\/(.+?)(?:\/|$)/)?.[1]
  const activeClient = clients.find(c => c.id === activeClientId)

  if (!show) return null
  return (
    <header className="sticky top-0 z-20">
      <div className="w-full" style={{ background: 'linear-gradient(180deg,#0B1324,#0E1A33)' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-6 text-white">
          <Link href="/" className="text-xl font-bold tracking-wide">AgentHub</Link>
          {/* Evenly-spaced top menu with larger text */}
          <nav className="flex-1 grid grid-flow-col auto-cols-fr gap-3 px-4">
            {[
              { href: '/clients', label: 'Clients' },
              { href: '/tasks', label: 'Tasks' },
              { href: '/profile', label: 'Profile' }
            ].map(item => {
              const active = pathname?.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-lg font-medium inline-flex items-center justify-center rounded-full px-6 py-3 border transition-all duration-300 ${active
                    ? 'border-white text-white shadow-[0_0_20px_rgba(255,255,255,0.6)] shadow-white/60'
                    : 'border-white/10 text-white/80 hover:text-white hover:border-white/30'} `}
                  style={active ? { background: 'linear-gradient(180deg,#111214,#0A0B0E)' } : { background: 'linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.06))' }}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <div className="relative">
            <button onClick={()=>setOpen(v=>!v)} className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-4 py-2.5 text-lg font-medium text-white hover:bg-white/15">
              {activeClient ? activeClient.name : 'Clients'} <ChevronDown className="h-5 w-5"/>
            </button>
            {open && (
              <div className="absolute right-0 mt-2 w-64 bg-[#0F172A] border border-white/15 rounded-md shadow-lg p-1 text-white/90">
                {clients.map(c => (
                  <Link key={c.id} href={`/clients/${c.id}`} className="block px-3 py-2 text-base rounded hover:bg-white/10">{c.name}</Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
