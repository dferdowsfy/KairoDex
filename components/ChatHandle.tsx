"use client"
import { useUI } from '@/store/ui'
import { ChevronLeft } from 'lucide-react'

export default function ChatHandle() {
  const { chatOpen, setChatOpen } = useUI()
  if (chatOpen) return null
  return (
    <>
      {/* Desktop edge handle */}
      <button
        type="button"
        aria-label="Expand chat"
        onClick={() => setChatOpen(true)}
        className="hidden md:grid fixed right-2 top-1/2 -translate-y-1/2 z-[80] h-8 w-8 place-items-center rounded-full bg-white text-ink border border-default shadow ring-1 ring-black/5 hover:bg-surface-2"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {/* Mobile floating opener */}
      <button
        type="button"
        aria-label="Open chat"
        onClick={() => setChatOpen(true)}
        className="md:hidden fixed right-4 bottom-4 z-[80] h-12 w-12 grid place-items-center rounded-full bg-slate-900 text-white shadow-lg ring-1 ring-black/10"
      >
        <ChevronLeft className="h-5 w-5 rotate-180" />
      </button>
    </>
  )
}
