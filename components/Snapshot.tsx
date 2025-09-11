"use client"
import React, { useMemo, useState, useCallback } from 'react'
import ScheduleSend from '@/components/email/ScheduleSend'
import { useQueryClient } from '@tanstack/react-query'
import { useUI } from '@/store/ui'
import { useSessionUser } from '@/hooks/useSessionUser'
// Removed legacy email modal utilities (sanitizeEmailBody, cleanPlaceholders) – new ScheduleSend popup handles simple compose
import { useClient } from '@/hooks/useClient'
import { useNoteItems } from '@/hooks/useNoteItems'
import type { NoteItem } from '@/lib/types'
import { useEmailJobs } from '@/hooks/useEmailJobs'
// Removed legacy cadence & modal imports
import { useClients } from '@/hooks/useClients'

function extractBudget(items: NoteItem[]) {
  const budgetItems = items.filter(i=> i.kind==='financing' || /\bbudget\b/i.test(i.title||'') || /\bbudget\b/i.test(i.body||''))
  if (!budgetItems.length) return { label: '—', ids: [] as string[] }
  const text = budgetItems.map(i=> `${i.title||''} ${i.body||''}`).join(' ')
  const nums = Array.from(text.matchAll(/\$?\s*([\d]{2,3})(?:,?([\d]{3}))?\s*(k|K)?/g)).map(m=>{
    let v = parseInt(m[1],10)
    if (m[2]) v = v*1000 + parseInt(m[2],10)
    if (m[3]) v = v*1000
    return v
  })
  const fmt = (n:number)=> n>=1000? `${Math.round(n/1000)}k` : `${n}`
  if (nums.length>=2) return { label: `${fmt(Math.min(...nums))}k–${fmt(Math.max(...nums))}k`.replace(/kk/g,'k'), ids: budgetItems.map(b=>b.id) }
  if (nums.length===1) return { label: `${fmt(nums[0])}k`.replace(/kk/g,'k'), ids: budgetItems.map(b=>b.id) }
  return { label: (budgetItems[0].title||'').replace(/budget[:\s]*/i,'') || '—', ids: budgetItems.map(b=>b.id) }
}

function extractTimeline(items: NoteItem[]) {
  // Prefer explicit deadlines (closing/move/inspection windows)
  const move = items.find(i=> /move|timeline/i.test(i.title||'') || /move|timeline/i.test(i.body||''))
  const closing = items.find(i=> i.kind==='deadline' && /closing/i.test(i.title||''))
  const inspection = items.find(i=> i.kind==='inspection')
  const text = move?.body || move?.title || closing?.title || inspection?.title || ''
  return { text: text || '—', ids: [move?.id, closing?.id, inspection?.id].filter(Boolean) as string[] }
}

// Contact name resolution: prefer client record, else contact note
function extractContactName(client: any, items: NoteItem[]) {
  const name = client?.name || [client?.first_name, client?.last_name].filter(Boolean).join(' ')
  if (name) return { name, id: undefined as string | undefined }
  const c = items.find(i => i.kind === 'contact' && (i as any).party === 'client')
  return { name: (c?.title || c?.body || '—') as string, id: c?.id }
}

function extractNextSteps(items: NoteItem[]) {
  return items
    .filter(i => i.kind === 'next_step')
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
}

function extractMoreDetails(items: NoteItem[]) {
  const more = items.filter(i => ['general_note', 'property'].includes(i.kind))
  const rawLines = more
    .flatMap(m => (m.body || m.title || '').split(/\n+/))
    .map(s => s.trim())
    .filter(Boolean)
  const isPlaceholder = (s: string) => /^(new\s+note|unparsed\s+note|note)$/i.test(s)
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
  const seen = new Set<string>()
  const lines: string[] = []
  for (const s of rawLines) {
    if (isPlaceholder(s)) continue
    const n = norm(s)
    if (seen.has(n)) continue
    seen.add(n)
    lines.push(s)
  }
  const text = lines.join('\n')
  return { text, ids: more.map(m => m.id) }
}

// Helpers for concise display
const shortText = (s: string, max: number = 90) => {
  const t = (s || '').replace(/\s+/g, ' ').trim()
  if (!t) return '—'
  const firstSentence = t.split(/(?<=[.!?])\s+/)[0]
  const base = firstSentence.length <= max ? firstSentence : t
  return base.length > max ? base.slice(0, max - 1).trimEnd() + '…' : base
}

function extractInsightsStrict(items: NoteItem[]) {
  const out: string[] = []
  // 1) Next steps (short)
  const next = items
    .filter(i => i.kind === 'next_step')
    .map(i => (i.title || i.body || '').trim())
    .filter(Boolean)
    .map(s => shortText(s, 80))
  out.push(...next)
  // 2) Property preferences or highlights
  const props = items
    .filter(i => i.kind === 'property' || i.kind === 'general_note')
    .flatMap(i => (i.body || i.title || '').split(/\n+/).map(s => s.trim()).filter(Boolean))
    .filter(s => s.length <= 120 && !/\$|budget/i.test(s))
    .map(s => shortText(s, 80))
  out.push(...props)
  // 3) De-duplicate while preserving order
  const dedup: string[] = []
  for (const s of out) { if (!dedup.some(d => d.toLowerCase() === s.toLowerCase())) dedup.push(s) }
  return dedup.slice(0, 4)
}

export default function Snapshot() {
  const DEBUG = true
  const { selectedClientId, pushToast, followIncludeIds, setFollowIncludeIds, setChatOpen, setChatPrefill } = useUI() as any
  const { data: client } = useClient((selectedClientId || '') as any)
  const { data: items = [], upsert } = useNoteItems(selectedClientId || undefined)
  const { data: emailJobs = [] } = useEmailJobs(selectedClientId || undefined)
  const { data: clients = [] } = useClients()
  const { user } = useSessionUser()
  const qc = useQueryClient()
  const budget = useMemo(()=>extractBudget(items), [items])
  const timeline = useMemo(()=>extractTimeline(items), [items])
  const contact = useMemo(()=>extractContactName(client, items), [client, items])
  const steps = useMemo(()=>extractNextSteps(items), [items])
  const details = useMemo(()=>extractMoreDetails(items), [items])
  const insights = useMemo(() => extractInsightsStrict(items), [items])
  const [showMore, setShowMore] = useState(false)
  const [showAllInsights, setShowAllInsights] = useState(false)
  const [showAllSteps, setShowAllSteps] = useState(false)
  // Add Note modal state
  const [addOpen, setAddOpen] = useState(false)
  const [addText, setAddText] = useState('')
  const [addBusy, setAddBusy] = useState(false)
  // Add Note modal client selection state
  const [addClientId, setAddClientId] = useState<string>(selectedClientId || '')
  // Legacy email scheduling state removed – handled by ScheduleSend popup
  
    // Keep Add Note modal client in sync when opened
    React.useEffect(() => {
      if (addOpen) setAddClientId(selectedClientId || '')
    }, [addOpen, selectedClientId])

  // Compute upcoming reminders for this client (top-of-page display)
  const reminders = useMemo(() => {
    return items
      .filter(i => i.kind === 'deadline' && ((i as any).status === 'scheduled' || (i.tags || []).includes('reminder')))
      .slice()
      .sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime())
  }, [items])

  // Track which reminder is playing completion animation
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set())
  const markReminderDone = async (r: NoteItem) => {
    const id = r.id
    if (!id || completingIds.has(id)) return
    const next = new Set(completingIds); next.add(id); setCompletingIds(next)
    // Play splash animation first, then persist
    setTimeout(async () => {
      try {
        const tags = (r.tags || []).filter(t => t !== 'reminder')
        await upsert.mutateAsync({ ...r, status: 'done' as any, tags })
  pushToast({ type:'success', message:'Reminder completed', subtle: true } as any)
      } catch (e:any) {
        pushToast({ type:'error', message: e?.message || 'Failed to complete reminder' })
        // revert animation state
        setCompletingIds(prev => { const nn = new Set(prev); nn.delete(id); return nn })
      }
    }, 250)
  }

  const addAllToFollowUp = async () => {
    const allIds = Array.from(new Set([...(budget.ids||[]), ...(timeline.ids||[]), ...steps.map(s=>s.id)]))
    const next = Array.from(new Set([...(followIncludeIds||[]), ...allIds]))
    setFollowIncludeIds(next)
    try {
      // tag in background
      for (const id of allIds) {
        const it = items.find(x=>x.id===id)
        if (!it) continue
        const tags = Array.from(new Set([...(it.tags||[]), 'followup']))
        await upsert.mutateAsync({ ...it, tags })
      }
    } catch {}
    pushToast({ type:'success', message: 'Added to Follow‑Up' })
  }

  const handleParseNotes = async () => {
    const targetClientId = addClientId || selectedClientId
    if (!targetClientId) { pushToast({ type:'error', message:'Select a client first' }); return }
    const text = addText.trim()
    if (!text) return
    try {
      setAddBusy(true)
      const res = await fetch('/api/notes/parse', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ clientId: targetClientId, text }) })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Parse failed')
      const parsed: NoteItem[] = json.items || []
      for (const it of parsed) {
        await upsert.mutateAsync({ ...it, id: undefined, client_id: targetClientId } as any)
      }
      setAddText('')
      setAddOpen(false)
  // Refresh any dependent views (e.g., Notes History linked to this client)
  try { await qc.invalidateQueries({ queryKey: ['inputted_notes'] }) } catch {}
      pushToast({ type:'success', message: `Added ${parsed.length} item(s)` })
    } catch (e:any) {
      pushToast({ type:'error', message: e?.message || 'Parse failed' })
    } finally { setAddBusy(false) }
  }

  const addReminder = async (it: NoteItem) => {
    const d = new Date(); d.setDate(d.getDate()+3)
    const title = `Reminder: ${shortText(it.title || it.body || '', 60)}`
    const payload: Partial<NoteItem> = {
  client_id: (it as any)?.client_id || selectedClientId,
      kind: 'deadline',
      title,
      status: 'scheduled',
      date: d.toISOString(),
      tags: Array.from(new Set([...(it.tags||[]), 'reminder'])),
      source: 'user_note'
    } as any
  try { await upsert.mutateAsync(payload); pushToast({ type:'success', message: 'Your reminder has been added.' }) } catch(e:any) { pushToast({ type:'error', message: e?.message || 'Failed' }) }
  }

  // Removed legacy CadenceBlock and modal scheduling UI

  return (
    <section className="relative rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
  {/* Left action rail removed per spec */}
      <div className="flex items-start gap-2">
        <div className="min-w-0">
          <div className="text-slate-900 font-semibold text-xl">Snapshot</div>
          <div className="text-2xl font-semibold text-slate-900 mt-1">{(client as any)?.name || [ (client as any)?.first_name, (client as any)?.last_name ].filter(Boolean).join(' ') || '—'}</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {/* Stage capsule */}
            {(client as any)?.stage && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-violet-200 bg-violet-50 text-violet-900 text-sm">
                <span className="h-2 w-2 rounded-full bg-violet-400" aria-hidden="true" />
                {(client as any)?.stage.replace(/_/g,' ')}
              </span>
            )}
            {/* Budget capsule */}
            {budget.label && budget.label !== '—' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-900 text-sm">
                <span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden="true" />
                Budget {budget.label}
              </span>
            )}
            {/* Move hint removed per spec */}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" className="min-h-[40px] px-4 rounded-xl bg-slate-100 text-slate-900 border border-slate-200 text-sm" onClick={()=>{ if (DEBUG) console.log('Add Note opener clicked'); setAddOpen(true)}}>+ Add Note</button>
          <button
            type="button"
            className="min-h-[40px] px-4 rounded-xl bg-slate-900 text-white text-sm"
              onClick={()=>{ if (DEBUG) console.log('Generate Email opener clicked'); import('@/store/useEmailComposer').then(m=>m.useEmailComposer.getState().set({ open:true }))}}
          >Generate Email</button>
        </div>
      </div>

      {/* Scheduled section: Reminders and Emails */}
      {(reminders.length > 0 || emailJobs.length > 0) && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
          <div className="text-lg font-semibold text-slate-900 mb-2">Scheduled</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {reminders.length > 0 && (
              <div>
                <div className="font-medium text-slate-900 mb-1">Reminders</div>
                <ul className="space-y-2 text-slate-800">
                  {reminders.slice(0,4).map(r => {
                    const id = r.id || r.title+(r.date||'')
                    const completing = r.id ? completingIds.has(r.id) : false
                    return (
                      <li key={id} className={`flex items-center gap-3 transition-all ${completing? 'opacity-0 translate-x-2 scale-95 duration-300' : ''}`}>
                        <button
                          type="button"
                          onClick={()=>markReminderDone(r)}
                          className="relative inline-flex items-center justify-center h-6 w-6 rounded-full border-2 border-emerald-400 bg-white hover:bg-emerald-50 focus:outline-none"
                          aria-label="Mark reminder complete"
                        >
                          {completing && (
                            <span className="absolute inline-flex h-8 w-8 rounded-full bg-emerald-400/40 animate-ping" aria-hidden="true" />
                          )}
                          <span className={`block h-3.5 w-3.5 rounded-full ${completing? 'bg-emerald-500' : 'bg-transparent'}`} aria-hidden="true" />
                        </button>
                        <span className="font-medium truncate">{shortText(r.title || r.body || 'Reminder', 80)}</span>
                        <span className="ml-auto text-sm text-slate-600">{r.date ? new Date(r.date).toLocaleString() : ''}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
            {emailJobs.length > 0 && (
              <div>
                <div className="font-medium text-slate-900 mb-1">Emails</div>
                <ul className="space-y-2 text-slate-800">
                  {(emailJobs as any[]).slice(0,4).map((j:any) => (
                    <li key={j.id || j.send_at} className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">{j.send_at || j.scheduled_at ? new Date(j.send_at || j.scheduled_at).toLocaleString() : '—'}</span>
                      <span className="text-sm text-slate-600 truncate">{j.subject || 'Scheduled email'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Note modal */}
          {addOpen && (
        <div role="dialog" aria-modal className="fixed inset-0 z-[9999] grid items-start justify-center pt-6 sm:pt-10 pointer-events-auto">
          <div className="absolute inset-0 bg-black/30 z-[9998]" onClick={()=>{ if (DEBUG) console.log('Add Note backdrop clicked'); !addBusy && setAddOpen(false)}} />
          <div className="relative z-[10000] w-[min(680px,95vw)] rounded-2xl bg-white border border-slate-200 shadow-xl p-5 pointer-events-auto">
            <div className="text-xl font-semibold text-slate-900 mb-2">Add Notes</div>
            <p className="text-sm text-slate-600 mb-3">Paste client notes. I’ll generate tiles for key dates, next steps, budget, and more.</p>
            <div className="mb-3 flex items-center gap-2">
              <span className="text-sm text-slate-600">Client</span>
              <select
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm text-ink"
                value={addClientId}
                onChange={(e)=>setAddClientId(e.target.value)}
              >
                <option value="" disabled>Select a client…</option>
                {clients.map((c:any) => (
                  <option key={c.id} value={c.id}>{c.name || [c.first_name, c.last_name].filter(Boolean).join(' ')}</option>
                ))}
              </select>
            </div>
            <textarea value={addText} onChange={(e)=>setAddText(e.target.value)} className="w-full min-h-[160px] input-neon p-3 text-base" placeholder="Paste notes here…" />
            <div className="mt-3 flex items-center gap-2 justify-end">
              <button type="button" className="rounded-xl border border-slate-200 px-4 py-2" onClick={()=>setAddOpen(false)} disabled={addBusy}>Cancel</button>
              <button type="button" className="rounded-xl bg-slate-900 text-white px-4 py-2 disabled:opacity-50 inline-flex items-center gap-2" onClick={handleParseNotes} disabled={!addText.trim() || addBusy || !addClientId}>
                {addBusy && <Spinner className="h-4 w-4" />}
                <span>{addBusy? 'Generating…':'Generate'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

  {/* Unified ScheduleSend popup (always mounted, controls visibility via its own store) */}
  <ScheduleSend clientId={selectedClientId || ''} />
  </section>
  )
}

function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" aria-hidden="true" role="img">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}
