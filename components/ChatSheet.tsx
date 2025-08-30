"use client"
import { useEffect, useRef } from 'react'
import { useUI } from '@/store/ui'
import { Minimize2 } from 'lucide-react'
import ChatPanel from './ChatPanel'

// Thin wrapper to reuse ChatPanel while matching bottom sheet semantics on mobile
export default function ChatSheet() {
  const { chatOpen, setChatOpen } = useUI()
  const startRef = useRef<HTMLButtonElement>(null)
  const endRef = useRef<HTMLButtonElement>(null)

  // Simple focus trap when open
  useEffect(() => {
    if (!chatOpen) return
    const first = startRef.current
    first?.focus()
  }, [chatOpen])

  const onTrapStart = () => {
    // move focus to end if shift-tabbing from first
    endRef.current?.focus()
  }
  const onTrapEnd = () => {
    startRef.current?.focus()
  }

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 h-[90vh] z-50 md:hidden transition-transform duration-200 ${chatOpen ? 'translate-y-0' : 'translate-y-full'}`}
      style={{ background: 'var(--chat-bg)' }}
      role="dialog"
      aria-label="Chat"
      aria-modal
    >
      <button ref={startRef} className="sr-only" onFocus={onTrapStart} aria-hidden="true" />
      <div className="h-10 flex items-center justify-end px-3">
        <button onClick={()=>setChatOpen(false)} aria-label="Minimize chat" className="text-white/80 inline-flex items-center gap-1 text-sm">
          <Minimize2 className="h-4 w-4"/>
          Minimize
        </button>
      </div>
      {/* Inline mobile chat UI: use ChatPanel's DOM is heavy; instead, mount it once in desktop. For mobile, we can reuse via ChatPanel with same component but it's already conditionally hidden in ChatMount.
          To avoid recursion/double render, just render ChatPanel here; ChatMount ensures md:hidden for this component. */}
      <div className="h-[calc(90vh-2.5rem)] overflow-hidden">
        {/* Render ChatPanel — it adapts layout */}
        <div className="h-full">
          {/* We rely on the same ChatPanel component for message logic */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <ChatPanel />
        </div>
      </div>
      <button ref={endRef} className="sr-only" onFocus={onTrapEnd} aria-hidden="true" />
    </div>
  )
}
