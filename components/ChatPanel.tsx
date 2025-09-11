"use client"
import { motion, AnimatePresence } from 'framer-motion'
import { useUI } from '@/store/ui'
import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useClient } from '@/hooks/useClient'
import { useClients } from '@/hooks/useClients'
import { ChevronDown, Send, Maximize2, Minimize2, ChevronRight } from 'lucide-react'

export default function ChatPanel() {
  const { chatOpen, setChatOpen, chatPrefill, setChatPrefill } = useUI() as any
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
  // Tone selector removed per spec
  const [messages, setMessages] = useState<Array<{ role: 'user'|'bot'; content: string; intent?: 'next'|'follow'|'status'|'market' }>>([
    { role: 'bot', content: 'Hi! Ask anything about a client or your tasks. I can draft follow-ups, summarize status, and more.' },
  ])
  // Track hashes of notes saved per client to avoid duplicates in-session
  const [savedNoteHashes, setSavedNoteHashes] = useState<Record<string, Set<string>>>({})
  const listRef = useRef<HTMLDivElement>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [fullScreen, setFullScreen] = useState(false)
  const [loading, setLoading] = useState(false)
  const startersRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{active: boolean; startX: number; scrollLeft: number}>({ active: false, startX: 0, scrollLeft: 0 })
  const starters = [
    { key: 'next', label: 'Next steps', prompt: 'What are the next steps for this client?' },
  { key: 'follow', label: 'Follow up', prompt: 'Draft a brief follow-up using the client’s preferred contact method. If no preference, default to email.' },
    { key: 'status', label: 'Status', prompt: 'Summarize the current status for this client.' },
    { key: 'market', label: 'Market snapshot', prompt: 'Give me an up-to-date real estate market snapshot for the client’s city with 3-5 key points and sources.' },
  ] as const

  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 768
  })

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // Prefill when Snapshot opens the composer
  useEffect(() => {
    if (chatOpen && chatPrefill?.text) {
      setText(chatPrefill.text)
      // one-shot
      setChatPrefill(undefined)
    }
  }, [chatOpen, chatPrefill, setChatPrefill])

  // Auto-scroll to bottom on new messages or when chat opens
  useEffect(() => {
    requestAnimationFrame(() => listRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' }))
  }, [messages, chatOpen, loading])

  async function sendMessage() {
    const content = text.trim()
    if (!content) return
    setText('')
    setMessages(m => [...m, { role: 'user', content }])
    try {
  setLoading(true)
  const payload = { clientId: effectiveClientId, message: content }
  const res = await fetch('/ai/chat', {
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
  setLoading(false)
      requestAnimationFrame(() => listRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' }))
    }
  }
  return (
    <AnimatePresence>
  {chatOpen && (
        <motion.div
      id="gh-chat-panel"
          role="dialog"
      aria-label="AI Chat panel"
          aria-modal={isMobile && !fullScreen}
          initial={fullScreen ? { opacity: 0 } : isMobile ? { y: 360, opacity: 0 } : { x: 360, opacity: 0 }}
          animate={fullScreen ? { opacity: 1, transition: { duration: 0.2 } } : isMobile ? { y: 0, opacity: 1, transition: { duration: 0.18, ease: 'easeOut' } } : { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 220, damping: 24 } }}
          exit={fullScreen ? { opacity: 0, transition: { duration: 0.15 } } : isMobile ? { y: 360, opacity: 0, transition: { duration: 0.18 } } : { x: 360, opacity: 0, transition: { duration: 0.2 } }}
          className={
            fullScreen
              ? 'fixed inset-0 z-[70] w-full max-w-none'
              : isMobile
                ? 'fixed z-[60] bottom-0 left-0 right-0 h-[90vh] w-full'
                : 'fixed z-[60] inset-y-0 right-0 left-auto top-0 bottom-0 h-auto w-[380px] lg:w-[420px] xl:w-[460px]'
          }
        >
          {/* Focus trap sentinels for mobile bottom sheet */}
          {isMobile && !fullScreen && (
            <button className="sr-only" onFocus={(e)=>{ const last = (e.currentTarget.parentElement?.querySelector('#chat-focus-end') as HTMLButtonElement|undefined); last?.focus() }} aria-hidden="true" />
          )}
  <div className={`relative h-full overflow-visible ${fullScreen ? 'border-l border-default' : 'border-l border-default'} shadow-2xl flex flex-col`} style={{ background: 'var(--chat-bg)', backgroundColor: 'var(--chat-bg)' as any }}>
            {/* Center collapse handle (desktop only) */}
      {!isMobile && !fullScreen && (
              <button
                type="button"
                aria-label="Collapse chat"
                onClick={() => setChatOpen(false)}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full z-[80] h-8 w-8 grid place-items-center rounded-full bg-white text-ink border border-default shadow ring-1 ring-black/5 hover:bg-surface-2"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
            <div className="px-3 py-3 flex items-center gap-2 border-b border-default bg-surface-2">
              <div className="font-semibold text-ink">Chat</div>
              {/* Tone controls removed per spec */}
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
                  <div className="absolute z-10 mt-1 w-56 max-h-64 overflow-auto rounded-md border border-default bg-surface shadow-lg">
                    <ul role="listbox" className="py-1 text-sm text-ink">
                      {clients.map(c => (
                        <li key={c.id}>
                          <button
                            type="button"
                            className={`w-full text-left px-3 py-2 hover:bg-surface-2 ${c.id === effectiveClientId ? 'bg-surface-2' : ''}`}
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
                        <li className="px-3 py-2 text-muted">No clients</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
              {/* Save note moved inline beneath relevant messages to declutter header */}
              <div className="ml-auto flex items-center gap-2">
                {isMobile && !fullScreen && (
                  <button
                    className="text-ink bg-white border border-default rounded-md px-2 py-1 hover:bg-surface-2 inline-flex items-center gap-1"
                    onClick={() => setChatOpen(false)}
                    aria-label="Minimize chat"
                  >
                    <Minimize2 className="h-4 w-4" />
                    <span className="text-xs">Minimize</span>
                  </button>
                )}
                <button
                  className="text-ink bg-white border border-default rounded-md px-2 py-1 hover:bg-surface-2 inline-flex items-center gap-1"
                  onClick={() => setFullScreen(v => !v)}
                  aria-label={fullScreen ? 'Exit full screen' : 'Enter full screen'}
                >
                  {fullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  <span className="text-xs">{fullScreen ? 'Exit' : 'Expand'}</span>
                </button>
                {/* Minimize removed per spec; collapse via center handle */}
              </div>
            </div>
            <div ref={listRef} className="px-3 flex-1 overflow-auto space-y-2 py-3" style={{ WebkitOverflowScrolling: 'touch' as any }}>
              {messages.map((m, i) => (
                <div key={i} className="flex flex-col items-start gap-1">
                  {m.role === 'bot' ? (
                    <BotBubble>{m.content}</BotBubble>
                  ) : (
                    <UserBubble>{m.content}</UserBubble>
                  )}
                  {m.role === 'bot' && shouldSuggestSave(m.content, m.intent) && activeClient && (
                    <button
                      className="mt-0.5 text-xs text-ink bg-white border border-default rounded-md px-2 py-1 hover:bg-surface-2"
                      onClick={async ()=>{
                        try {
                          const clientId = effectiveClientId as string
                          if(!clientId) return
                          // Normalize & hash to prevent duplicates
                          const cleaned = extractActionable(m.content)
                          const hash = simpleHash(cleaned)
                          setSavedNoteHashes(prev => {
                            const next = { ...prev }
                            if(!next[clientId]) next[clientId] = new Set()
                            return next
                          })
                          const already = savedNoteHashes[clientId]?.has(hash)
                          if(already){
                            setMessages(mm=>[...mm, { role:'bot', content:'(Already saved, skipped duplicate.)' }])
                            return
                          }
                          // Use existing inputted notes submit endpoint
                          const res = await fetch('/api/notes/submit', {
                            method: 'POST',
                            headers: { 'Content-Type':'application/json', 'Accept':'application/json' },
                            body: JSON.stringify({ clientId, text: cleaned })
                          })
                          const ct = res.headers.get('content-type') || ''
                          if (!res.ok) {
                            // If we got back HTML, treat as missing endpoint not a fatal error
                            if (ct.includes('text/html')) {
                              throw new Error('Save endpoint not available (received HTML).')
                            }
                            const errText = await res.text()
                            throw new Error(errText || 'Failed to save')
                          }
                          setSavedNoteHashes(prev => {
                            const next = { ...prev }
                            const set = new Set(next[clientId] || [])
                            set.add(hash)
                            next[clientId] = set
                            return next
                          })
                          // Minimal inline confirmation without clutter
                          setMessages(mm=>[...mm, { role: 'bot', content: '(Note saved)' }])
                        } catch(e:any) {
                          const msg = (e?.message || 'Failed to save').slice(0,200)
                          setMessages(mm=>[...mm, { role: 'bot', content: `Could not save note: ${msg}` }])
                        }
                      }}
                      aria-label="Save this reply as a note"
                    >Save note</button>
                  )}
                </div>
              ))}
              {loading && <BotBubble><TypingDots /></BotBubble>}
            </div>
            <form
              className="p-3 border-t border-default bg-surface"
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
          className="inline-flex items-center h-8 whitespace-nowrap rounded-full bg-white text-ink border border-default px-3 text-sm font-medium hover:bg-surface-2"
                    onClick={() => {
                      setText('')
                      setMessages(m => [...m, { role: 'user', content: s.prompt, intent: s.key }])
                      setLoading(true)
                      fetch('/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: effectiveClientId, message: s.prompt, intent: s.key === 'follow' ? 'followup' : undefined }) })
                        .then(async res => { if (!res.ok) throw new Error(await res.text()); return res.json() })
                        .then(data => setMessages(m => [...m, { role: 'bot', content: data.reply || 'No reply', intent: s.key }]))
                        .catch(e => setMessages(m => [...m, { role: 'bot', content: `Error: ${e.message || 'Failed to reach assistant'}` }]))
                        .finally(() => { setLoading(false); requestAnimationFrame(() => listRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' })) })
                    }}
                    aria-label={`Starter: ${s.label}`}
                  >{s.label}</button>
                ))}
              </div>
              <div className="flex items-center gap-2 sm:gap-2 flex-col sm:flex-row">
                <input
                  value={text}
                  onChange={(e)=>setText(e.target.value)}
                  placeholder="Send a message…"
                  className="w-full sm:flex-1 input-neon px-4 py-3 text-[1.125rem] sm:text-[1.25rem] leading-relaxed sf-text rounded-2xl sm:rounded-5xl"
                  autoFocus={isMobile}
                />
                <button type="submit" className="w-full sm:w-auto inline-flex items-center justify-center rounded-2xl px-4 py-3 bg-primary text-white text-[1.05rem] sm:text-[1.1rem] font-medium shadow hover:opacity-95 min-h-[44px]">
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </form>
          </div>
          {isMobile && !fullScreen && (
            <button id="chat-focus-end" className="sr-only" onFocus={(e)=>{ const first = (e.currentTarget.parentElement?.querySelector('button.sr-only') as HTMLButtonElement|undefined); first?.focus() }} aria-hidden="true" />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function BotBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="bubble-bot max-w-[85%] px-4 py-2.5 text-[1.125rem] leading-relaxed text-white shadow sf-text whitespace-pre-wrap break-anywhere">
      {children}
    </div>
  )
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="bubble-user ml-auto max-w-[85%] px-4 py-2.5 text-[1.125rem] leading-relaxed shadow sf-text whitespace-pre-wrap break-anywhere">
      {children}
    </div>
  )
}

function TypingDots() {
  const Dot = ({ delay }: { delay: string }) => (
    <span
      className="inline-block w-2 h-2 rounded-full bg-white/80 animate-bounce"
      style={{ animationDelay: delay, marginRight: '6px' }}
    />
  )
  return (
    <span className="inline-flex items-center py-1">
      <Dot delay="0ms" />
      <Dot delay="150ms" />
      <Dot delay="300ms" />
    </span>
  )
}

// Heuristic to suggest saving certain assistant replies as notes
function shouldSuggestSave(content: string, intent?: 'next'|'follow'|'status'|'market'): boolean {
  const c = content.toLowerCase()
  // Always allow for specific intents where a note is commonly desired
  if (intent === 'follow' || intent === 'next' || intent === 'status') return true
  // Heuristics for summary or actionable content
  if (c.includes('summary') || c.includes('next steps') || c.startsWith('•') || c.includes('\n- ') || c.includes('\n• ')) return true
  // Avoid offering on obvious errors
  if (c.startsWith('error:') || c.includes('could not')) return false
  return false
}

// Extract actionable portion of assistant reply: prefer bullet list / Next Steps section
function extractActionable(raw: string): string {
  let text = raw.trim()
  // Remove trailing generic disclaimers (simple heuristic)
  text = text.replace(/\n+please ensure[^]+$/i, '').trim()
  // Look for Next Steps section
  const nextIdx = text.toLowerCase().indexOf('next steps')
  if(nextIdx !== -1){
    text = text.slice(nextIdx)
  }
  // Keep only first 30 lines to avoid saving huge blocks
  const lines = text.split(/\n+/).slice(0,30)
  // If we have bullet lines, keep them; else keep entire trimmed
  const bulletLines = lines.filter(l=>/^[-*•]/.test(l.trim()))
  const result = bulletLines.length >= 2 ? bulletLines.join('\n') : lines.join('\n')
  return result.trim().slice(0, 2000)
}

function simpleHash(str: string): string {
  let h = 0, i = 0, len = str.length
  while(i < len){ h = (h * 31 + str.charCodeAt(i++)) | 0 }
  return h.toString(36)
}

// Inline scheduler removed per spec; scheduling lives in Snapshot modal
