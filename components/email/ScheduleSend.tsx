"use client"
import React, { useState, useMemo, useEffect } from 'react'
import { useClient } from '@/hooks/useClient'
import { useEmailComposer, EmailCadence } from '@/store/useEmailComposer'
import { useUI } from '@/store/ui'
import { cn } from '@/lib/utils'

// Lightweight primitives (replace with shadcn/ui if already installed in project)
const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }>=({className, ...rest})=> <button className={cn('inline-flex items-center justify-center rounded-md border text-sm px-3 h-9 bg-white hover:bg-neutral-50 disabled:opacity-50 transition-colors', className)} {...rest} />
const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({className, ...rest}) => <input className={cn('w-full h-9 rounded-md border-2 border-black px-3 text-sm bg-neutral-50 focus:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-black/40', className)} {...rest} />

interface Props {
  trigger?: React.ReactNode
  onSaved?: () => void
  clientId?: string
}

export default function ScheduleSend({ trigger, onSaved, clientId }: Props) {
  const store = useEmailComposer()
  const { pushToast } = useUI()
  // Load client to derive recipient email
  const { data: client } = useClient(clientId || '')
  const [mode, setMode] = useState<'quick'|'custom'>('quick')
  const [busy, setBusy] = useState(false)
  const [genBusy, setGenBusy] = useState(false)
  const [draftSubject, setDraftSubject] = useState(store.subject)
  const [draftBody, setDraftBody] = useState(store.body)
  const [pickedDate, setPickedDate] = useState<Date | null>(store.sendAt)
  const [time, setTime] = useState(() => {
    const d = store.sendAt || new Date(Date.now()+3600_000)
    return d.toISOString().slice(11,16)
  })
  const [tone, setTone] = useState<'professional' | 'casual'>('professional')
  const [senders, setSenders] = useState<Array<any>>([])
  const [selectedSenderId, setSelectedSenderId] = useState<string | null>(null)

  // Compute quick option dates
  const quickOptions = useMemo(()=> {
    const now = new Date()
    const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate()+1)
    const monday = new Date(now)
    const day = monday.getDay()
    const diff = (1 - day + 7) % 7 || 7 // next Monday
    monday.setDate(monday.getDate() + diff)
    function at(d: Date, h: number, m: number){ const c = new Date(d); c.setHours(h,m,0,0); return c }
    return [
      { key: 'tomorrow_am', labelTop: 'Tomorrow morning', labelBottom: formatShort(at(tomorrow,8,0)), date: at(tomorrow,8,0) },
      { key: 'tomorrow_pm', labelTop: 'Tomorrow afternoon', labelBottom: formatShort(at(tomorrow,13,0)), date: at(tomorrow,13,0) },
      { key: 'monday_am', labelTop: 'Monday morning', labelBottom: formatShort(at(monday,8,0)), date: at(monday,8,0) },
      { key: 'pick', labelTop: 'Pick date & time', labelBottom: '', date: null },
    ]
  }, [])

  // Determine which quick option (if any) is currently selected based on store.sendAt
  const selectedQuickKey = useMemo(() => {
    const current = store.sendAt ? store.sendAt.getTime() : null
    if (!current) return null
    return (
      quickOptions.find(q => q.date && Math.abs(q.date.getTime() - current) < 60_000)?.key || null
    )
  }, [quickOptions, store.sendAt])

  function formatShort(d: Date) {
    return d.toLocaleString(undefined, { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' })
  }

  function applyQuick(opt: any){
    if (opt.key === 'pick') { setMode('custom'); return }
    store.set({ sendAt: opt.date })
  }

  // Ensure recipient auto-filled when popup opens and client email available
  useEffect(() => {
    if (store.open && client?.email) {
      if (!store.to.includes(client.email)) {
        store.set({ to: [client.email] })
      }
    }
    // load senders when popup opens
    if (store.open) {
      fetch('/api/senders').then(r=>r.json()).then(j=>{
        if (j?.senders) {
          setSenders(j.senders)
          if (j.senders.length) setSelectedSenderId(j.senders[0].id)
        }
      }).catch(()=>{})
    }
  }, [store.open, client?.email])

  async function handleSave(sendNow?: boolean){
    try {
      setBusy(true)
      const payload = {
        to: store.to.length ? store.to : (client?.email ? [client.email] : []),
        subject: draftSubject,
        bodyMd: draftBody,
        sendAt: store.sendAt ? store.sendAt.toISOString() : pickedDate ? mergeDateTime(pickedDate, time).toISOString() : null,
        cadence: store.cadence,
        clientId: clientId
      }
      if (!payload.to.length) throw new Error('No recipients')
      if (!payload.subject.trim()) throw new Error('Missing subject')
      if (!payload.bodyMd.trim()) throw new Error('Missing body')
      const forceImmediate = !!sendNow
      if (forceImmediate || !payload.sendAt) {
        // Immediate send via Resend
  const sendBody: any = { to: payload.to, subject: payload.subject, bodyMd: payload.bodyMd, cadence: payload.cadence, clientId: payload.clientId }
  if (selectedSenderId) sendBody.senderId = selectedSenderId
  const res = await fetch('/api/email/send', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(sendBody) })
        const jr = await res.json().catch(()=>null)
        if (!res.ok) throw new Error(jr?.error || 'Failed to send')
        pushToast({ type: 'success', message: 'Email sent successfully!' })
      } else {
        // Schedule for later
        const res = await fetch('/api/email/schedule', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
        const jr = await res.json().catch(()=>null)
        if (!res.ok) throw new Error(jr?.error || 'Failed to schedule')
        pushToast({ type: 'success', message: 'Email scheduled successfully!' })
      }
      store.reset()
      onSaved?.()
    } catch(e:any){
      console.error(e)
      pushToast({ type: 'error', message: e?.message || 'Failed to send email' })
    } finally { setBusy(false) }
  }

  function mergeDateTime(d: Date, hhmm: string){
    const [h,m] = hhmm.split(':').map(Number)
    const c = new Date(d); c.setHours(h, m,0,0); return c
  }

  const activeCadence = store.cadence
  const setCadence = (c: EmailCadence) => store.set({ cadence: c })

  async function handleGenerate(){
    if (!clientId) { alert('Select a client first'); return }
    if (genBusy) return
    try {
      setGenBusy(true)
      const instruction = `Generate a concise ${tone} follow-up email for the client. Reference any recent activity, next steps, and budget if known. Use a friendly greeting. Output plain text suitable for markdown.`
      const res = await fetch('/api/ai/followup', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ clientId, channel: 'email', instruction, tone }) })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.error || 'Failed to generate')
      const draft = j.draft || j.content || ''
      // Robust Subject extraction: look for a Subject: line in the first 3 lines
      const lines = draft.split(/\r?\n/)
      let extractedSubject: string | null = null
      let bodyStartIndex = 0
      for (let i = 0; i < Math.min(3, lines.length); i++) {
        const l = lines[i].trim()
        const m = l.match(/^Subject\s*[:\-]\s*(.+)/i)
        if (m) {
          extractedSubject = m[1].trim()
          bodyStartIndex = i + 1
          break
        }
      }
      let bodyText = draft
      if (extractedSubject) {
        bodyText = lines.slice(bodyStartIndex).join('\n').trim()
        setDraftSubject(extractedSubject)
        store.set({ subject: extractedSubject })
      } else {
        // Fallback: derive a concise subject from the first meaningful sentence
  const nonEmpty = lines.findIndex((l: string) => l.trim().length > 0)
        const candidateLine = nonEmpty >= 0 ? lines[nonEmpty].trim() : ''
        // skip greetings like 'Hi John,'
        const isGreeting = /^(hi|hello|dear)\b/i.test(candidateLine)
        let candidate = ''
        if (candidateLine && !isGreeting) candidate = candidateLine
        else {
          // try next non-empty line
          const next = lines.slice(Math.max(0, nonEmpty+1)).find((l: string) => l.trim().length>0) || ''
          candidate = next.trim()
        }
        if (candidate) {
          // take up to first sentence or 80 chars
          const sent = candidate.split(/[\.\!?]\s/)[0]
          const subjectGuess = (sent || candidate).slice(0, 120).trim()
          if (subjectGuess && subjectGuess.length > 6) {
            extractedSubject = subjectGuess
            setDraftSubject(extractedSubject)
            store.set({ subject: extractedSubject })
          }
        }
        bodyText = draft.trim()
      }
      setDraftBody(bodyText)
      store.set({ body: bodyText })
    } catch(e:any){
      console.error(e)
      alert(e.message || 'Generation failed')
    } finally { setGenBusy(false) }
  }

  return (
    <div className="relative inline-block">
      {trigger && (
        <span onClick={()=>store.set({ open: true })}>{trigger}</span>
      )}
      {store.open && (
        <div role="dialog" aria-modal className="fixed inset-0 z-[3000] flex items-start justify-center p-4 sm:pt-16">
          <div className="absolute inset-0 bg-black/40" onClick={()=>store.set({ open:false })} />
          <div className="relative bg-white dark:bg-neutral-900 w-full max-w-[720px] rounded-lg shadow-xl border p-6 space-y-5">
            <div className="text-sm font-semibold">Schedule send</div>
            <div className="space-y-3">
              {/* From selector */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-600">From</label>
                <div className="flex items-center gap-2">
                  <select value={selectedSenderId || ''} onChange={e=>setSelectedSenderId(e.target.value||null)} className="h-9 rounded-md border-2 border-black bg-white px-2 text-sm">
                    {senders.map((s:any) => <option key={s.id} value={s.id}>{s.email}{s.verified ? '' : ' (unverified)'}</option>)}
                    <option value="">Use account</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => { window.location.assign('/api/senders/oauth/google/start') }}
                    className="h-8 px-2 rounded-md border-2 border-black bg-white text-xs text-blue-600 hover:bg-neutral-50"
                  >
                    Connect Gmail
                  </button>
                </div>
              </div>

              {/* Recipient (auto-filled) */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-600">To</label>
                <div className="w-full h-9 rounded-md border-2 border-black bg-neutral-50 px-3 text-sm flex items-center">
                  {store.to[0] || client?.email || 'No client email'}
                </div>
              </div>
              {/* Subject */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-600 flex items-center justify-between">
                  <span>Subject</span>
                  <span className="text-[10px] text-neutral-400">(required)</span>
                </label>
                <Input value={draftSubject} onChange={e=>{ setDraftSubject(e.target.value); store.set({ subject: e.target.value }) }} placeholder="Subject" />
              </div>
              {/* Body with generator */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-neutral-600">Body</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-500">✏️ Editable</span>
                    <select value={tone} onChange={e=> setTone(e.target.value as any)} className="h-8 rounded-md border-2 border-black bg-white px-2 text-xs focus:outline-none">
                      <option value="professional">professional</option>
                      <option value="casual">casual</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={genBusy}
                      className="h-8 text-xs px-3 font-medium rounded-md border-2 text-white hover:bg-blue-600 focus:bg-blue-600 active:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                      style={{ backgroundColor: '#2563EB', borderColor: '#2563EB' }}
                    >
                      {genBusy ? 'Generating…' : 'Generate'}
                    </button>
                  </div>
                </div>
                <textarea className="w-full rounded-md border-2 border-black p-3 text-sm h-64 min-h-[16rem] resize-y bg-neutral-50 focus:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-black/40" value={draftBody} onChange={e=>{ setDraftBody(e.target.value); store.set({ body: e.target.value }) }} placeholder="Edit your generated email content here..." />
              </div>
              {/* Quick grid */}
              <div className="grid grid-cols-2 gap-2">
                {quickOptions.map(q => {
                  const isSelected = selectedQuickKey === q.key
                  return (
                    <button
                      key={q.key}
                      type="button"
                      onClick={()=>applyQuick(q)}
                      className={cn(
                        'rounded-md border p-2 text-left text-xs transition-colors',
                        q.key==='pick' && mode==='custom' && 'border-neutral-900',
                        isSelected ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white hover:bg-neutral-50'
                      )}
                    >
                      <div className={cn('font-medium text-[11px] leading-4', isSelected ? 'text-white' : 'text-neutral-800')}>{q.labelTop}</div>
                      <div className={cn('text-[11px] mt-1 min-h-[16px]', isSelected ? 'text-white/80' : 'text-neutral-500')}>{q.labelBottom}</div>
                    </button>
                  )
                })}
              </div>
              {/* Custom picker */}
              {mode==='custom' && (
                <div className="space-y-2 border-2 border-black rounded-md p-3 bg-neutral-50">
                  <input type="date" className="w-full h-9 border-2 border-black rounded px-2 text-sm bg-neutral-50 focus:bg-neutral-50 focus:outline-none" onChange={e=>{ if (e.target.value){ const d = new Date(e.target.value + 'T00:00:00'); setPickedDate(d); store.set({ sendAt: d }) }} } />
                  <input type="time" value={time} onChange={e=> setTime(e.target.value)} className="w-full h-9 border-2 border-black rounded px-2 text-sm bg-neutral-50 focus:bg-neutral-50 focus:outline-none" />
                </div>
              )}
              {/* Cadence */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-neutral-600">Cadence</div>
                <div className="flex gap-2">
                  {[
                    { v:'none', label:'One-time' },
                    { v:'biweekly', label:'Every 2 weeks' },
                    { v:'monthly', label:'Monthly' },
                  ].map(p => (
                    <button key={p.v} type="button" onClick={()=> setCadence(p.v as EmailCadence)} className={cn('px-3 py-1 rounded-full border text-xs', activeCadence===p.v ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-800 border-neutral-300')}>{p.label}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <Button type="button" onClick={()=>store.reset()} disabled={busy}>Cancel</Button>
              <div className="flex gap-2">
                { (store.sendAt || pickedDate) ? (
                  <Button type="button" onClick={()=>handleSave()} disabled={busy}>Save</Button>
                ) : (
                  <>
                    <Button type="button" onClick={()=>handleSave(true)} disabled={busy}>Send now</Button>
                    <Button type="button" onClick={()=>handleSave()} disabled={busy}>Save draft</Button>
                  </>
                ) }
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
