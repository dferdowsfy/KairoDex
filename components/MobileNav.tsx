"use client"
import Link from 'next/link'
import { Home, CheckSquare, User } from 'lucide-react'
import { usePathname } from 'next/navigation'

export default function MobileNav() {
  const pathname = usePathname()
  const base = 'relative flex flex-col items-center justify-center gap-1 py-2.5 px-2.5 text-xs transition-colors rounded-lg'
  const item = (active: boolean) => `${base} ${active ? 'text-primary font-semibold bg-white/70 shadow-sm' : 'text-slate-700 hover:text-slate-900'}`
  const icon = 'h-5 w-5'
  return (
    <nav aria-label="Bottom" className="fixed left-0 right-0 bottom-0 z-50" role="navigation">
      <div className="px-3 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] pt-2">
        <div className="glass glass-liquid rounded-2xl px-3 py-2 grid grid-cols-3 gap-1">
          <Link href="/" className={item(pathname === '/')} aria-current={pathname === '/' ? 'page' : undefined} aria-label="Dashboard"><Home className={icon} /><span>Dashboard</span></Link>
          <Link href="/tasks" className={item(pathname?.startsWith('/tasks') ?? false)} aria-current={pathname?.startsWith('/tasks') ? 'page' : undefined} aria-label="Tasks"><CheckSquare className={icon} /><span>Tasks</span></Link>
          <Link href="/profile" className={item(pathname?.startsWith('/profile') ?? false)} aria-current={pathname?.startsWith('/profile') ? 'page' : undefined} aria-label="Profile"><User className={icon} /><span>Profile</span></Link>
        </div>
      </div>
    </nav>
  )
}
