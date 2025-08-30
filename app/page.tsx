"use client"
export const dynamic = 'force-dynamic'
import React, { useEffect, useState } from 'react'
import { useClients } from '@/hooks/useClients'
import { useClient } from '@/hooks/useClient'
import { useUI } from '@/store/ui'
import { Sparkles, SquarePen, CheckSquare, MessageCircle } from 'lucide-react'
import ClientSelector from '@/components/ClientSelector'
import ActionCard from '@/components/ActionCard'
import ClientSummaryCard from '@/components/ClientSummaryCard'
import FollowupComposer from '@/components/FollowupComposer'
import AmendContractsPanel from '@/components/AmendContractsPanel'
import RecentClientsList from '@/components/RecentClientsList'
import { useSessionUser } from '@/hooks/useSessionUser'
import QuickTaskForm from '@/components/QuickTaskForm'
import ReminderCadence from '@/components/ReminderCadence'
import AddClientModal from '@/components/AddClientModal'
import Snapshot from '@/components/Snapshot'
import NotesHistory from '@/components/NotesHistory'

export default function HomePage() {
  const { data: clients = [] } = useClients()
  const { selectedClientId, pushToast } = useUI()
  const { data: activeClient } = useClient((selectedClientId || '') as any)
  const { user } = useSessionUser()
  const [showTask, setShowTask] = useState(false)
  const [showFollowup, setShowFollowup] = useState(false)
  const [showAmend, setShowAmend] = useState(false)
  const [showReminder, setShowReminder] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const { setChatOpen } = useUI()

  const agentName = (() => {
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

  // Do not auto-open chat; keep Home visible on initial load
  // If needed, users can open chat via the Action Card or the Chat section button

  async function onAction(type: 'followup'|'amend'|'task'|'reminder') {
    if (!selectedClientId && (type !== 'task')) {
      pushToast({ type: 'info', message: 'Pick a client first.' })
      return
    }
  if (type === 'followup') { setShowFollowup(true); setShowAmend(false); setShowTask(false) }
  else if (type === 'amend') { setShowAmend(true); setShowFollowup(false); setShowTask(false) }
    else if (type === 'task') setShowTask(true)
    else if (type === 'reminder') setShowReminder(true)
  }

  return (
  <main className="min-h-screen" style={{ background: 'linear-gradient(180deg,#F7F3EE,#F3EEE7 60%, #EFE8DF)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 space-y-5 has-bottom-nav">
  {/* Sticky header spacer (no interactions) */}
  <div className="sticky top-[56px] md:top-[70px] z-10 bg-transparent pointer-events-none"></div>

        {/* Greeting + selector */}
        <section className="space-y-3">
          <h1 className="text-[45pt] sm:text-[35pt] leading-tight font-semibold text-slate-900">Hi, {agentName} 👋</h1>
          <div className="text-slate-600">Manage your clients and tasks</div>
          <ClientSelector onAddClient={()=>setShowAdd(true)} />
        </section>

  {/* Snapshot at top */}
        <section>
          <Snapshot />
        </section>

        {/* Notes history for selected client */}
        <section>
          <NotesHistory clientId={selectedClientId || undefined} />
        </section>

        {/* Action Center */}
        <section id="actions" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <ActionCard className="tile tile-followup" title="Generate Follow-Up" description={activeClient?`For ${activeClient?.name}`:undefined} icon={<Sparkles className="h-6 w-6"/>} iconClassName="tint-amber" onClick={()=>onAction('followup')} />
          <ActionCard className="tile tile-amend" title="Amend Contracts" description="Draft concise amendment" icon={<SquarePen className="h-6 w-6"/>} iconClassName="tint-green" onClick={()=>onAction('amend')} />
          <ActionCard className="tile tile-create" title="Create Task" description="Quick todo for today" icon={<CheckSquare className="h-6 w-6"/>} iconClassName="tint-purple" onClick={()=>onAction('task')} />
          <ActionCard className="tile tile-reminder" title="Chat" description="Ask or draft anything" icon={<MessageCircle className="h-6 w-6"/>} iconClassName="tint-blue" onClick={()=>{ (useUI.getState() as any)?.setChatOpen?.(true) }} />
        </section>

  {/* Client summary */}
        <section>
          <ClientSummaryCard />
        </section>

  {/* Old NoteTiles removed; Snapshot is now the primary top section */}

        {/* Inline panels when invoked */}
        {showFollowup && (
          <section>
            <FollowupComposer />
          </section>
        )}
        {showAmend && (
          <section>
            <AmendContractsPanel />
          </section>
        )}
        {showTask && (
          <section>
            <QuickTaskForm clientId={selectedClientId || undefined} onCreated={()=>setShowTask(false)} onCancel={()=>setShowTask(false)} />
          </section>
        )}
        {showReminder && (
          <section>
            <ReminderCadence clientId={selectedClientId || undefined} onDone={()=>setShowReminder(false)} onCancel={()=>setShowReminder(false)} />
          </section>
        )}

  {/* Recent clients removed to simplify UI per spec */}

        {/* Prominent chat entry (desktop will also have panel) */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="shrink-0 w-11 h-11 rounded-xl grid place-items-center bg-sky-50 border border-sky-100 text-sky-600"><MessageCircle className="h-6 w-6"/></div>
            <div className="min-w-0">
              <div className="font-semibold text-slate-900">Chat</div>
              <div className="text-sm text-slate-600">Open the assistant to draft follow-ups, summarize, and plan next steps.</div>
            </div>
            <a href="#" onClick={(e)=>{ e.preventDefault(); (useUI.getState() as any)?.setChatOpen?.(true) }} className="ml-auto inline-flex items-center rounded-xl bg-slate-900 text-white px-4 py-2">Open</a>
          </div>
        </section>
  <AddClientModal open={showAdd} onClose={()=>setShowAdd(false)} onCreated={()=>{ /* list will auto-refetch by hooks when selectedClientId set */ }} />
      </div>
    </main>
  )
}

