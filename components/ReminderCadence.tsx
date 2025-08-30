"use client"
import { useState } from 'react'
import { useTasks } from '@/hooks/useTasks'
import { useUI } from '@/store/ui'

const presets = [
  { label: '3 days', minutes: 3 * 24 * 60 },
  { label: '7 days', minutes: 7 * 24 * 60 },
  { label: '14 days', minutes: 14 * 24 * 60 },
]

export default function ReminderCadence({ clientId, onDone, onCancel }: { clientId?: string; onDone?: () => void; onCancel?: () => void }) {
  const { create } = useTasks(clientId)
  const { pushToast } = useUI()
  const [saving, setSaving] = useState(false)

  async function setReminder(minutes: number) {
    setSaving(true)
    try {
      const due = new Date(Date.now() + minutes * 60_000).toISOString().slice(0, 16)
      await create.mutateAsync({ client_id: clientId, title: `Reminder follow-up (${minutes}m)`, due_at: due, status: 'open' as any })
  pushToast({ type: 'success', message: 'Your reminder has been added.' })
      onDone?.()
    } catch (e: any) {
      pushToast({ type: 'error', message: e?.message || 'Failed to schedule reminder' })
    } finally { setSaving(false) }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="font-semibold text-slate-900 mb-2">Set Reminder</div>
      <div className="flex gap-2 flex-wrap">
        {presets.map(p => (
          <button key={p.minutes} disabled={saving} onClick={()=>setReminder(p.minutes)} className="inline-flex items-center rounded-xl border border-slate-300 text-slate-700 px-4 py-2 min-h-[44px] bg-white hover:bg-slate-50">
            {p.label}
          </button>
        ))}
      </div>
      <div className="mt-3">
        <button onClick={onCancel} className="inline-flex items-center rounded-xl border border-slate-300 text-slate-700 px-4 py-2 min-h-[44px] bg-white">Close</button>
      </div>
    </div>
  )
}
