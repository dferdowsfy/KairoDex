"use client"
export const dynamic = 'force-dynamic'
import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useClients } from '@/hooks/useClients'
import { useClient } from '@/hooks/useClient'
import { useUI } from '@/store/ui'
import { Sparkles, SquarePen, CheckSquare, MessageCircle } from 'lucide-react'
import ClientSelector from '@/components/ClientSelector'
// Replaced ActionCard tiles with unified large tile styling
import ClientSummaryCard from '@/components/ClientSummaryCard'
import FollowupComposer from '@/components/FollowupComposer'
// Removed legacy AmendContractsPanel (flow migrated to /contracts dashboard)
import RecentClientsList from '@/components/RecentClientsList'
import { useSessionUser } from '@/hooks/useSessionUser'
import QuickTaskForm, { QuickTaskFormHandle } from '@/components/QuickTaskForm'
import ReminderCadence from '@/components/ReminderCadence'
import AddClientModal from '@/components/AddClientModal'
import Snapshot from '@/components/Snapshot'
import ClientNotesCallout from '@/components/ClientNotesCallout'
import NotesHistory from '@/components/NotesHistory'
import Modal from '@/components/Modal'

export default function HomePage() {
  const { data: clients = [] } = useClients()
  const { selectedClientId, pushToast } = useUI()
  const { data: activeClient } = useClient((selectedClientId || '') as any)
  const { user } = useSessionUser()
  const [activeModal, setActiveModal] = useState<null | 'followup' | 'task' | 'reminder'>(null)
  const [showReminder, setShowReminder] = useState(false) // existing reminder logic (kept inline for now)
  const [showAdd, setShowAdd] = useState(false)
  const { setChatOpen } = useUI()

  const userName = (() => {
    const meta = (user as any)?.user_metadata || {}
    const first = (meta?.first_name || '').toString().trim()
    if (first) return first
    const email = (user as any)?.email as string | undefined
    if (!email) return 'Agent'
    // Use first token from email (before separators)
    const raw = email.split('@')[0]
    const token = raw.split(/[._-]+/)[0]
    return token.charAt(0).toUpperCase() + token.slice(1)
  })()
  const displayName = (() => {
    if (activeClient) {
      const c:any = activeClient
      return c.name || [c.first_name, c.last_name].filter(Boolean).join(' ') || userName
    }
    return userName
  })()

  const greetingText = (() => {
    if (activeClient) {
      return `Client Snapshot: ${displayName}`
    }
    return `Hi, ${displayName} 👋`
  })()

  // Do not auto-open chat; keep Home visible on initial load
  // If needed, users can open chat via the Action Card or the Chat section button

  function resetPanels() {
    setActiveModal(null); setShowReminder(false)
  }
  const [originPoint, setOriginPoint] = useState<{ x: number; y: number } | null>(null)
  const router = useRouter()

  async function onAction(type: 'followup'|'task'|'reminder', e?: React.MouseEvent) {
    if (!selectedClientId && type === 'followup') {
      pushToast({ type: 'info', message: 'Pick a client first.' })
      return
    }
    resetPanels()
    if (e) setOriginPoint({ x: e.clientX, y: e.clientY })
    if (type === 'followup') setActiveModal('followup')
    else if (type === 'task') setActiveModal('task')
    else if (type === 'reminder') setShowReminder(true)
  }

  // Refs for forms to trigger save from modal footer
  const taskFormRef = useRef<QuickTaskFormHandle | null>(null)
  const [taskSaving, setTaskSaving] = useState(false)
  
  // Contract list state (supabase contract_files)
  interface ContractFile { id:string; contract_name:string; status?:string; version?:number; created_at?:string }
  const [contracts, setContracts] = useState<ContractFile[]>([])
  const [contractsLoading, setContractsLoading] = useState(false)

  useEffect(()=> {
    const load = async () => {
      if (!selectedClientId) { setContracts([]); return }
      setContractsLoading(true)
      try {
        const qs = new URLSearchParams({ clientId: selectedClientId })
        const res = await fetch(`/api/contracts/list?${qs.toString()}`)
        const j = await res.json()
        if (res.ok) {
          setContracts((j.contracts||[]).filter((c:any)=> c.client_id===selectedClientId))
        }
      } finally { setContractsLoading(false) }
    }
    load()
  }, [selectedClientId])

  // Recovery token safeguard: if a recovery verification lands on the root (e.g. because redirect_to was /),
  // immediately forward to /reset-password while preserving hash, query params & email so the dedicated page logic runs.
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // Check URL hash for recovery tokens
    const h = window.location.hash
    const queryParams = new URLSearchParams(window.location.search)
    const hasRecoveryHash = h && /type=recovery/i.test(h)
    const hasRecoveryToken = queryParams.has('token') && queryParams.has('type') && queryParams.get('type')?.toLowerCase() === 'recovery'
    
    // Only redirect if we detect recovery data in the URL
    if (hasRecoveryHash || hasRecoveryToken) {
      try {
        // Build destination with all relevant data
        const query = new URLSearchParams(queryParams)
        
        // Add email from hash if present
        if (h) {
          const hashParams = new URLSearchParams(h.replace(/^#/, ''))
          const emailFromHash = hashParams.get('email')
          if (emailFromHash && !query.has('email')) {
            query.set('email', emailFromHash)
          }
        }
        
        // Add forceBrowser flag for PWA escape
        query.set('forceBrowser', '1')
        
        // Build final destination URL
        const dest = `/reset-password${query.toString() ? `?${query.toString()}` : ''}${h || ''}`
        
        // Avoid loops: only redirect if not already at /reset-password
        if (!/\/reset-password(\?|$)/.test(window.location.pathname)) {
          if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.log('[root-recovery-redirect] forwarding recovery data to', dest)
          }
          window.location.replace(dest)
        }
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.warn('[root-recovery-redirect] failed to parse hash', e)
        }
      }
    }
  }, [])

  return (
  <main className="min-h-screen" style={{ background: 'linear-gradient(180deg,#F7F3EE,#F3EEE7 60%, #EFE8DF)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 space-y-5 has-bottom-nav">
  {/* Sticky header spacer (no interactions) */}
  <div className="sticky top-[56px] md:top-[70px] z-10 bg-transparent pointer-events-none"></div>

        {/* Greeting + selector (client name preferred) */}
        <section className="space-y-3">
          <h1 className="text-[45pt] sm:text-[35pt] leading-tight font-semibold text-slate-900">{greetingText}</h1>
          <div className="text-slate-600">Manage your clients and tasks</div>
          <ClientSelector onAddClient={()=>setShowAdd(true)} />
          {selectedClientId && (
            <ClientNotesCallout
              className="mt-2"
              onAddNote={()=> {
                document.dispatchEvent(new CustomEvent('open-add-note'))
              }}
            />
          )}
        </section>

        {/* Primary Actions surfaced immediately below greeting for quicker access */}
        <section id="actions" aria-label="Primary actions" className="pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { k:'followup', label:'Generate Follow‑Up', desc: activeClient?`For ${(activeClient as any)?.name}`:'AI email / SMS draft', icon:<Sparkles className='h-7 w-7'/>, bg:'bg-amber-50', border:'border-amber-400', hover:'hover:bg-amber-100' },
              { k:'contracts', label:'Contracts', desc:'View & amend contracts', icon:<SquarePen className='h-7 w-7'/>, bg:'bg-emerald-50', border:'border-emerald-400', hover:'hover:bg-emerald-100' },
              { k:'task', label:'Create Task', desc:'Quick todo for today', icon:<CheckSquare className='h-7 w-7'/>, bg:'bg-violet-50', border:'border-violet-400', hover:'hover:bg-violet-100' },
              { k:'chat', label:'Chat', desc:'Ask or draft anything', icon:<MessageCircle className='h-7 w-7'/>, bg:'bg-indigo-50', border:'border-indigo-400', hover:'hover:bg-indigo-100' }
            ].map(item => (
                <button
                key={item.k}
                onClick={(ev)=> {
                  if (item.k === 'chat') { setChatOpen(true); return }
                  if (item.k === 'contracts') { router.push('/contracts'); return }
                  onAction(item.k as any, ev)
                }}
                className={`group relative text-left rounded-3xl border-2 ${item.border} ${item.bg} ${item.hover} transition-colors p-4 sm:p-5 lg:p-6 flex flex-col gap-3 sm:gap-4 shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/40 min-h-[10rem] sm:min-h-[11rem] lg:min-h-[12rem] overflow-hidden`}
              >
                <div className="flex items-start justify-between shrink-0">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl grid place-items-center border-2 border-white/70 text-slate-800 bg-white/90 backdrop-blur-sm shadow transition-colors">
                    {item.icon}
                  </div>
                </div>
                <div className="flex-1 flex flex-col justify-between min-h-0">
                  <div className="font-semibold text-slate-900 leading-tight tracking-tight break-words text-sm sm:text-base md:text-lg lg:text-base xl:text-lg line-clamp-2 overflow-hidden">{item.label}</div>
                  <div className="mt-1 sm:mt-2 font-medium text-xs sm:text-sm md:text-base lg:text-sm xl:text-base leading-snug text-slate-700 break-words whitespace-normal line-clamp-2 overflow-hidden">{item.desc}</div>
                </div>
                <span aria-hidden className="pointer-events-none absolute inset-0 rounded-3xl border border-transparent group-hover:border-slate-400" />
              </button>
            ))}
          </div>
        </section>

        {/* Reminder kept inline (not part of modal refactor scope) */}
        {showReminder && (
          <section className="space-y-5">
            <div className="rounded-2xl border-2 border-slate-300 bg-white p-4">
              <ReminderCadence clientId={selectedClientId || undefined} onDone={()=>setShowReminder(false)} onCancel={()=>setShowReminder(false)} />
            </div>
          </section>
        )}

  {/* Snapshot at top */}
        <section>
          <Snapshot />
        </section>

        {/* Notes history for selected client */}
        <section>
          <NotesHistory clientId={selectedClientId || undefined} />
        </section>

  {/* (Tiles relocated near top) */}

  {/* Client summary */}
        <section>
          <ClientSummaryCard />
        </section>

  {/* Old NoteTiles removed; Snapshot is now the primary top section */}

  {/* (Panels relocated above) */}

  {/* Recent clients removed to simplify UI per spec */}

  {/* Chat card removed (chat accessible via tile & bottom nav) */}
  <AddClientModal open={showAdd} onClose={()=>setShowAdd(false)} onCreated={()=>{ /* list will auto-refetch by hooks when selectedClientId set */ }} />

  {/* Modals */}
  <Modal
    isOpen={activeModal==='followup'}
    onClose={()=>setActiveModal(null)}
    title="Generate Follow‑Up"
    originPoint={originPoint}
    footerActions={(
      <>
        <button onClick={()=>setActiveModal(null)} className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium">Cancel</button>
        <button onClick={()=>setActiveModal(null)} className="px-5 py-2 rounded-lg bg-slate-900 text-white font-semibold">Save</button>
      </>
    )}
  >
    <FollowupComposer 
      onGmailConnected={() => setActiveModal(null)} 
      onSendComplete={() => setActiveModal(null)} 
    />
  </Modal>
  {/* Contracts list preview */}
  <section className="mt-8 space-y-3">
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-semibold text-slate-900">Contracts</h2>
      <button onClick={()=> router.push('/contracts')} className="text-sm text-amber-600 hover:text-amber-700 font-medium">Open Dashboard →</button>
    </div>
    {!selectedClientId && <div className="text-slate-500 text-sm">Select a client to view contracts.</div>}
    {selectedClientId && (
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        {contractsLoading && <div className="text-slate-500 text-sm">Loading…</div>}
        {!contractsLoading && !contracts.length && <div className="text-slate-500 text-sm">No contracts yet.</div>}
        {!contractsLoading && !!contracts.length && (
          <ul className="divide-y divide-slate-100">
            {contracts.slice(0,5).map(c=> (
              <li key={c.id} className="py-2 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">{c.contract_name}</div>
                  <div className="text-[11px] text-slate-500">{c.status || 'original'}{c.version?` • v${c.version}`:''}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={()=> router.push('/contracts')} className="text-xs font-medium text-amber-600 hover:text-amber-700">Amend</button>
                  <button onClick={async ()=>{
                    const r = await fetch('/api/docusign/sender-view', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ contractId: c.id }) })
                    const j = await r.json(); if (r.ok && j.url) window.open(j.url,'_blank','noopener')
                  }} className="text-xs font-medium text-slate-600 hover:text-slate-800">DocuSign</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    )}
  </section>
  <Modal
    isOpen={activeModal==='task'}
    onClose={()=>setActiveModal(null)}
    title="Create Task"
    originPoint={originPoint}
    footerActions={(
      <>
        <button onClick={()=>setActiveModal(null)} className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium">Cancel</button>
        <button
          onClick={async ()=>{ 
            try {
              setTaskSaving(true)
              await taskFormRef.current?.save();
            } catch (error) {
              console.error('Task save error:', error);
            } finally {
              setTaskSaving(false)
            }
          }}
          disabled={taskSaving}
          className="px-5 py-2 rounded-lg bg-slate-900 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >{taskSaving ? 'Saving…' : 'Save'}</button>
      </>
    )}
  >
    <QuickTaskForm ref={taskFormRef} clientId={selectedClientId || undefined} onCreated={()=>setActiveModal(null)} onCancel={()=>setActiveModal(null)} hideInternalActions />
  </Modal>
      </div>
    </main>
  )
}

