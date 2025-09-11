"use client"
import { useState } from 'react'
import { useEmailComposer } from '@/store/useEmailComposer'
import { useNotes } from '@/hooks/useNotes'
import { useTasks } from '@/hooks/useTasks'
import { PlusCircle, Sparkles, CalendarPlus, FileEdit } from 'lucide-react'
import { USE_MOCKS } from '@/lib/config'

export default function QuickActions({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState<string | null>(null)
  const emailComposer = useEmailComposer()
  const { addNote } = useNotes(clientId)
  const tasks = useTasks()

  return (
    <section className="rounded-2xl">
  <div className="font-semibold mb-2 text-ink">Quick Actions</div>
      <div className="grid grid-cols-2 gap-2">
        <button className="panel-glass rounded-lg border border-white/50 py-2 inline-flex items-center justify-center gap-2 hover:shadow" onClick={() => setOpen('note')}><PlusCircle className="h-4 w-4" /> Add Note</button>
        <button className="panel-glass rounded-lg border border-white/50 py-2 inline-flex items-center justify-center gap-2 hover:shadow" onClick={() => setOpen('follow')}><Sparkles className="h-4 w-4" /> Generate Follow‑Up</button>
        <button className="panel-glass rounded-lg border border-white/50 py-2 inline-flex items-center justify-center gap-2 hover:shadow" onClick={() => setOpen('showing')}><CalendarPlus className="h-4 w-4" /> Schedule Showing</button>
        <button className="panel-glass rounded-lg border border-white/50 py-2 inline-flex items-center justify-center gap-2 hover:shadow" onClick={() => setOpen('amend')}><FileEdit className="h-4 w-4" /> Amend Contract</button>
        <button className="panel-glass rounded-lg border border-white/50 py-2 inline-flex items-center justify-center gap-2 hover:shadow" onClick={() => emailComposer.set({ open: true })}><Sparkles className="h-4 w-4" /> Generate Email</button>
      </div>

    {open === 'note' && (
        <div className="mt-3">
      <textarea aria-label="Note" className="w-full input-neon p-2" placeholder="Add a quick note..." id="qa_note" />
          <div className="mt-2 flex gap-2">
            <button className="bg-primary text-white rounded-lg px-3 py-1" onClick={() => { const el = document.getElementById('qa_note') as HTMLTextAreaElement; addNote.mutate(el.value); setOpen(null) }}>Save</button>
            <button className="text-ink/50" onClick={() => setOpen(null)}>Cancel</button>
          </div>
        </div>
      )}

      {open === 'follow' && (
        <div className="mt-3">
          <div className="text-sm mb-2">Channel:</div>
          <div className="flex gap-2">
            <button className="bg-primary text-white rounded-lg px-3 py-1" onClick={async () => {
              if (USE_MOCKS) {
                alert('Draft email:\n\nHi there — great seeing you! Here are a few places that match your preferences. Want me to line up a tour this weekend?')
              } else {
                const res = await fetch('/api/ai/followup', { method: 'POST', body: JSON.stringify({ clientId, channel: 'email' }) })
                const data = await res.json(); alert(data.draft || 'No draft')
              }
              setOpen(null)
            }}>Email</button>
            <button className="bg-primary/80 text-white rounded-lg px-3 py-1" onClick={async () => {
              if (USE_MOCKS) {
                alert('Draft SMS:\n\nQuick update: found a couple promising options. Free Sat 11am or Sun 2pm?')
              } else {
                const res = await fetch('/api/ai/followup', { method: 'POST', body: JSON.stringify({ clientId, channel: 'sms' }) })
                const data = await res.json(); alert(data.draft || 'No draft')
              }
              setOpen(null)
            }}>SMS</button>
          </div>
        </div>
      )}

    {open === 'showing' && (
        <div className="mt-3">
      <input className="w-full input-neon p-2 mb-2" placeholder="Address" id="qa_addr" />
      <input className="w-full input-neon p-2 mb-2" placeholder="Time" id="qa_time" />
          <div className="flex gap-2">
            <button className="bg-primary text-white rounded-lg px-3 py-1" onClick={() => {
              const addr = (document.getElementById('qa_addr') as HTMLInputElement).value
              const time = (document.getElementById('qa_time') as HTMLInputElement).value
              tasks.create.mutate({ title: `Showing: ${addr} ${time}` })
              setOpen(null)
            }}>Save</button>
            <button className="text-ink/50" onClick={() => setOpen(null)}>Cancel</button>
          </div>
        </div>
      )}

    {open === 'amend' && (
        <div className="mt-3">
      <textarea className="w-full input-neon p-2 mb-2" placeholder="Describe the change" id="qa_amend" />
          <div className="flex gap-2">
            <button className="bg-warn text-black rounded-lg px-3 py-1" onClick={async () => {
              const description = (document.getElementById('qa_amend') as HTMLTextAreaElement).value
              if (USE_MOCKS) {
                alert('Draft created (mock):\n\n— Change: ' + description + '\n— Summary: Price adjusted and closing shifted 7 days.')
              } else {
                await fetch('/api/contracts/amend', { method: 'POST', body: JSON.stringify({ clientId, description }) })
              }
              setOpen(null)
            }}>Create Draft</button>
            <button className="text-ink/50" onClick={() => setOpen(null)}>Cancel</button>
          </div>
        </div>
      )}
    </section>
  )
}
