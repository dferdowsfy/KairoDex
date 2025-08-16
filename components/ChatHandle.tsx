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
    <button
      aria-label={activeClient ? `Open chat for ${activeClient.name}` : 'Open chat'}
      onClick={() => setChatOpen(!chatOpen)}
      className="fixed right-4 bottom-20 z-50 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white shadow-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
    >
      <span className="relative inline-flex items-center justify-center h-6 w-6 rounded-full bg-white/15">
        <MessageCircle className="h-4 w-4 text-white" />
        {activeClient ? (
          <span className="absolute -right-2 -top-2 h-5 w-5 rounded-full bg-white text-[10px] font-bold text-slate-900 grid place-items-center ring-2 ring-blue-600">
            {activeClient.name?.charAt(0) ?? 'C'}
          </span>
        ) : (
          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-blue-600" aria-hidden />
        )}
      </span>
      <span className="hidden sm:inline">
        {activeClient ? `Chat: ${activeClient.name.split(' ')[0]}` : 'Chat'}
      </span>
    </button>
  )
}
