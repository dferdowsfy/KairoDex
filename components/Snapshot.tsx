"use client"
import React, { useMemo, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useUI } from '@/store/ui'
import { useSessionUser } from '@/hooks/useSessionUser'
import { sanitizeEmailBody, cleanPlaceholders } from '@/lib/emailSanitizer'
import { useClient } from '@/hooks/useClient'
import { useNoteItems } from '@/hooks/useNoteItems'
import type { NoteItem } from '@/lib/types'
import { useEmailJobs } from '@/hooks/useEmailJobs'
import { useEmailModalIntegration } from '@/hooks/useEmailAutomation'
import CadenceScheduler from '@/components/CadenceScheduler'
import WheelDateTime from '@/components/WheelDateTime'
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
  // Email compose modal state
  const [emailOpen, setEmailOpen] = useState(false)
  const [emailTone, setEmailTone] = useState<'professional'|'friendly'|'casual'>('professional')
  const [emailInstruction, setEmailInstruction] = useState('Draft a brief follow-up based on recent activity.')
  const [emailDraft, setEmailDraft] = useState('')
  const [emailBusy, setEmailBusy] = useState(false)
  const [scheduleAt, setScheduleAt] = useState('')
  // Rolling picker state for scheduling
  const [selectedDate, setSelectedDate] = useState(() => {
    // Default to tomorrow
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const yyyy = tomorrow.getFullYear()
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0')
    const dd = String(tomorrow.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  })
  const [selectedTime, setSelectedTime] = useState('09:00') // Default to 9 AM
  const [scheduleMode, setScheduleMode] = useState<'single'|'cadence'>('single')
  const [cadenceDates, setCadenceDates] = useState<Date[]>([])
  // Calendar navigation for single schedule
  const [calYear, setCalYear] = useState<number>(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState<number>(new Date().getMonth()) // 0-11

  // Memoized callback to prevent infinite re-renders in CadenceScheduler
  const handleCadenceDatesChange = useCallback((dates: Date[]) => {
    setCadenceDates(prevDates => {
      // Compare dates to prevent unnecessary updates
      if (prevDates.length === dates.length && 
          prevDates.every((date, index) => date.getTime() === dates[index]?.getTime())) {
        return prevDates // Return same reference if content is identical
      }
      return dates
    })
  }, [])

  // Email automation integration
  const emailIntegration = useEmailModalIntegration();
  
  // Set up email integration state when modal opens or client changes
  React.useEffect(() => {
    if (emailOpen && selectedClientId) {
      emailIntegration.setSelectedClient(selectedClientId);
      emailIntegration.setEmailContent({
        subject: 'Quick follow-up',
        content: emailDraft,
        tone: emailTone as 'professional'
      });
    }
  }, [emailOpen, selectedClientId, emailDraft, emailTone]);

  // Memoized initial prop for CadenceScheduler to prevent unnecessary resets
  const cadenceInitial = useMemo(() => {
    if (selectedDate && selectedTime) {
      return { startDate: selectedDate, time: selectedTime }
    }
    return undefined
  }, [selectedDate, selectedTime])

  const dateOptions = useMemo(() => {
    const out: { label: string; value: string }[] = []
    const now = new Date()
    for (let i = 0; i < 30; i++) {
      const d = new Date(now)
      d.setDate(now.getDate() + i)
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      const value = `${yyyy}-${mm}-${dd}`
      const label = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
      out.push({ label, value })
    }
    return out
  }, [])

  const timeOptions = useMemo(() => {
    const out: { label: string; value: string }[] = []
    for (let h = 7; h <= 21; h++) {
      for (let m = 0; m < 60; m += 15) {
        const date = new Date()
        date.setHours(h, m, 0, 0)
        const hh = String(h).padStart(2, '0')
        const mm = String(m).padStart(2, '0')
        out.push({ value: `${hh}:${mm}`, label: date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) })
      }
    }
    return out
  }, [])

  React.useEffect(() => {
    if (!emailOpen) return
    const d = new Date()
    d.setMinutes(d.getMinutes() + 120)
    const mins = d.getMinutes()
    const rounded = Math.ceil(mins / 15) * 15
    if (rounded === 60) { d.setHours(d.getHours() + 1); d.setMinutes(0) } else { d.setMinutes(rounded) }
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    setSelectedDate(`${yyyy}-${mm}-${dd}`)
    setSelectedTime(`${hh}:${mi}`)
  // Initialize calendar to selected date's month
  setCalYear(d.getFullYear())
  setCalMonth(d.getMonth())
  }, [emailOpen])

  React.useEffect(() => {
    if (selectedDate && selectedTime) setScheduleAt(`${selectedDate}T${selectedTime}`)
  }, [selectedDate, selectedTime])

  // Debug: log selectedDate changes to help diagnose why calendar clicks don't show visually
  React.useEffect(() => {
    if (DEBUG) console.log('selectedDate changed ->', selectedDate)
  }, [selectedDate])

  // Ensure modals appear at the top of the viewport
  React.useEffect(() => {
    if (addOpen || emailOpen) {
      try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch {}
    }
  }, [addOpen, emailOpen])

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

  function CadenceBlock() {
    return (
      <div className="space-y-3">
        <CadenceScheduler
          key="cadence-scheduler"
          initial={cadenceInitial}
          onChange={handleCadenceDatesChange}
        />
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded-xl bg-emerald-600 text-white px-4 py-2 disabled:opacity-50"
            disabled={!emailDraft.trim() || cadenceDates.length===0 || !selectedClientId || emailBusy || !(client as any)?.email || emailIntegration.isProcessing}
            onClick={async()=>{
              try {
                setEmailBusy(true)
                
                // Use the new email automation system
                const result = await emailIntegration.createAndScheduleEmail(
                  cadenceDates,
                  'weekly' // Default to weekly, could be enhanced to detect from cadence
                );
                
                pushToast({ 
                  type: 'success', 
                  message: `${result.message || 'Created campaign with scheduled emails'}` 
                });
                
                // Also persist reminders/notifications for the scheduled series so they appear in the Home Snapshot
                try {
                  for (const date of cadenceDates) {
                    await upsert.mutateAsync({
                      client_id: selectedClientId,
                      kind: 'deadline',
                      title: `Scheduled: Quick follow-up (email)`,
                      status: 'scheduled',
                      date: date.toISOString(),
                      tags: Array.from(new Set([...(client as any)?.email ? ['scheduled_email'] : [] , 'reminder'])),
                      source: 'user_note'
                    } as any)
                  }
                  pushToast({ type: 'success', message: 'Saved scheduled reminders to dashboard', subtle: true })
                } catch (e:any) {
                  // non-fatal: scheduling succeeded but saving reminders failed
                  pushToast({ type:'error', message: e?.message || 'Campaign created but failed to save reminders' })
                }
                setEmailOpen(false)
              } catch(e:any) { 
                pushToast({ type:'error', message: e?.message || 'Failed to create email campaign' }) 
              }
              finally { setEmailBusy(false) }
            }}
          >Schedule Series</button>
          {!(client as any)?.email && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">No client email on file</div>
          )}
        </div>
      </div>
    )
  }

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
            onClick={()=>{ if (DEBUG) console.log('Generate Email opener clicked'); setEmailOpen(true)}}
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
                <ul className="space-y-1 text-slate-800">
                  {emailJobs.map(j => (
                    <li key={j.id} className="flex items-center gap-3">
                      <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                      <span className="font-medium truncate">{j.subject}</span>
                      <span className="ml-auto text-sm text-slate-600">{new Date(j.send_at).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {/* Key Insights full width */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <div className="text-xl font-semibold text-slate-900">Key Insights</div>
          <ul className="mt-3 space-y-2">
            {insights.slice(0, showAllInsights ? 10 : 3).map((t, idx)=> (
              <li
                key={idx}
                className={`flex items-start gap-3 rounded-xl border p-2 transition-colors text-sm leading-5 shadow-sm ring-1 ring-transparent hover:ring-opacity-60 focus-within:ring-opacity-80 ${idx % 5 === 0 ? 'ring-rose-50' : idx % 5 === 1 ? 'ring-amber-50' : idx % 5 === 2 ? 'ring-emerald-50' : idx % 5 === 3 ? 'ring-sky-50' : 'ring-violet-50'} text-slate-900 
                  ${['bg-rose-50','bg-amber-50','bg-emerald-50','bg-sky-50','bg-violet-50'][idx % 5]} 
                  ${['border-rose-200','border-amber-200','border-emerald-200','border-sky-200','border-violet-200'][idx % 5]}
                `}
              >
                <span
                  className={`mt-1 h-3 w-3 rounded-full flex-shrink-0 
                    ${['bg-rose-400','bg-amber-400','bg-emerald-400','bg-sky-400','bg-violet-400'][idx % 5]}
                  `}
                  aria-hidden="true"
                />
                <span className="text-slate-900 line-clamp-2">{t}</span>
              </li>
            ))}
          </ul>
          {insights.length > 3 && (
            <div className="mt-2">
              <button type="button" className="text-sm text-slate-600" onClick={()=>setShowAllInsights(s=>!s)}>{showAllInsights ? 'Show less' : `Show ${insights.length - 3} more`}</button>
            </div>
          )}
        </div>
      </div>

  <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
        <div className="flex items-center gap-3">
          <div className="text-xl font-semibold text-slate-900">Next Steps</div>
          <button type="button" className="ml-auto h-9 px-4 rounded-xl bg-sky-50 text-slate-900 border border-sky-200" onClick={addAllToFollowUp}>Add to Follow‑Up</button>
        </div>
        <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {steps.length ? steps.slice(0, showAllSteps ? 12 : 6).map((s)=> (
            <li
              key={s.id}
              className="flex items-start gap-3 rounded-xl border p-2 bg-cyan-50 border-cyan-200 min-h-[56px] shadow-sm ring-1 ring-transparent hover:ring-sky-50/40 text-slate-900"
            >
              <span className="mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0 bg-cyan-400" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <div className="text-sm leading-5 text-slate-900 break-words line-clamp-2">{s.title || s.body}</div>
              </div>
              <button type="button" className="ml-2 text-xs rounded-xl px-3 py-1 bg-sky-50 text-slate-900 border border-sky-200 shrink-0" onClick={()=>addReminder(s)}>Add</button>
            </li>
          )) : (
            <li className="text-slate-500">No next steps yet</li>
          )}
        </ul>
        {steps.length > 6 && (
          <div className="mt-2">
            <button type="button" className="text-sm text-slate-600" onClick={()=>setShowAllSteps(s=>!s)}>{showAllSteps ? 'Show less' : `Show ${steps.length - 6} more`}</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr] gap-4">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2">
            <button type="button" className="text-left text-lg font-semibold text-slate-900 flex items-center gap-2" onClick={()=>setShowMore(v=>!v)}>
              {showMore ? '▴' : '▾'} More Details
            </button>
            <button
              type="button"
              className="ml-auto h-9 px-3 rounded-xl bg-sky-50 text-slate-900 border border-sky-200 disabled:opacity-50"
              onClick={async()=>{
                const ids = details.ids || []
                if (!ids.length) return
                const next = Array.from(new Set([...(followIncludeIds||[]), ...ids]))
                setFollowIncludeIds(next)
                try {
                  for (const id of ids) {
                    const it = items.find(x=>x.id===id)
                    if (!it) continue
                    const tags = Array.from(new Set([...(it.tags||[]), 'followup']))
                    await upsert.mutateAsync({ ...it, tags })
                  }
                } catch {}
                pushToast({ type:'success', message: 'Added to Follow‑Up' })
              }}
              disabled={!details.ids?.length}
            >Add to Follow‑Up</button>
          </div>
          {showMore && (
            <ul className="mt-2 text-slate-800 space-y-2">
        {(details.text || '—').split(/\n+/).filter(Boolean).map((line, i)=> (
                <li
                  key={i}
          className="flex items-start gap-3 rounded-xl border p-2 bg-indigo-50 border-indigo-200 shadow-sm ring-1 ring-indigo-50 text-slate-900"
                >
          <span className="mt-1 h-3 w-3 rounded-full flex-shrink-0 bg-indigo-400" aria-hidden="true" />
                  <span className="text-sm leading-5 line-clamp-2">{line}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* Scheduled emails for this client */}
  {/* Scheduled emails moved to the top Scheduled section */}
      </div>

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

      {/* Generate Email modal */}
      {emailOpen && (
        <div role="dialog" aria-modal className="fixed inset-0 z-[9999] grid items-start justify-center pt-6 sm:pt-10 pointer-events-auto">
          <div className="absolute inset-0 bg-black/30 z-[9998]" onClick={()=>{ if (DEBUG) console.log('Email modal backdrop clicked'); !emailBusy && setEmailOpen(false)}} />
            <div className="relative z-[10000] w-[min(900px,95vw)] rounded-2xl bg-white border border-slate-200 shadow-xl p-6 space-y-4 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="text-xl font-semibold text-slate-900">Generate Email</div>
              <div className="ml-auto inline-flex items-center gap-2 text-sm">
                <span className="text-slate-600">Tone</span>
                {(['professional','friendly','casual'] as const).map(t => (
                  <button key={t} type="button" onClick={()=>setEmailTone(t)} className={`px-3 py-1 rounded-full border ${emailTone===t? 'bg-slate-900 text-white border-slate-900':'bg-white text-slate-900 border-slate-200'}`}>{t}</button>
                ))}
              </div>
            </div>
            <textarea value={emailInstruction} onChange={(e)=>setEmailInstruction(e.target.value)} className="w-full min-h-[100px] input-neon p-3 text-base" placeholder="Instruction (e.g., reference timeline, ask for next step)" />
            <div className="flex items-center gap-2">
          <button type="button" className="rounded-xl bg-slate-900 text-white px-4 py-2 disabled:opacity-50 inline-flex items-center gap-2" disabled={emailBusy || !selectedClientId}
                onClick={async()=>{
                  try {
                    setEmailBusy(true)
                    
                    // Get client name for personalization
                    const clientName = client?.name || 'there'
                    const enhancedInstruction = `${emailInstruction}

Context: Write to ${clientName}. Use their name naturally in greeting.

Tone: ${emailTone}`
                    
                    const res = await fetch('/api/ai/followup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: selectedClientId, channel: 'email', instruction: enhancedInstruction }) })
                    const j = await res.json()
                    if (!res.ok) throw new Error(j?.error || 'Failed to generate')
                    let draft = j.draft || ''
                    
                    // Replace placeholder name tokens with user info and clean any bracketed placeholders
                    const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Agent'
                    draft = draft.replace(/\[Your Name\]/gi, displayName)

                    // Remove leading in-body Subject line duplication if model inserted
                    draft = sanitizeEmailBody('Quick follow-up', draft)
                    // Remove other bracketed placeholders if client info missing
                    draft = cleanPlaceholders(draft, client?.name || undefined, displayName)
                    setEmailDraft(draft)
                  } catch(e:any) { pushToast({ type:'error', message: e?.message || 'Failed to generate' }) }
                  finally { setEmailBusy(false) }
                }}
              >
                {emailBusy && <Spinner className="h-4 w-4" />}
                <span>{emailBusy? 'Generating…':'Generate'}</span>
              </button>
            </div>
            <div className="rounded-xl border border-slate-300 bg-slate-50 p-3 min-h-[140px] whitespace-pre-wrap text-slate-900 shadow-sm ring-1 ring-slate-50">{emailDraft || 'Your AI‑generated draft will appear here.'}</div>
            <div className="rounded-xl border border-slate-300 bg-white p-3 space-y-3 shadow-sm ring-1 ring-slate-50">
              <div className="font-medium text-slate-900">Schedule</div>
              <div className="flex gap-2">
                <button type="button" onClick={()=>{ if (DEBUG) console.log('Schedule mode set: single'); setScheduleMode('single')}} aria-pressed={scheduleMode==='single'} className={`px-4 py-2 rounded-lg text-sm border transition-colors ${scheduleMode==='single'?'bg-slate-900 text-white border-slate-900':'bg-white text-slate-900 border-slate-200 hover:border-slate-300'}`}>Single</button>
                <button type="button" onClick={()=>{ if (DEBUG) console.log('Schedule mode set: cadence'); setScheduleMode('cadence')}} aria-pressed={scheduleMode==='cadence'} className={`px-4 py-2 rounded-lg text-sm border transition-colors ${scheduleMode==='cadence'?'bg-slate-900 text-white border-slate-900':'bg-white text-slate-900 border-slate-200 hover:border-slate-300'}`}>Cadence</button>
              </div>

              {scheduleMode==='single' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <div className="text-sm text-slate-600 mb-2">Calendar</div>
                    {/* Visible debug indicator so users can see the selected date even if styles aren't updating */}
                    <div className="text-xs text-slate-500 mb-2">Selected: <span className="font-medium text-slate-900">{selectedDate || '—'}</span></div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      {/* Month navigation */}
                      <div className="flex items-center justify-between mb-2">
                        <button type="button" className="px-2 py-1 rounded border border-slate-200 bg-white text-slate-900 hover:bg-slate-50" onClick={()=>{
                          setCalMonth(m=>{
                            if (m===0) { setCalYear(y=>y-1); return 11 }
                            return m-1
                          })
                        }} aria-label="Previous month">‹</button>
                        <div className="text-sm font-medium text-slate-900">
                          {new Date(calYear, calMonth, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                        </div>
                        <button type="button" className="px-2 py-1 rounded border border-slate-200 bg-white text-slate-900 hover:bg-slate-50" onClick={()=>{
                          setCalMonth(m=>{
                            if (m===11) { setCalYear(y=>y+1); return 0 }
                            return m+1
                          })
                        }} aria-label="Next month">›</button>
                      </div>
                      {/* Weekday header */}
                      <div className="grid grid-cols-7 gap-1 mb-1 text-[11px] text-slate-600">
                        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=> (
                          <div key={d} className="text-center">{d}</div>
                        ))}
                      </div>
                      {/* Calendar grid */}
                      {(() => {
                        const first = new Date(calYear, calMonth, 1)
                        const startDow = first.getDay() // 0-6, Sun-Sat
                        const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
                        const cells: Array<{ day?: number; dateStr?: string }> = []
                        for (let i=0;i<startDow;i++) cells.push({})
                        for (let d=1; d<=daysInMonth; d++) {
                          const yyyy = String(calYear)
                          const mm = String(calMonth+1).padStart(2,'0')
                          const dd = String(d).padStart(2,'0')
                          cells.push({ day: d, dateStr: `${yyyy}-${mm}-${dd}` })
                        }
                        while (cells.length % 7 !== 0) cells.push({})
                        return (
                          <div className="overflow-x-auto">
                            <div className="min-w-[400px]">
                              <div className="grid grid-cols-7 gap-4" key={selectedDate || 'calendar-grid'}>
                                {cells.map((c, idx) => {
                                  // Use robust trimmed string comparison to avoid subtle whitespace/format issues
                                  const selected = !!c.dateStr && String(selectedDate || '').trim() === String(c.dateStr || '').trim()
                                    return (
                                    <button key={idx} type="button" disabled={!c.day}
                                      onClick={()=>{ if (DEBUG) console.log('Calendar day clicked:', c.dateStr); c.dateStr && setSelectedDate(c.dateStr)}}
                                      aria-pressed={selected}
                                      className={`inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full border ${c.day ? (selected? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50') : 'opacity-0 pointer-events-none'}`}
                                    >
                                      {c.day ? <span className="text-sm sm:text-base font-medium">{c.day}</span> : null}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-600 mb-2">Time</div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-6">
                      <WheelDateTime
                        value={selectedDate && selectedTime ? new Date(`${selectedDate}T${selectedTime}`) : undefined}
                        onChange={(d) => {
                          const yyyy = d.getFullYear()
                          const mm = String(d.getMonth() + 1).padStart(2, '0')
                          const dd = String(d.getDate()).padStart(2, '0')
                          const hh = String(d.getHours()).padStart(2, '0')
                          const mi = String(d.getMinutes()).padStart(2, '0')
                          setSelectedDate(`${yyyy}-${mm}-${dd}`)
                          setSelectedTime(`${hh}:${mi}`)
                        }}
                        days={30}
                        minuteStep={15}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 justify-end">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        className="rounded-xl bg-emerald-600 text-white px-4 py-2 disabled:opacity-50"
                        disabled={!emailDraft.trim() || !selectedClientId || emailBusy || !(client as any)?.email}
                        onClick={async() => {
                          try {
                            setEmailBusy(true)
                            const toSingle = (client as any)?.email || ''
                            const res = await fetch('/api/email/send', { 
                              method: 'POST', 
                              headers: { 'Content-Type': 'application/json' }, 
                              body: JSON.stringify({ 
                                to: toSingle, 
                                subject: 'Quick follow-up', 
                                content: cleanPlaceholders(sanitizeEmailBody('Quick follow-up', emailDraft), client?.name || undefined, user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Agent') 
                              }) 
                            })
                            const j = await res.json()
                            if (!res.ok) throw new Error(j?.error || 'Failed to send')
                            pushToast({ type: 'success', message: 'Email sent' })
                            setEmailOpen(false)
                          } catch (e:any) {
                            pushToast({ type: 'error', message: e?.message || 'Failed to send' })
                          } finally { setEmailBusy(false) }
                        }}
                      >Send now</button>

                      <button
                        type="button"
                        className="rounded-xl border border-slate-200 px-4 py-2 disabled:opacity-50"
                        disabled={!emailDraft.trim() || !selectedDate || !selectedTime || !selectedClientId || emailBusy || !(client as any)?.email}
                        onClick={async() => {
                          try {
                            setEmailBusy(true)
                            const recipientEmail = (client as any)?.email || ''
                            
                            // Create a campaign first
                            const campaignRes = await fetch('/api/email/campaigns', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                client_id: selectedClientId,
                                title: 'Scheduled Follow-up',
                                content: cleanPlaceholders(sanitizeEmailBody('Quick follow-up', emailDraft), client?.name || undefined, user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Agent'),
                                tone: 'professional',
                                ai_generated: true
                              })
                            })
                            
                            if (!campaignRes.ok) {
                              const campaignError = await campaignRes.json()
                              throw new Error(campaignError?.error || 'Failed to create campaign')
                            }
                            
                            const campaignResult = await campaignRes.json()
                            
                            // Schedule the email
                            const scheduleAtDateTime = `${selectedDate}T${selectedTime}`
                            const scheduleRes = await fetch('/api/email/schedules', { 
                              method: 'POST', 
                              headers: { 'Content-Type': 'application/json' }, 
                              body: JSON.stringify({ 
                                campaign_id: campaignResult.campaign.id,
                                client_id: selectedClientId,
                                scheduled_at: new Date(scheduleAtDateTime).toISOString(),
                                cadence_type: 'single',
                                subject: 'Quick follow-up',
                                content: cleanPlaceholders(sanitizeEmailBody('Quick follow-up', emailDraft), client?.name || undefined, user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Agent'),
                                recipient_email: recipientEmail
                              }) 
                            })
                            
                            const scheduleResult = await scheduleRes.json()
                            if (!scheduleRes.ok) throw new Error(scheduleResult?.error || 'Failed to schedule')
                            
                            pushToast({ type:'success', message: 'Email scheduled successfully' })
                            
                            // Persist a lightweight reminder so it appears in Snapshot scheduled list
                            try {
                              await upsert.mutateAsync({
                                client_id: selectedClientId,
                                kind: 'deadline',
                                title: `Scheduled: Quick follow-up (email)`,
                                status: 'scheduled',
                                date: new Date(scheduleAtDateTime).toISOString(),
                                tags: Array.from(new Set([...(client as any)?.email ? ['scheduled_email'] : [] , 'reminder'])),
                                source: 'user_note'
                              } as any)
                              pushToast({ type: 'success', message: 'Saved scheduled reminder to dashboard', subtle: true })
                            } catch (err:any) {
                              pushToast({ type:'error', message: err?.message || 'Scheduled but failed to save reminder' })
                            }
                            setEmailOpen(false)
                          } catch(e:any) { pushToast({ type:'error', message: e?.message || 'Failed to schedule' }) }
                          finally { setEmailBusy(false) }
                        }}
                      >Send later</button>
                    </div>
                    {!(client as any)?.email && (
                      <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">No client email on file</div>
                    )}
                  </div>
                </div>
              ) : (
                <CadenceBlock />
              )}
            </div>
            <div className="flex items-center justify-end gap-2">
              <button type="button" className="rounded-xl border border-slate-200 px-4 py-2" onClick={()=>setEmailOpen(false)} disabled={emailBusy}>Close</button>
            </div>
          </div>
        </div>
      )}
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
