"use client"
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { MessageCircle, Users, CheckSquare } from 'lucide-react'
import { useUI } from '@/store/ui'
import Link from 'next/link'
import { createPortal } from 'react-dom'

export default function StickyActionBar() {
  const pathname = usePathname()
  const hideOn = ['/login', '/signup']
  const { setChatOpen, chatOpen } = useUI()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  // prevent body horizontal drift on small screens (defensive)
  useEffect(() => {
    const prev = document.body.style.overflowX
    document.body.style.overflowX = 'hidden'
    return () => { document.body.style.overflowX = prev }
  }, [])
  const hidden = hideOn.some(p => pathname?.startsWith(p))
  if (hidden) return null

  // Viewport-anchored bar; inner content scales to match canvas width via CSS vars.
  const bar = (
    <nav className="fixed left-0 right-0 bottom-0 z-[58]" aria-label="Primary actions">
      <div
        style={{
          transform: 'translateZ(0) scale(var(--canvas-scale, 1))',
          transformOrigin: 'bottom left',
          width: 'var(--canvas-layout-width-px, 100vw)'
        }}
      >
        <div className="px-3 pb-[calc(env(safe-area-inset-bottom,0px)+10px)] pt-2">
          <div className="rounded-2xl border border-slate-200 bg-white/95 backdrop-blur shadow-lg grid grid-cols-3 overflow-hidden">
          {(() => {
            const isHome = pathname === '/'
            const isActions = pathname?.startsWith('/actions')
            const isChat = !!chatOpen
            const base = 'relative flex flex-col items-center justify-center py-3 text-xs transition-colors'
            const iconCls = (active: boolean) => `h-6 w-6 mb-0.5 ${active ? 'text-blue-600' : 'text-slate-600'}`
            const textCls = (active: boolean) => active ? 'text-blue-700 font-medium' : 'text-slate-700'
            const Indicator = ({ active }: { active: boolean }) => (
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full ${active ? 'bg-blue-600' : 'bg-transparent'}`}
              />
            )
            return (
              <>
                <Link href="/" className={`${base} ${textCls(isHome)}`} aria-current={isHome ? 'page' : undefined}>
                  <Indicator active={isHome} />
                  <Users className={iconCls(isHome)} />
                  Home
                </Link>
                <button
                  onClick={() => setChatOpen(true)}
                  className={`${base} ${textCls(isChat)}`}
                  aria-pressed={isChat}
                >
                  <Indicator active={isChat} />
                  <MessageCircle className={iconCls(isChat)} />
                  Chat
                </button>
                <Link href="/actions" className={`${base} ${textCls(!!isActions)}`} aria-current={isActions ? 'page' : undefined}>
                  <Indicator active={!!isActions} />
                  <CheckSquare className={iconCls(!!isActions)} />
                  Actions
                </Link>
              </>
            )
          })()}
          </div>
        </div>
      </div>
    </nav>
  )
  if (!mounted) return null
  return createPortal(bar, document.body)
}
