"use client"
import React, { useMemo, useState } from 'react'
import { sanitizeEmailBody, cleanPlaceholders } from '@/lib/emailSanitizer'
import { useUI } from '@/store/ui'
import { useClient } from '@/hooks/useClient'
import { useNoteItems } from '@/hooks/useNoteItems'
import type { NoteItem } from '@/lib/types'
import { useSessionUser } from '@/hooks/useSessionUser'

// Rebuilt Followup Composer: focuses on clear hit targets & accessible structure
export default function FollowupComposer() {
  const { selectedClientId, pushToast } = useUI()
  const { data: activeClient } = useClient((selectedClientId || '') as any)
  const { user } = useSessionUser()
  const { data: noteItems = [], upsert } = useNoteItems(selectedClientId || undefined)

  // Core form state
  const [channel, setChannel] = useState<'email'|'sms'>('email')
  const [tone, setTone] = useState<'Professional'|'Friendly'|'Concise'>('Professional')
  const [subject, setSubject] = useState('Follow-up')
  const [instruction, setInstruction] = useState('Draft a concise follow-up referencing relevant milestones and next steps. Avoid redundancy. Close with a clear call-to-action.')
  const [draft, setDraft] = useState('')
  const [generating, setGenerating] = useState(false)
  const [scheduleMode, setScheduleMode] = useState<'now'|'later'|'tomorrow'|'custom'|'sequence'>('now')
  const [customWhen, setCustomWhen] = useState('')

  // Include / Exclude notes
  const initialTagged = useMemo(()=> (noteItems||[]).filter(i=> (i.tags||[]).includes('followup')).map(i=>i.id), [noteItems])
  const [includeIds, setIncludeIds] = useState<string[]>(initialTagged)

  // Derived structured context
  const contextData = useMemo(()=>{
    const deadlines = noteItems.filter(i=> ['deadline','inspection','appraisal','emd'].includes(i.kind) && i.date)
      .sort((a,b)=> (a.date||'').localeCompare(b.date||''))
    const nextSteps = noteItems.filter(i=> i.kind==='next_step')
    const contacts: Record<string, NoteItem[]> = {}
    for (const n of noteItems.filter(i=> i.kind==='contact')) {
      const key = n.party || 'other'; (contacts[key] ||= []).push(n)
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

  const filteredContext = () => {
    const inc = includeIds.length? includeIds : undefined
    return {
      deadlines: contextData.deadlines.filter(d=> !inc || inc.includes(d.id)),
      next_steps: contextData.nextSteps.filter(n=> !inc || inc.includes(n.id)),
      contacts: contextData.contacts,
      milestones: contextData.milestones,
    }
  }

  const handleToggleInclude = async (it: NoteItem) => {
    setIncludeIds(prev => prev.includes(it.id)? prev.filter(id=>id!==it.id): [...prev, it.id])
    // Persist followup tag
    try {
      const tags = new Set(it.tags || [])
      if (!includeIds.includes(it.id)) tags.add('followup'); else tags.delete('followup')
      await upsert.mutateAsync({ ...it, tags: Array.from(tags) })
    } catch { /* silent */ }
  }

  const canGenerate = !!selectedClientId && !generating

  async function generateDraft() {
    if (!selectedClientId) { pushToast({ type:'info', message:'Pick a client first.' }); return }
    setGenerating(true)
    try {
      const ctx = filteredContext()
      const payload = {
        clientId: selectedClientId,
        channel,
        instruction: `Tone: ${tone}. Context JSON: ${JSON.stringify(ctx)}\n${instruction}`
      }
      const res = await fetch('/api/ai/followup', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) })
      const json = await res.json(); if (!res.ok) throw new Error(json?.error || 'Failed')
      const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Agent'
      let body = json.draft || ''
      body = body.replace(/\[Your Name\]/gi, displayName)
      body = sanitizeEmailBody(subject, body)
      body = cleanPlaceholders(body, (activeClient as any)?.name || undefined, displayName)
      setDraft(body)
      pushToast({ type:'success', message:'Draft ready' })
    } catch(e:any) {
      pushToast({ type:'error', message: e?.message || 'Generation failed' })
    } finally {
      setGenerating(false)
    }
  }

  async function scheduleSend() {
    if (!selectedClientId || !draft) { pushToast({ type:'info', message:'Need client & draft first' }); return }
    const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Agent'
    const to: string[] = (activeClient as any)?.email && channel==='email' ? [(activeClient as any).email] : []
    if (channel==='email' && to.length===0) { pushToast({ type:'info', message:'Client missing email' }); return }
    let sendAt = new Date()
    if (scheduleMode==='later') { const t = new Date(); t.setHours(17,0,0,0); if (t<new Date()) t.setDate(t.getDate()+1); sendAt=t }
    else if (scheduleMode==='tomorrow') { const t = new Date(); t.setDate(t.getDate()+1); t.setHours(9,0,0,0); sendAt=t }
    else if (scheduleMode==='custom') { if(!customWhen) { pushToast({ type:'info', message:'Pick date/time' }); return } sendAt=new Date(customWhen) }
    const payload = {
      client_id: selectedClientId,
      to_recipients: to,
      cc_recipients: [] as string[],
      subject,
      body_html: cleanPlaceholders(draft, activeClient?.name || undefined, displayName),
      body_text: cleanPlaceholders(draft, activeClient?.name || undefined, displayName),
      noteitem_ids: includeIds,
      send_at: sendAt.toISOString(),
    }
    try {
      const res = await fetch('/api/email/schedule', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) })
      const j = await res.json(); if(!res.ok) throw new Error(j?.error||'Schedule failed')
      pushToast({ type:'success', message: scheduleMode==='now'? 'Sent / queued':'Scheduled' })
    } catch(e:any) { pushToast({ type:'error', message: e?.message || 'Schedule failed' }) }
  }

  return (
    <section className="rounded-2xl border border-default bg-white p-5 mt-4 shadow-sm" aria-labelledby="followup_header">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h2 id="followup_header" className="font-semibold text-lg text-ink">AI Follow‑Up Composer</h2>
        <div className="text-xs text-muted">{activeClient? `Client: ${(activeClient as any)?.name || (activeClient as any)?.first_name || ''}`:'No client selected'}</div>
      </div>

      {/* Step 1: Configuration */}
      <fieldset className="mt-4 border rounded-xl p-4" aria-labelledby="cfg_legend">
        <legend id="cfg_legend" className="px-1 text-sm font-medium text-ink">1. Configuration</legend>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted" htmlFor="fu_channel">Channel</label>
            <select id="fu_channel" value={channel} onChange={e=>setChannel(e.target.value as any)} className="h-10 rounded-md border border-default px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted" htmlFor="fu_tone">Tone</label>
            <select id="fu_tone" value={tone} onChange={e=>setTone(e.target.value as any)} className="h-10 rounded-md border border-default px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {['Professional','Friendly','Concise'].map(t=> <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted" htmlFor="fu_subject">Subject</label>
            <input id="fu_subject" value={subject} onChange={e=>setSubject(e.target.value)} className="h-10 rounded-md border border-default px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted">Client</label>
            <div className="h-10 rounded-md border border-default bg-surface-2 px-3 text-sm flex items-center">{(activeClient as any)?.name || '—'}</div>
          </div>
        </div>
      </fieldset>

      {/* Step 2: Include Notes */}
      <fieldset className="mt-4 border rounded-xl p-4" aria-labelledby="notes_legend">
        <legend id="notes_legend" className="px-1 text-sm font-medium text-ink">2. Select Context ({includeIds.length}/{noteItems.length})</legend>
        {noteItems.length === 0 && <div className="text-xs text-muted">No structured notes yet. Generate or add some notes first.</div>}
        {noteItems.length>0 && (
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {noteItems.map(it => {
              const active = includeIds.includes(it.id)
              return (
                <li key={it.id}>
                  <button
                    type="button"
                    onClick={()=>handleToggleInclude(it)}
                    aria-pressed={active}
                    className={`w-full text-left rounded-lg border px-3 py-2 text-xs leading-snug transition relative ${active? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-400':'bg-white border-default hover:border-indigo-300'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                  >
                    <span className="font-medium text-ink block truncate">{it.title}</span>
                    <span className="text-[10px] text-muted block">{it.kind}{it.date? ` • ${it.date.slice(0,10)}`:''}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </fieldset>

      {/* Step 3: Instruction */}
      <fieldset className="mt-4 border rounded-xl p-4" aria-labelledby="inst_legend">
        <legend id="inst_legend" className="px-1 text-sm font-medium text-ink">3. Instruction</legend>
        <textarea
          value={instruction}
          onChange={e=>setInstruction(e.target.value)}
          className="w-full min-h-[120px] rounded-md border border-default p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
          placeholder="Add extra context or constraints"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={()=> setInstruction(prev => prev + (prev.endsWith('\n')?'':'\n') + 'Highlight any upcoming deadlines succinctly.')}
            className="text-[11px] px-2 py-1 rounded border border-default bg-surface hover:bg-surface-2"
          >+ Deadlines</button>
          <button
            type="button"
            onClick={()=> setInstruction(prev => prev + (prev.endsWith('\n')?'':'\n') + 'Keep under 130 words.')}
            className="text-[11px] px-2 py-1 rounded border border-default bg-surface hover:bg-surface-2"
          >+ Short</button>
          <button
            type="button"
            onClick={()=> setInstruction(prev => prev + (prev.endsWith('\n')?'':'\n') + 'Close with a question inviting a quick reply.')}
            className="text-[11px] px-2 py-1 rounded border border-default bg-surface hover:bg-surface-2"
          >+ CTA</button>
        </div>
      </fieldset>

      {/* Step 4: Generate & Preview */}
      <fieldset className="mt-4 border rounded-xl p-4" aria-labelledby="gen_legend">
        <legend id="gen_legend" className="px-1 text-sm font-medium text-ink">4. Generate</legend>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            disabled={!canGenerate}
            onClick={generateDraft}
            className={`h-10 px-5 rounded-md text-sm font-medium text-white transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${canGenerate? 'bg-indigo-600 hover:bg-indigo-700':'bg-slate-400 cursor-not-allowed'}`}
          >{generating? 'Generating…':'Generate Draft'}</button>
          {draft && (
            <>
              <button type="button" onClick={()=>navigator.clipboard.writeText(draft)} className="h-10 px-4 rounded-md border border-default text-sm bg-white hover:bg-surface-2">Copy</button>
              {channel==='email' && (activeClient as any)?.email && (
                <a
                  href={`mailto:${(activeClient as any).email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(draft)}`}
                  className="h-10 px-4 rounded-md bg-emerald-600 text-white text-sm flex items-center hover:bg-emerald-700"
                >Open Email</a>
              )}
              {channel==='sms' && (activeClient as any)?.phone && (
                <a
                  href={`sms:${(activeClient as any).phone}?body=${encodeURIComponent(draft.slice(0,160))}`}
                  className="h-10 px-4 rounded-md bg-emerald-600 text-white text-sm flex items-center hover:bg-emerald-700"
                >Open SMS</a>
              )}
            </>
          )}
        </div>
        <div className="mt-4 rounded-lg border border-default bg-surface p-4 min-h-[140px] overflow-auto">
          <div className="text-xs font-semibold text-muted mb-2">Draft Preview</div>
          {draft? <pre className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{draft}</pre> : <div className="text-xs text-muted">No draft yet.</div>}
        </div>
      </fieldset>

      {/* Step 5: Schedule (email only) */}
      {channel==='email' && (
        <fieldset className="mt-4 border rounded-xl p-4" aria-labelledby="sched_legend">
          <legend id="sched_legend" className="px-1 text-sm font-medium text-ink">5. Send / Schedule</legend>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted" htmlFor="schedule_mode">Timing</label>
              <select id="schedule_mode" value={scheduleMode} onChange={e=>setScheduleMode(e.target.value as any)} className="h-10 rounded-md border border-default px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="now">Send now</option>
                <option value="later">Later today (5pm)</option>
                <option value="tomorrow">Tomorrow 9am</option>
                <option value="custom">Custom</option>
                <option value="sequence">Sequence (beta)</option>
              </select>
            </div>
            {scheduleMode==='custom' && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted" htmlFor="custom_when">When</label>
                <input id="custom_when" type="datetime-local" value={customWhen} onChange={e=>setCustomWhen(e.target.value)} className="h-10 rounded-md border border-default px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            )}
            <div className="flex items-end">
              <button
                type="button"
                disabled={!draft}
                onClick={scheduleSend}
                className={`h-10 w-full rounded-md text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${draft? 'bg-indigo-600 hover:bg-indigo-700':'bg-slate-400 cursor-not-allowed'}`}
              >{scheduleMode==='now'? 'Send now':'Schedule'}</button>
            </div>
          </div>
          {scheduleMode==='sequence' && (
            <p className="mt-3 text-[11px] text-muted">Sequence mode will (future) create a follow-up series (0d, +2d, +7d). Currently only the first message is scheduled.</p>
          )}
        </fieldset>
      )}
    </section>
  )
}
