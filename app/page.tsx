"use client"
export const dynamic = 'force-dynamic'
import React, { useEffect, useState, useRef } from 'react'
import { useClients } from '@/hooks/useClients'
import { useClient } from '@/hooks/useClient'
import { useUI } from '@/store/ui'
import { Sparkles, SquarePen, CheckSquare, MessageCircle } from 'lucide-react'
import ClientSelector from '@/components/ClientSelector'
// Replaced ActionCard tiles with unified large tile styling
import ClientSummaryCard from '@/components/ClientSummaryCard'
import FollowupComposer from '@/components/FollowupComposer'
import AmendContractsPanel, { AmendContractsPanelHandle } from '@/components/AmendContractsPanel'
import RecentClientsList from '@/components/RecentClientsList'
import { useSessionUser } from '@/hooks/useSessionUser'
import QuickTaskForm, { QuickTaskFormHandle } from '@/components/QuickTaskForm'
import ReminderCadence from '@/components/ReminderCadence'
import AddClientModal from '@/components/AddClientModal'
import Snapshot from '@/components/Snapshot'
import NotesHistory from '@/components/NotesHistory'
import Modal from '@/components/Modal'

export default function HomePage() {
  const { data: clients = [] } = useClients()
  const { selectedClientId, pushToast } = useUI()
  const { data: activeClient } = useClient((selectedClientId || '') as any)
  const { user } = useSessionUser()
  const [activeModal, setActiveModal] = useState<null | 'followup' | 'amend' | 'task' | 'reminder'>(null)
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
  async function onAction(type: 'followup'|'amend'|'task'|'reminder', e?: React.MouseEvent) {
    if (!selectedClientId && type !== 'task') {
      pushToast({ type: 'info', message: 'Pick a client first.' })
      return
    }
    resetPanels()
    if (e) setOriginPoint({ x: e.clientX, y: e.clientY })
    if (type === 'followup') setActiveModal('followup')
    else if (type === 'amend') setActiveModal('amend')
    else if (type === 'task') setActiveModal('task')
    else if (type === 'reminder') setShowReminder(true)
  }

  // Refs for forms to trigger save from modal footer
  const taskFormRef = useRef<QuickTaskFormHandle | null>(null)
  const amendRef = useRef<AmendContractsPanelHandle | null>(null)

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
        </section>

        {/* Primary Actions surfaced immediately below greeting for quicker access */}
        <section id="actions" aria-label="Primary actions" className="pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { k:'followup', label:'Generate Follow‑Up', desc: activeClient?`For ${(activeClient as any)?.name}`:'AI email / SMS draft', icon:<Sparkles className='h-7 w-7'/>, bg:'bg-amber-50', border:'border-amber-400', hover:'hover:bg-amber-100' },
              { k:'amend', label:'Amend Contracts', desc:'Draft concise amendment', icon:<SquarePen className='h-7 w-7'/>, bg:'bg-emerald-50', border:'border-emerald-400', hover:'hover:bg-emerald-100' },
              { k:'task', label:'Create Task', desc:'Quick todo for today', icon:<CheckSquare className='h-7 w-7'/>, bg:'bg-violet-50', border:'border-violet-400', hover:'hover:bg-violet-100' },
              { k:'chat', label:'Chat', desc:'Ask or draft anything', icon:<MessageCircle className='h-7 w-7'/>, bg:'bg-indigo-50', border:'border-indigo-400', hover:'hover:bg-indigo-100' }
            ].map(item => (
                <button
                key={item.k}
                onClick={(ev)=> item.k === 'chat' ? setChatOpen(true) : onAction(item.k as any, ev)}
                className={`group relative text-left rounded-3xl border-2 ${item.border} ${item.bg} ${item.hover} transition-colors p-6 flex flex-col gap-4 shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/40 min-h-[12rem]`}
              >
                <div className="flex items-start justify-between">
                  <div className="w-14 h-14 rounded-2xl grid place-items-center border-2 border-white/70 text-slate-800 bg-white/90 backdrop-blur-sm shadow transition-colors">
                    {item.icon}
                  </div>
                </div>
                <div className="flex-1 flex flex-col">
                  <div className="font-semibold text-slate-900 leading-tight tracking-tight break-words text-[clamp(18pt,4.2vw,22pt)] line-clamp-3">{item.label}</div>
                  <div className="mt-2 font-medium text-lg sm:text-xl leading-snug text-slate-700 break-words whitespace-normal line-clamp-3">{item.desc}</div>
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
    <FollowupComposer />
  </Modal>
  <Modal
    isOpen={activeModal==='amend'}
    onClose={()=>setActiveModal(null)}
    title="Amend Contracts"
    originPoint={originPoint}
    footerActions={(
      <>
        <button onClick={()=>setActiveModal(null)} className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium">Cancel</button>
  <button onClick={async ()=>{ await amendRef.current?.apply(); }} className="px-5 py-2 rounded-lg bg-slate-900 text-white font-semibold">Apply</button>
      </>
    )}
  >
    <AmendContractsPanel ref={amendRef} />
  </Modal>
  <Modal
    isOpen={activeModal==='task'}
    onClose={()=>setActiveModal(null)}
    title="Create Task"
    originPoint={originPoint}
    footerActions={(
      <>
        <button onClick={()=>setActiveModal(null)} className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium">Cancel</button>
        <button onClick={()=>{ taskFormRef.current?.save(); }} className="px-5 py-2 rounded-lg bg-slate-900 text-white font-semibold">Save</button>
      </>
    )}
  >
    <QuickTaskForm ref={taskFormRef} clientId={selectedClientId || undefined} onCreated={()=>setActiveModal(null)} onCancel={()=>setActiveModal(null)} hideInternalActions />
  </Modal>
      </div>
    </main>
  )
}

