"use client"
import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { NoteItem } from '@/lib/types'
import { useNoteItems } from '@/hooks/useNoteItems'
import { useUI } from '@/store/ui'

type GroupKey = 'key_dates'|'next_steps'|'people'|'budget'|'money'|'docs'|'risks'|'other'

function groupKey(item: NoteItem): GroupKey {
  const k = item.kind
  if (['deadline','inspection','appraisal','emd'].includes(k)) return 'key_dates'
  if (k==='next_step') return 'next_steps'
  if (k==='contact') return 'people'
  // Budget/financing explicit bucket
  if (k==='financing' || /\bbudget\b/i.test(item.title||'') || /\bbudget\b/i.test(item.body||'')) return 'budget'
  if (k==='emd' || (item.amount && item.amount>0)) return 'money'
  if (k==='document') return 'docs'
  if (k==='risk') return 'risks'
  return 'other'
}

function StatusChip({ value, onChange }:{ value: NoteItem['status']; onChange:(v: NoteItem['status'])=>void }) {
  const order: NoteItem['status'][] = ['todo','scheduled','done','blocked']
  const next = () => onChange(order[(order.indexOf(value||'todo')+1)%order.length])
  const color = value==='done'? 'bg-emerald-600': value==='scheduled'? 'bg-amber-600': value==='blocked'? 'bg-rose-600':'bg-slate-600'
  return <button type="button" onClick={next} className={`text-xs text-white ${color} rounded px-2 py-1`}>{value||'todo'}</button>
}

function DatePill({ value, onChange }:{ value?: string; onChange:(v?: string)=>void }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value?.slice(0,10) || '')
  if (!editing) return <button type="button" onClick={()=>setEditing(true)} className="text-xs bg-slate-100 text-slate-700 rounded px-2 py-1">{value? value.slice(0,10): 'Add date'}</button>
  return (
    <input
      type="date"
      value={val}
      onChange={(e)=>setVal(e.target.value)}
      onBlur={()=>{ setEditing(false); onChange(val? new Date(val).toISOString(): undefined) }}
      onKeyDown={(e)=>{ if (e.key==='Enter') { (e.target as HTMLInputElement).blur() } }}
      className="text-xs border border-slate-300 rounded px-2 py-1"
    />
  )
}

export default function NoteTiles({ clientId }:{ clientId?: string }) {
  const { data: items = [], upsert } = useNoteItems(clientId)
  const { pushToast, toggleFollowIncludeId, followIncludeIds, setFollowIncludeIds } = useUI() as any
  const router = useRouter()

  const groups = useMemo(() => {
    const map: Record<GroupKey, NoteItem[]> = { key_dates:[], next_steps:[], people:[], budget:[], money:[], docs:[], risks:[], other:[] }
    // Deduplicate by kind+party+normalized title
    const seen = new Set<string>()
    for (const it of items) {
      const key = `${it.kind}:${it.party||''}:${(it.title||'').trim().toLowerCase()}`
      if (seen.has(key)) continue
      seen.add(key)
      map[groupKey(it)].push(it)
    }
    // sort key dates by date asc
    map.key_dates.sort((a,b)=> (a.date||'9999').localeCompare(b.date||'9999'))
    return map
  }, [items])

  const onQuickAdd = async () => {
    if (!clientId) return
    try {
      await upsert.mutateAsync({ client_id: clientId, title: 'New note', kind: 'general_note', source: 'user_note' })
    } catch (e:any) { pushToast({ type:'error', message: e?.message || 'Failed to add' }) }
  }

  const saveFor = (orig: NoteItem) => async (patch: Partial<NoteItem>) => {
    try { await upsert.mutateAsync({ ...orig, ...patch }) } catch (e:any) { pushToast({ type:'error', message: e?.message || 'Save failed' }) }
  }

  const Section = ({ title, items, group }:{ title: string; items: NoteItem[]; group: GroupKey }) => {
    if (!items.length) return null
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-slate-700">{title}</div>
          <span className="text-xs text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">{items.length}</span>
        </div>
        <div className="flex flex-col gap-3 min-h-[60px]">
          {items.map((it)=> (
            <NoteTileCard
              key={it.id}
              it={it}
              onSave={saveFor(it)}
              onUseInFollowUp={async (id, nextSelected)=>{
                try {
                  const tgt = items.find(x=>x.id===id)
                  const tagsSet = new Set(tgt?.tags || [])
                  if (nextSelected) tagsSet.add('followup'); else tagsSet.delete('followup')
                  await upsert.mutateAsync({ ...tgt!, tags: Array.from(tagsSet) })
                  if (toggleFollowIncludeId) toggleFollowIncludeId(id)
                  pushToast({ type:'success', message: nextSelected? 'Selected for Follow‑Up' : 'Removed from Follow‑Up' })
                } catch(e:any){ pushToast({ type:'error', message: e?.message || 'Failed to update' }) }
              }}
              group={group}
              selected={(followIncludeIds||[]).includes(it.id) || (it.tags||[]).includes('followup')}
            />
          ))}
        </div>
      </div>
    )
  }

  if (!clientId) return null

  const total = items.length
  if (!total) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
  <div className="font-semibold text-slate-900 mb-2">Snapshot</div>
        <p className="text-sm text-slate-600">Drop notes here or paste any text. I’ll organize dates, tasks, and contacts into tiles.</p>
        <ParseBox clientId={clientId} />
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="font-semibold text-slate-900">Snapshot</div>
        <button type="button" onClick={onQuickAdd} className="ml-auto h-8 px-3 rounded bg-slate-900 text-white text-xs">+ Add Note/Date</button>
        {(items.some(i=> (i.tags||[]).includes('followup')) || (followIncludeIds||[]).length>0) && (
          <button type="button" onClick={()=>{ const selected = Array.from(new Set([...(followIncludeIds||[]), ...items.filter(i=> (i.tags||[]).includes('followup')).map(i=>i.id)])); setFollowIncludeIds(selected); router.push('/followup') }} className="h-8 px-3 rounded bg-slate-900 text-white text-xs">Generate Follow‑Up</button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Section title="Key Dates" items={groups.key_dates} group="key_dates" />
        <Section title="Next Steps" items={groups.next_steps} group="next_steps" />
        <Section title="People" items={groups.people} group="people" />
        <Section title="Budget" items={groups.budget} group="budget" />
        <Section title="Other" items={[...groups.money, ...groups.docs, ...groups.risks, ...groups.other]} group="other" />
      </div>
    </section>
  )
}

function tileBgFor(it: NoteItem, group?: GroupKey) {
  const k = group || groupKey(it)
  // Use existing soft color helpers defined in globals.css and tailwind soft tones
  if (k==='key_dates') return 'bg-warnSoft'
  if (k==='next_steps') return 'bg-emerald-50'
  if (k==='people') return 'bg-green-50'
  if (k==='budget') return 'bg-amber-50'
  if (k==='money') return 'bg-primarySoft'
  if (k==='docs') return 'bg-slate-50'
  if (k==='risks') return 'bg-dangerSoft'
  return 'bg-slate-50'
}

function NoteTileCard({ it, onSave, onUseInFollowUp, group, selected }:{ it: NoteItem; onSave:(patch: Partial<NoteItem>)=>Promise<void>; onUseInFollowUp:(id: string, nextSelected: boolean)=>void; group: GroupKey; selected: boolean }) {
  const [t, setT] = useState(it.title)
  const [b, setB] = useState(it.body || '')
  const [editT, setEditT] = useState(false)
  const [editB, setEditB] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const isSelected = selected || (it.tags||[]).includes('followup')
  const summary = useMemo(()=>{
    // Budget summary $Xk–$Yk if present
    if (group==='budget' || it.kind==='financing' || /\bbudget\b/i.test(it.title||'') || /\bbudget\b/i.test(it.body||'')) {
      const text = `${it.title||''} ${it.body||''}`
      const nums = Array.from(text.matchAll(/\$?\s*([\d]{2,3})(?:,?([\d]{3}))?\s*(k|K)?/g)).map(m=>{
        let v = parseInt(m[1],10)
        if (m[2]) v = v*1000 + parseInt(m[2],10)
        if (m[3]) v = v*1000
        return v
      })
      if (nums.length>=2) {
        const min = Math.min(...nums), max = Math.max(...nums)
        const fmt = (n:number)=> n>=1000? `$${Math.round(n/1000)}k` : `$${n}`
        return `Budget ${fmt(min)}–${fmt(max)}`
      }
      if (nums.length===1) {
        const fmt = (n:number)=> n>=1000? `$${Math.round(n/1000)}k` : `$${n}`
        return `Budget ${fmt(nums[0])}`
      }
    }
    const s = (it.body||'').split(/(?<=[.!?])\s+/)[0] || ''
    return s.length>80? s.slice(0,77)+'…' : s
  }, [group, it.title, it.body, it.kind])
  return (
    <div className={`rounded-xl border border-slate-200 ${tileBgFor(it, group)} p-3 space-y-2`}>
      <div className="flex items-center gap-2">
        {!editT ? (
          <button type="button" className="font-medium text-slate-900 text-left" onClick={()=>setEditT(true)}>{t || 'Untitled'}</button>
        ) : (
          <input className="w-full border border-slate-300 rounded px-2 py-1" value={t} onChange={e=>setT(e.target.value)} onBlur={()=>{ setEditT(false); if (t!==it.title) onSave({ title: t }) }} onKeyDown={e=>{ if (e.key==='Enter') (e.target as HTMLInputElement).blur() }} />
        )}
        <div className="ml-auto flex items-center gap-2">
          <DatePill value={it.date} onChange={(v)=>onSave({ date: v })} />
          <StatusChip value={it.status} onChange={(v)=>onSave({ status: v })} />
        </div>
      </div>
      <div className="text-sm text-slate-700">
        {summary && <div className="text-slate-700">{summary}</div>}
        {!expanded && it.body && it.body !== summary && (
          <button type="button" className="mt-1 text-xs text-slate-600 underline" onClick={()=>setExpanded(true)}>More</button>
        )}
        {expanded && (
          <div className="mt-1">
            {!editB ? (
              <button type="button" className="text-sm text-slate-600 text-left" onClick={()=>setEditB(true)}>{b || 'Add details'}</button>
            ) : (
              <textarea className="w-full border border-slate-300 rounded px-2 py-1 text-sm" value={b} onChange={e=>setB(e.target.value)} onBlur={()=>{ setEditB(false); if (b!==it.body) onSave({ body: b }) }} />
            )}
            <div>
              <button type="button" className="mt-1 text-xs text-slate-600 underline" onClick={()=>setExpanded(false)}>Less</button>
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-2 items-center">
        <button type="button" onClick={()=>onSave({ status: it.status==='done'? 'todo':'done' })} className="text-xs px-2 py-1 rounded bg-slate-900 text-white">{it.status==='done'?'Reopen':'Mark Done'}</button>
        <button type="button" onClick={()=>onUseInFollowUp(it.id, !isSelected)} className={`text-xs px-2 py-1 rounded border ${isSelected? 'border-emerald-200 bg-emerald-50 text-emerald-700':'border-slate-200 bg-white text-slate-900'}`}>{isSelected? 'Selected':'Use in Follow‑Up'}</button>
      </div>
    </div>
  )
}

function ParseBox({ clientId }:{ clientId: string }) {
  const [text, setText] = useState('')
  const { upsert } = useNoteItems(clientId)
  const { pushToast } = useUI()
  const onParse = async () => {
    try {
      const res = await fetch('/api/notes/parse', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ clientId, text }) })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Parse failed')
      const items: NoteItem[] = json.items || []
      for (const it of items) {
        await upsert.mutateAsync({ ...it, id: undefined })
      }
      pushToast({ type:'success', message: `Added ${items.length} item(s)` })
      setText('')
    } catch (e:any) { pushToast({ type:'error', message: e?.message || 'Parse failed'}) }
  }
  return (
    <div className="mt-3 space-y-2">
      <textarea className="w-full min-h-[120px] input-neon p-3 text-base text-black placeholder-black/70" value={text} onChange={e=>setText(e.target.value)} placeholder="Paste notes here (e.g., 'Ratified 8/20. EMD due in 3 business days…')" />
      <div>
        <button type="button" onClick={onParse} className="h-10 px-4 rounded text-sm text-white bg-slate-900">Parse</button>
      </div>
    </div>
  )
}
