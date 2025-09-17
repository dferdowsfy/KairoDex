"use client"
export const dynamic = 'force-dynamic'
import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useUI } from '@/store/ui'
import ClientSelector from '@/components/ClientSelector'
import { US_STATES, getStateByCode } from '@/lib/us'
import { getContractsForJurisdiction, type ContractTemplate } from '@/lib/contracts'
import { getContractDisplayName, CONTRACT_CATEGORIES } from '@/lib/contractMappings'
import QuickTaskForm from '@/components/QuickTaskForm'
import ReminderCadence from '@/components/ReminderCadence'
import { useClient } from '@/hooks/useClient'
import { Sparkles, CheckSquare } from 'lucide-react'

type ActionKey = 'followup' | 'task' | 'reminder'

const ALLOWED_STATES = ['MD', 'DC', 'VA'] as const

function StickyActionButtons({ open, setOpen }: { open: ActionKey | null, setOpen: (k: ActionKey)=>void }) {
  const items: { k: ActionKey; label: string; desc: string; icon: JSX.Element; bg: string; border: string; hover: string }[] = [
    { k: 'followup', label: 'Generate Follow‑Up', desc: 'AI email or SMS draft', icon: <Sparkles className="h-7 w-7" />, bg: 'bg-amber-100/60', border: 'border-amber-300/60', hover: 'hover:bg-amber-200/70' },
    { k: 'task', label: 'Create Task', desc: 'Quick todo for client', icon: <CheckSquare className="h-7 w-7" />, bg: 'bg-violet-100/60', border: 'border-violet-300/60', hover: 'hover:bg-violet-200/70' }
  ]
  return (
    <div className="sticky top-[56px] md:top-[70px] z-20">
      <div className="rounded-3xl border border-slate-200 bg-white/85 backdrop-blur px-4 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {items.map(it => {
            const active = open === it.k
            return (
              <button
                key={it.k}
                onClick={() => setOpen(it.k)}
                className={`group relative text-left rounded-3xl border ${it.border} ${it.bg} ${it.hover} transition-all p-6 h-44 flex flex-col justify-between shadow-sm ${active ? 'ring-2 ring-slate-900 bg-white !border-slate-400' : 'hover:shadow-md'}`}
              >
                <div className="flex items-start justify-between">
                  <div className={`w-14 h-14 rounded-2xl grid place-items-center border text-slate-800 bg-white/80 backdrop-blur-sm ${active ? 'border-slate-300 shadow-md' : 'border-white/60 shadow'} transition-colors`}>{it.icon}</div>
                </div>
                <div className="mt-3">
                  <div className="font-semibold text-slate-900 leading-snug text-[25pt] tracking-tight">{it.label}</div>
                  <div className="text-sm sm:text-base text-slate-700 mt-2 font-medium">{it.desc}</div>
                </div>
                <span aria-hidden className="pointer-events-none absolute inset-0 rounded-3xl border border-transparent group-hover:border-slate-400" />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function ActionsPage() {
  const search = useSearchParams()
  const initial = (search?.get('open') as ActionKey | null) || null
  const [open, _setOpen] = useState<ActionKey | null>(initial)
  const setOpen = (k: ActionKey) => _setOpen(k)
  const { selectedClientId, pushToast } = useUI()
  const { data: activeClient } = useClient((selectedClientId || '') as any)

  // (Amend contract flow removed – now lives in /contracts wizard)
  // Follow-up composer state
  const [fuChannel, setFuChannel] = useState<'email'|'sms'>('email')
  const [fuTone, setFuTone] = useState('Professional')
  const [fuInstruction, setFuInstruction] = useState('Draft a brief follow-up based on recent activity.')
  const [fuDraft, setFuDraft] = useState('')
  const [fuLoading, setFuLoading] = useState(false)

  useEffect(() => {
    if (initial && !open) _setOpen(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  return (
  <main className="min-h-screen" style={{ background: 'linear-gradient(180deg,#F7F3EE,#F3EEE7 60%, #EFE8DF)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 space-y-4 has-bottom-nav">
        <section className="space-y-3">
          <h1 className="text-[20pt] leading-tight font-semibold text-slate-900">Actions</h1>
          <div className="text-slate-600">Pick a client, then choose an action</div>
          <ClientSelector />
        </section>

        {/* Sticky quick-action buttons */}
        <StickyActionButtons open={open} setOpen={setOpen} />

        {/* Panels */}
        {open === 'followup' && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 mt-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-slate-900">Generate Follow‑Up</div>
              {activeClient && (
                <div className="text-sm text-slate-500">Client: {(activeClient as any)?.name || (activeClient as any)?.first_name || ''} {(activeClient as any)?.last_name || ''}</div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              <div>
                <div className="text-xs text-slate-500 mb-1">Channel</div>
                <select className="h-10 w-full input-neon px-3 text-sm" value={fuChannel} onChange={e=>setFuChannel(e.target.value as any)}>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                </select>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Tone</div>
                <select className="h-10 w-full input-neon px-3 text-sm" value={fuTone} onChange={e=>setFuTone(e.target.value)}>
                  {['Professional','Friendly','Concise'].map(t=> <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Client</div>
                <div className="h-10 w-full rounded border border-slate-200 bg-slate-50 text-slate-700 px-3 text-sm grid place-items-center">{(activeClient as any)?.name || 'Not selected'}</div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 items-center">
              <button onClick={async ()=>{
                if (!selectedClientId) { pushToast({ type:'info', message: 'Pick a client first.'}); return }
                setFuLoading(true)
                try {
                  const res = await fetch('/api/ai/followup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: selectedClientId, channel: fuChannel, instruction: `Tone: ${fuTone}. ${fuInstruction}` }) })
                  const json = await res.json(); if (!res.ok) throw new Error(json?.error || 'Failed to generate')
                  setFuDraft(json.draft || '')
                } catch (e:any) { pushToast({ type:'error', message: e?.message || 'Generation failed'}) } finally { setFuLoading(false) }
              }} disabled={fuLoading || !selectedClientId} className={`h-10 px-4 rounded text-sm text-white ${fuLoading? 'bg-slate-400':'bg-slate-900 hover:opacity-90'}`}>{fuLoading?'Generating…':'Generate'}</button>
              {fuDraft && (
                <>
                  <button onClick={()=>navigator.clipboard.writeText(fuDraft)} className="h-10 px-3 rounded text-sm bg-white text-slate-900 border border-slate-200">Copy</button>
                  {(fuChannel==='email' && (activeClient as any)?.email) && (
                    <a href={`mailto:${(activeClient as any)?.email}?subject=${encodeURIComponent('Follow-up')}&body=${encodeURIComponent(fuDraft)}`} className="h-10 px-3 rounded text-sm text-white bg-slate-900">Open Email</a>
                  )}
                  {(fuChannel==='sms' && (activeClient as any)?.phone) && (
                    <a href={`sms:${(activeClient as any)?.phone}`} className="h-10 px-3 rounded text-sm text-white bg-slate-900">Open SMS</a>
                  )}
                </>
              )}
            </div>
            <div className="mt-3">
              <div className="text-xs text-slate-500 mb-1">Instruction</div>
              <textarea className="w-full min-h-[120px] input-neon p-3 text-base text-black placeholder-black/70" value={fuInstruction} onChange={e=>setFuInstruction(e.target.value)} placeholder="Add extra context or requests" />
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 mt-4 min-h-[120px]">
              <div className="text-sm font-semibold mb-2">Draft Preview</div>
              {fuDraft ? (<pre className="whitespace-pre-wrap text-slate-900">{fuDraft}</pre>) : (
                <div className="text-slate-500">Your AI-generated draft will appear here.</div>
              )}
            </div>
          </section>
        )}

        {open === 'task' && (
          <section className="mt-3">
            <QuickTaskForm clientId={selectedClientId || undefined} onCreated={() => _setOpen(null)} onCancel={() => _setOpen(null)} />
          </section>
        )}

  {/* Amendment flow removed; redirect handled elsewhere */}
      </div>
    </main>
  )
}