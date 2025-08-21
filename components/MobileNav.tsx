"use client"
import Link from 'next/link'
import { Home, CheckSquare, User, Settings } from 'lucide-react'
import { usePathname } from 'next/navigation'

export default function MobileNav() {
  const pathname = usePathname()
  const base = 'relative flex flex-col items-center justify-center gap-1 py-3 px-3 text-xs transition-colors rounded-xl min-w-[72px] sm:min-w-[88px]'
  const item = (active: boolean) => `${base} ${active ? 'text-primary font-semibold bg-cyan-500/80 shadow' : 'text-ink/80 hover:text-ink bg-white/10'}`
  const icon = 'h-6 w-6 mb-0.5'
  return (
    <nav aria-label="Bottom" className="fixed left-0 right-0 bottom-0 z-50" role="navigation">
      <div className="px-2 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] pt-2">
        <div className="glass glass-liquid rounded-2xl px-2 py-2 flex justify-between gap-2 overflow-x-auto no-scrollbar">
          <Link href="/" className={item(pathname === '/')} aria-current={pathname === '/' ? 'page' : undefined} aria-label="Dashboard">
            <Home className={icon} />
            <span className="text-[11px] sm:text-xs">Dashboard</span>
          </Link>
          <Link href="/tasks" className={item(pathname?.startsWith('/tasks') ?? false)} aria-current={pathname?.startsWith('/tasks') ? 'page' : undefined} aria-label="Tasks">
            <CheckSquare className={icon} />
            <span className="text-[11px] sm:text-xs">Tasks</span>
          </Link>
          <Link href="/settings" className={item(pathname?.startsWith('/settings') ?? false)} aria-current={pathname?.startsWith('/settings') ? 'page' : undefined} aria-label="Settings">
            <Settings className={icon} />
            <span className="text-[11px] sm:text-xs">Settings</span>
          </Link>
          <Link href="/profile" className={item(pathname?.startsWith('/profile') ?? false)} aria-current={pathname?.startsWith('/profile') ? 'page' : undefined} aria-label="Profile">
            <User className={icon} />
            <span className="text-[11px] sm:text-xs">Profile</span>
          </Link>
        </div>
      </div>
    </nav>
  )
}
