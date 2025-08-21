"use client"
import { useUI } from '@/store/ui'
import { MessageCircle } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useMemo } from 'react'
import { useClient } from '@/hooks/useClient'

export default function ChatHandle() {
  const { chatOpen, setChatOpen } = useUI()
  const pathname = usePathname()
  const clientId = useMemo(() => {
    if (!pathname) return undefined
    const m = pathname.match(/^\/clients\/(.+?)(?:\/|$)/)
    return m?.[1]
  }, [pathname])
  const { data: activeClient } = useClient(clientId as any)
  return (
    <div className="fixed right-4 bottom-20 z-50 pointer-events-none flex items-center gap-2">
      <button
        aria-label={activeClient ? `Open chat for ${activeClient.name}` : 'Open chat'}
        onClick={() => setChatOpen(!chatOpen)}
        className="relative btn-glass-circle pointer-events-auto"
      >
        <MessageCircle className="h-5 w-5 text-primary" />
        {activeClient ? (
          <span className="absolute -right-2 -top-2 h-5 w-5 rounded-full bg-white text-[10px] font-bold text-ink grid place-items-center ring-2 ring-primary">
            {activeClient.name?.charAt(0) ?? 'C'}
          </span>
        ) : (
          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-accent ring-2 ring-primary" aria-hidden />
        )}
      </button>
      <span className="hidden sm:inline sf-text text-ink pointer-events-none">
        {activeClient ? `Chat: ${activeClient.name.split(' ')[0]}` : 'Chat'}
      </span>
    </div>
  )
}
