"use client"
import React, { useMemo, useState } from 'react'
import { sanitizeEmailBody, cleanPlaceholders } from '@/lib/emailSanitizer'
import { useUI } from '@/store/ui'
import { useClient } from '@/hooks/useClient'
import { useNoteItems } from '@/hooks/useNoteItems'
import type { NoteItem } from '@/lib/types'
import { useSessionUser } from '@/hooks/useSessionUser'

export default function FollowupComposer() {
  const { selectedClientId, pushToast } = useUI()
  const { data: activeClient } = useClient((selectedClientId || '') as any)
  const { user } = useSessionUser()
  const { data: noteItems = [], upsert } = useNoteItems(selectedClientId || undefined)
  const [fuChannel, setFuChannel] = useState<'email'|'sms'>('email')
  const [fuTone, setFuTone] = useState('Professional')
  const [fuInstruction, setFuInstruction] = useState('Draft a brief follow-up based on recent activity.')
  const [fuDraft, setFuDraft] = useState('')
  const [fuLoading, setFuLoading] = useState(false)
  const { followIncludeIds, setFollowIncludeIds, toggleFollowIncludeId } = useUI() as any
  const initialTagged = useMemo(()=> (noteItems||[]).filter(i=> (i.tags||[]).includes('followup')).map(i=>i.id), [noteItems])
  const [includeIds, setIncludeIds] = useState<string[]>(followIncludeIds?.length? followIncludeIds : initialTagged)
  const [schedule, setSchedule] = useState<'now'|'later'|'tomorrow'|'custom'|'sequence'>('now')
  const [customWhen, setCustomWhen] = useState<string>('')

  const structured = useMemo(()=>{
    const deadlines = noteItems.filter(i=> ['deadline','inspection','appraisal','emd'].includes(i.kind)).filter(i=>i.date).sort((a,b)=> (a.date||'').localeCompare(b.date||''))
    const nextSteps = noteItems.filter(i=> i.kind==='next_step').sort((a,b)=> (a.status||'todo').localeCompare(b.status||'todo'))
    const contacts: Record<string, NoteItem[]> = {}
    for (const i of noteItems.filter(i=> i.kind==='contact')) {
      const key = i.party || 'other'
      contacts[key] = contacts[key] || []
      contacts[key].push(i)
    }
    const milestones = {
      ratified: deadlines.find(d=>/ratified/i.test(d.title))?.date,
      inspection: deadlines.find(d=>/inspection/i.test(d.title))?.date,
      appraisal: deadlines.find(d=>/appraisal/i.test(d.title))?.date,
      emd: deadlines.find(d=>/emd/i.test(d.title))?.date,
      closing: deadlines.find(d=>/closing/i.test(d.title))?.date,
    }
    return { deadlines, nextSteps, contacts, milestones }
  }, [noteItems])

  const toggleInclude = (id: string) => setIncludeIds((prev)=> prev.includes(id)? prev.filter(x=>x!==id): [...prev, id])

  return (
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
            const context = {
              deadlines: structured.deadlines.filter(d=> includeIds.length? includeIds.includes(d.id): true),
              next_steps: structured.nextSteps.filter(n=> includeIds.length? includeIds.includes(n.id): true),
              contacts: structured.contacts,
              milestones: structured.milestones,
            }
            const res = await fetch('/api/ai/followup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: selectedClientId, channel: fuChannel, instruction: `Tone: ${fuTone}. Use this context:\n${JSON.stringify(context)}\n${fuInstruction}` }) })
            const json = await res.json(); if (!res.ok) throw new Error(json?.error || 'Failed to generate')
            let draft = json.draft || ''
            const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Agent'
            draft = draft.replace(/\[Your Name\]/gi, displayName)
            draft = sanitizeEmailBody('Follow-up', draft)
            draft = cleanPlaceholders(draft, activeClient?.name || undefined, displayName)
            setFuDraft(draft)
          } catch (e:any) { 
            pushToast({ type:'error', message: e?.message || 'Generation failed'}) 
          } finally { 
            setFuLoading(false) 
          }
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
      {/* Include/exclude list */}
  {noteItems.length>0 && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="text-sm font-semibold mb-2">Include items</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {noteItems.map(it => (
              <label key={it.id} className="flex items-center gap-2 text-sm">
    <input type="checkbox" checked={includeIds.includes(it.id)} onChange={async ()=>{ const next = includeIds.includes(it.id)? includeIds.filter(x=>x!==it.id): [...includeIds, it.id]; setIncludeIds(next); if (toggleFollowIncludeId) toggleFollowIncludeId(it.id); try { const tags = new Set(it.tags || []); if (next.includes(it.id)) tags.add('followup'); else tags.delete('followup'); await upsert.mutateAsync({ ...it, tags: Array.from(tags) }) } catch {} }} />
                <span className="text-slate-700">{it.title}</span>
                {it.date && <span className="text-xs text-slate-500">({it.date.slice(0,10)})</span>}
              </label>
            ))}
          </div>
        </div>
      )}
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
      {/* Schedule send */}
      {fuChannel==='email' && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <div className="text-xs text-slate-500 mb-1">Schedule</div>
            <select className="h-10 w-full input-neon px-3 text-sm" value={schedule} onChange={e=>setSchedule(e.target.value as any)}>
              <option value="now">Send now</option>
              <option value="later">Later today</option>
              <option value="tomorrow">Tomorrow morning</option>
              <option value="custom">Custom date/time</option>
              <option value="sequence">Sequence (0d, +2d, +7d)</option>
            </select>
          </div>
          {schedule==='custom' && (
            <div>
              <div className="text-xs text-slate-500 mb-1">When</div>
              <input type="datetime-local" className="h-10 w-full input-neon px-3 text-sm" value={customWhen} onChange={e=>setCustomWhen(e.target.value)} />
            </div>
          )}
          <div className="flex items-end">
            <button onClick={async ()=>{
              if (!selectedClientId || !user?.id) { pushToast({ type:'info', message: 'Pick a client first.'}); return }
              if (!fuDraft) { pushToast({ type:'info', message: 'Generate a draft first.'}); return }
              try {
                const to: string[] = (activeClient as any)?.email ? [(activeClient as any).email] : []
                const cc: string[] = []
                let sendAt = new Date()
                const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Agent'
                if (schedule==='later') {
                  const later = new Date(); later.setHours(17,0,0,0); if (later < new Date()) later.setDate(later.getDate()+1); sendAt = later
                } else if (schedule==='tomorrow') {
                  const t = new Date(); t.setDate(t.getDate()+1); t.setHours(9,0,0,0); sendAt = t
                } else if (schedule==='custom') {
                  if (!customWhen) { pushToast({ type:'info', message: 'Pick a date/time' }); return }
                  sendAt = new Date(customWhen)
                }
                // For sequence, schedule the first email only here (others could be created similarly)
                const payload = {
                  client_id: selectedClientId,
                  to_recipients: to,
                  cc_recipients: cc,
                  subject: 'Follow-up',
                  body_html: cleanPlaceholders(fuDraft, activeClient?.name || undefined, displayName),
                  body_text: cleanPlaceholders(fuDraft, activeClient?.name || undefined, displayName),
                  noteitem_ids: includeIds,
                  send_at: sendAt.toISOString(),
                }
                const res = await fetch('/api/email/schedule', { method:'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) })
                const json = await res.json(); if (!res.ok) throw new Error(json?.error || 'Failed to schedule')
                pushToast({ type:'success', message: 'Scheduled' })
              } catch (e:any) { pushToast({ type:'error', message: e?.message || 'Schedule failed' }) }
            }} className="ml-auto h-10 px-4 rounded text-sm text-white bg-slate-900">{schedule==='now'? 'Send now':'Schedule'}</button>
          </div>
        </div>
      )}
    </section>
  )
}
