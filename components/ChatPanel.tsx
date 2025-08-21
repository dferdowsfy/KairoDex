"use client"
import { motion, AnimatePresence } from 'framer-motion'
import { useUI } from '@/store/ui'
import { useState, useMemo, useRef, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useClient } from '@/hooks/useClient'
import { useClients } from '@/hooks/useClients'
import { ChevronDown, Send, Maximize2, Minimize2 } from 'lucide-react'

export default function ChatPanel() {
  const { chatOpen, setChatOpen } = useUI()
  const pathname = usePathname()
  const router = useRouter()
  const { selectedClientId, setSelectedClientId } = useUI()
  const routeClientId = useMemo(() => {
    if (!pathname) return undefined
    const m = pathname.match(/^\/clients\/(.+?)(?:\/|$)/)
    return m?.[1]
  }, [pathname])
  const effectiveClientId = selectedClientId || routeClientId
  const { data: activeClient } = useClient((effectiveClientId as any))
  const { data: clients = [] } = useClients()
  const [text, setText] = useState('')
  const [messages, setMessages] = useState<Array<{ role: 'user'|'bot'; content: string }>>([
    { role: 'bot', content: 'Hi! Ask anything about a client or your tasks. I can draft follow-ups, summarize status, and more.' },
  ])
  const listRef = useRef<HTMLDivElement>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [fullScreen, setFullScreen] = useState(false)
  const startersRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{active: boolean; startX: number; scrollLeft: number}>({ active: false, startX: 0, scrollLeft: 0 })
  const starters = [
    { key: 'next', label: 'Next steps', prompt: 'What are the next steps for this client?' },
    { key: 'follow', label: 'Follow up', prompt: 'Draft a brief, professional follow-up using the client’s preferred contact method. If no preference, default to email.' },
    { key: 'status', label: 'Status', prompt: 'Summarize the current status for this client.' },
  ]

  // Auto-scroll to bottom on new messages or when chat opens
  useEffect(() => {
    requestAnimationFrame(() => listRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' }))
  }, [messages, chatOpen])

  async function sendMessage() {
    const content = text.trim()
    if (!content) return
    setText('')
    setMessages(m => [...m, { role: 'user', content }])
    try {
  const payload = { clientId: effectiveClientId, message: content }
  const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setMessages(m => [...m, { role: 'bot', content: data.reply || 'No reply' }])
    } catch (e: any) {
      setMessages(m => [...m, { role: 'bot', content: `Error: ${e.message || 'Failed to reach assistant'}` }])
    } finally {
      requestAnimationFrame(() => listRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' }))
    }
  }
  return (
    <AnimatePresence>
      {chatOpen && (
        <motion.div
          role="dialog"
          aria-label="AI Chat panel"
          initial={fullScreen ? { opacity: 0 } : { x: 360, opacity: 0 }}
          animate={fullScreen ? { opacity: 1, transition: { duration: 0.2 } } : { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 220, damping: 24 } }}
          exit={fullScreen ? { opacity: 0, transition: { duration: 0.15 } } : { x: 360, opacity: 0, transition: { duration: 0.2 } }}
          className={fullScreen
            ? 'fixed inset-0 z-[70] w-full max-w-none'
            : 'fixed inset-y-0 right-0 z-[65] max-w-sm w-[92%]'}
        >
          <div className={`h-full ${fullScreen ? 'border-l border-black/20' : 'border-l border-black/20'} shadow-2xl flex flex-col`} style={{ background: 'var(--chat-bg)' }}>
            <div className="px-3 py-3 flex items-center gap-2 border-b border-white/10">
              <div className="font-semibold text-white/90">Assistant</div>
              {/* Client selector - visible within chat */}
        <div className="relative">
                <button
                  type="button"
                  onClick={() => setPickerOpen(v=>!v)}
          className="ml-2 inline-flex items-center gap-1 h-8 whitespace-nowrap rounded-full bg-primary text-white border border-primary/80 px-3 text-sm font-medium hover:opacity-95"
                  aria-expanded={pickerOpen}
                  aria-haspopup="listbox"
                >
                  {activeClient ? activeClient.name : (clients.find(c=>c.id===effectiveClientId)?.name || 'Select client')}
          <ChevronDown className="ml-1 h-4 w-4 opacity-70" />
                </button>
                {pickerOpen && (
                  <div className="absolute z-10 mt-1 w-56 max-h-64 overflow-auto rounded-md border border-white/15 bg-[#0F172A] shadow-lg">
                    <ul role="listbox" className="py-1 text-sm text-white/90">
                      {clients.map(c => (
                        <li key={c.id}>
                          <button
                            type="button"
                            className={`w-full text-left px-3 py-2 hover:bg-white/10 ${c.id === effectiveClientId ? 'bg-white/5' : ''}`}
                            onClick={() => {
                              setPickerOpen(false)
                              if (!c.id) return
                              // reflect selection globally, no navigation required
                              setSelectedClientId(c.id)
                            }}
                          >{c.name}</button>
                        </li>
                      ))}
                      {clients.length === 0 && (
                        <li className="px-3 py-2 text-white/60">No clients</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
              {/* Starters moved to above input */}
              {activeClient && (
                <button
                  className="ml-2 text-xs text-white/80 bg-white/10 border border-white/15 rounded-md px-2 py-0.5 hover:bg-white/15"
                  onClick={async ()=>{
                    try {
                      // take most recent user message or current text
                      const lastUser = [...messages].reverse().find(m=>m.role==='user')?.content || text.trim()
                      if (!lastUser) return
                      const res = await fetch('/api/sheets/append-note', { method: 'POST', body: JSON.stringify({ clientId: effectiveClientId, note: lastUser }) })
                      if (!res.ok) throw new Error(await res.text())
                      setMessages(m=>[...m, { role: 'bot', content: 'Saved a note to the Sheet (column Y).' }])
                    } catch(e:any) {
                      setMessages(m=>[...m, { role: 'bot', content: `Could not save note: ${e.message}` }])
                    }
                  }}
                  aria-label="Save last message to Sheet"
                >Save note</button>
              )}
              <div className="ml-auto flex items-center gap-2">
                <button
                  className="text-white/80 bg-white/10 border border-white/15 rounded-md px-2 py-1 hover:bg-white/15 inline-flex items-center gap-1"
                  onClick={() => setFullScreen(v => !v)}
                  aria-label={fullScreen ? 'Exit full screen' : 'Enter full screen'}
                >
                  {fullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  <span className="text-xs">{fullScreen ? 'Exit' : 'Expand'}</span>
                </button>
                <button className="text-white/60" onClick={() => setChatOpen(false)} aria-label="Close chat">Close</button>
              </div>
            </div>
            <div ref={listRef} className="px-3 flex-1 overflow-auto space-y-2 py-3">
              {messages.map((m, i) => m.role === 'bot' ? (
                <BotBubble key={i}>{m.content}</BotBubble>
              ) : (
                <UserBubble key={i}>{m.content}</UserBubble>
              ))}
            </div>
            <form
              className="p-3 border-t border-white/10 bg-black/20 backdrop-blur supports-[backdrop-filter]:bg-black/10"
              onSubmit={(e)=>{ e.preventDefault(); sendMessage() }}
            >
              {/* Starters row above the input; touch + mouse-drag scroll */}
              <div
                ref={startersRef}
                className="mb-2 flex items-center gap-2 overflow-x-auto whitespace-nowrap select-none scrollbar-none"
                style={{ WebkitOverflowScrolling: 'touch' as any, cursor: 'grab' }}
                onMouseDown={(e)=>{
                  const el = startersRef.current; if (!el) return
                  dragRef.current = { active: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft }
                  el.style.cursor = 'grabbing'
                }}
                onMouseLeave={()=>{
                  const el = startersRef.current; if (!el) return
                  dragRef.current.active = false; el.style.cursor = 'grab'
                }}
                onMouseUp={()=>{
                  const el = startersRef.current; if (!el) return
                  dragRef.current.active = false; el.style.cursor = 'grab'
                }}
                onMouseMove={(e)=>{
                  const el = startersRef.current; if (!el) return
                  if (!dragRef.current.active) return
                  e.preventDefault()
                  const x = e.pageX - el.offsetLeft
                  const walk = (x - dragRef.current.startX) * 1 // scroll speed factor
                  el.scrollLeft = dragRef.current.scrollLeft - walk
                }}
              >
        {starters.map(s => (
                  <button
                    type="button"
                    key={s.key}
          className="inline-flex items-center h-8 whitespace-nowrap rounded-full bg-white text-black border border-slate-200 px-3 text-sm font-medium hover:bg-slate-50"
                    onClick={() => {
                      setText('')
                      setMessages(m => [...m, { role: 'user', content: s.prompt }])
                      fetch('/api/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: effectiveClientId, message: s.prompt, intent: s.key === 'follow' ? 'followup' : undefined }) })
                        .then(async res => { if (!res.ok) throw new Error(await res.text()); return res.json() })
                        .then(data => setMessages(m => [...m, { role: 'bot', content: data.reply || 'No reply' }]))
                        .catch(e => setMessages(m => [...m, { role: 'bot', content: `Error: ${e.message || 'Failed to reach assistant'}` }]))
                        .finally(() => requestAnimationFrame(() => listRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' })))
                    }}
                    aria-label={`Starter: ${s.label}`}
                  >{s.label}</button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={text}
                  onChange={(e)=>setText(e.target.value)}
                  placeholder={activeClient ? `Message about ${activeClient.name}…` : (clients.find(c=>c.id===effectiveClientId)?.name ? `Message about ${clients.find(c=>c.id===effectiveClientId)!.name}…` : 'Type a message…')}
                  className="flex-1 input-neon px-4 py-3 text-[1.25rem] leading-relaxed sf-text rounded-5xl"
                />
                <button type="submit" className="inline-flex items-center justify-center rounded-2xl px-4 py-3 bg-primary text-white text-[1.1rem] font-medium shadow hover:opacity-95">
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function BotBubble({ children }: { children: React.ReactNode }) {
  return (
  <div className="bubble-bot max-w-[85%] px-4 py-2.5 text-[1.125rem] leading-relaxed text-white shadow sf-text">
      {children}
    </div>
  )
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="bubble-user ml-auto max-w-[85%] px-4 py-2.5 text-[1.125rem] leading-relaxed shadow sf-text">
      {children}
    </div>
  )
}
