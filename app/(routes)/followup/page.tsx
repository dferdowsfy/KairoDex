"use client"
export const dynamic = 'force-dynamic'
import { useEffect, useMemo, useState } from 'react'
import { useUI } from '@/store/ui'
import { useClient } from '@/hooks/useClient'
import { useSessionUser } from '@/hooks/useSessionUser'
import { Mail, MessageSquare, Copy, Download, Save } from 'lucide-react'

type Channel = 'email' | 'sms'

export default function FollowUpPage() {
  const { selectedClientId, pushToast } = useUI()
  const { data: client } = useClient((selectedClientId || '') as any)
  const { user } = useSessionUser()
  const [channel, setChannel] = useState<Channel>('email')
  const [tone, setTone] = useState('Professional')
  const [instruction, setInstruction] = useState('Draft a brief follow-up based on recent activity.')
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<any[]>([])

  const clientEmail = (client as any)?.email
  const mailto = useMemo(() => {
    if (channel !== 'email' || !clientEmail || !draft) return ''
    const subject = encodeURIComponent('Follow-up')
    const body = encodeURIComponent(draft)
    return `mailto:${clientEmail}?subject=${subject}&body=${body}`
  }, [channel, clientEmail, draft])

  useEffect(() => {
    const load = async () => {
      if (!selectedClientId) { setHistory([]); return }
      try {
        const res = await fetch(`/api/ai/followup?clientId=${encodeURIComponent(selectedClientId)}`, { cache: 'no-store' })
        if (!res.ok) throw new Error(await res.text())
        const json = await res.json()
        setHistory(json.messages || [])
      } catch {
        setHistory([])
      }
    }
    load()
  }, [selectedClientId])

  const generate = async () => {
    if (!selectedClientId) { pushToast({ type: 'info', message: 'Pick a client from the top bar first.' }); return }
    setLoading(true)
    try {
      const res = await fetch('/api/ai/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selectedClientId, channel, instruction: `Tone: ${tone}. ${instruction}` })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to generate')
      setDraft(json.draft || '')
    } catch (e: any) {
      pushToast({ type: 'error', message: e?.message || 'Generation failed' })
    } finally {
      setLoading(false)
    }
  }

  const save = async () => {
    if (!draft.trim()) { pushToast({ type: 'info', message: 'Nothing to save yet.' }); return }
    try {
      const res = await fetch('/api/ai/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selectedClientId, channel, instruction: `Tone: ${tone}. ${instruction}`, save: true, userId: (user as any)?.id })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to save')
      pushToast({ type: 'success', message: 'Saved to activity.' })
      // reload history
      const list = await fetch(`/api/ai/followup?clientId=${encodeURIComponent(selectedClientId || '')}`, { cache: 'no-store' })
      const j = await list.json()
      setHistory(j.messages || [])
    } catch (e: any) {
      pushToast({ type: 'error', message: e?.message || 'Save failed' })
    }
  }

  return (
    <main className="min-h-screen p-4" style={{ background: 'var(--page-bg)' }}>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="sf-display h2 text-white">Generate Follow‑Up</h1>
        {client && (<div className="text-sm text-white/80 bg-white/10 px-3 py-1 rounded-lg">Client: {(client as any)?.name}</div>)}
      </div>

      {!selectedClientId && (
        <div className="panel-glass rounded-apple border border-white/50 p-4 text-ink bg-white mb-4">Pick a client from the top bar to generate a follow‑up.</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Composer */}
        <section className="lg:col-span-2 panel-glass rounded-apple p-5 border border-white/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div>
              <div className="text-xs text-ink/60 mb-1">Channel</div>
              <select className="h-10 w-full input-neon px-3 text-sm" value={channel} onChange={e=>setChannel(e.target.value as Channel)}>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
            </div>
            <div>
              <div className="text-xs text-ink/60 mb-1">Tone</div>
              <select className="h-10 w-full input-neon px-3 text-sm" value={tone} onChange={e=>setTone(e.target.value)}>
                {['Professional','Friendly','Concise'].map(t=> <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <div className="text-xs text-ink/60 mb-1">Client</div>
              <div className="h-10 w-full rounded border border-white/50 bg-white/80 text-ink px-3 text-sm grid place-items-center">{(client as any)?.name || 'Not selected'}</div>
            </div>
          </div>

          <div>
            <div className="text-xs text-ink/60 mb-1">Instruction</div>
            <textarea className="w-full min-h-[120px] input-neon p-3 text-base text-black placeholder-black/70" value={instruction} onChange={e=>setInstruction(e.target.value)} placeholder="Add extra context or requests" />
          </div>

          <div className="mt-3 flex gap-2">
            <button onClick={generate} disabled={loading || !selectedClientId} className={`h-10 px-4 rounded text-sm text-white ${loading?'bg-slate-400':'bg-primary hover:opacity-90'}`}>{loading?'Generating…':'Generate'}</button>
            <button onClick={save} disabled={!draft.trim()} className="h-10 px-4 rounded text-sm text-white bg-accent hover:opacity-90 inline-flex items-center gap-2"><Save className="w-4 h-4"/> Save</button>
            {draft && (
              <>
                <button onClick={()=>navigator.clipboard.writeText(draft)} className="h-10 px-3 rounded text-sm bg-white/80 text-ink border border-white/50 inline-flex items-center gap-2"><Copy className="w-4 h-4"/>Copy</button>
                <button onClick={() => {
                  const blob = new Blob([draft], { type: 'text/plain;charset=utf-8' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'followup.txt'
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                  URL.revokeObjectURL(url)
                }} className="h-10 px-3 rounded text-sm bg-white/80 text-ink border border-white/50 inline-flex items-center gap-2"><Download className="w-4 h-4"/>Download</button>
                {mailto && <a href={mailto} className="h-10 px-3 rounded text-sm text-white bg-primary hover:opacity-90 inline-flex items-center gap-2"><Mail className="w-4 h-4"/>Open Email</a>}
                {channel==='sms' && (client as any)?.phone && <a href={`sms:${(client as any)?.phone}`} className="h-10 px-3 rounded text-sm text-white bg-primary hover:opacity-90 inline-flex items-center gap-2"><MessageSquare className="w-4 h-4"/>Open SMS</a>}
              </>
            )}
          </div>

          <div className="contract-preview rounded-xl p-5 mt-4 min-h-[200px]">
            <div className="text-sm font-semibold contract-preview-title mb-2">Draft Preview</div>
            {draft ? (<pre className="whitespace-pre-wrap">{draft}</pre>) : (
              <div className="text-ink/70">Your AI-generated draft will appear here.</div>
            )}
          </div>
        </section>

        {/* History */}
        <aside className="panel-glass rounded-apple p-5 border border-white/50">
          <div className="sf-display text-lg text-white mb-3">History</div>
          {!history.length && <div className="text-sm text-ink/70 bg-white/80 p-3 rounded">No messages yet.</div>}
          <ul className="space-y-3">
            {history.map((m) => (
              <li key={m.id} className="panel-glass rounded-lg p-3 border border-white/50">
                <div className="text-xs text-ink/60 mb-1">{new Date(m.created_at).toLocaleString()} • {m.channel.toUpperCase()}</div>
                <div className="text-sm text-ink whitespace-pre-wrap">{m.body}</div>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </main>
  )
}
