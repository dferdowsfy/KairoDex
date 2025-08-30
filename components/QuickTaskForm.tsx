"use client"
import { useState } from 'react'
import { useTasks } from '@/hooks/useTasks'
import { useUI } from '@/store/ui'

export default function QuickTaskForm({ clientId, onCreated, onCancel }: { clientId?: string; onCreated?: () => void; onCancel?: () => void }) {
  const { create } = useTasks(clientId)
  const { pushToast } = useUI()
  const [title, setTitle] = useState('')
  const [due, setDue] = useState<string>('')
  const [saving, setSaving] = useState(false)

  async function save() {
    const t = title.trim()
    if (!t) { pushToast({ type: 'info', message: 'Enter a task title.' }); return }
    setSaving(true)
    try {
      await create.mutateAsync({ client_id: clientId, title: t, due_at: due || undefined, status: 'open' as any })
      pushToast({ type: 'success', message: 'Task created.' })
      onCreated?.()
      setTitle('')
      setDue('')
    } catch (e: any) {
      pushToast({ type: 'error', message: e?.message || 'Failed to create task' })
    } finally { setSaving(false) }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="font-semibold text-slate-900 mb-2">New Task</div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
          value={title}
          onChange={(e)=>setTitle(e.target.value)}
          className="sm:col-span-2 w-full rounded-xl border border-slate-300 bg-white text-slate-900 px-3 py-2 placeholder-slate-400"
          placeholder="Task title"
        />
        <input
          type="datetime-local"
          value={due}
          onChange={(e)=>setDue(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white text-slate-900 px-3 py-2"
        />
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={save} disabled={saving} className="inline-flex items-center rounded-xl bg-slate-900 text-white px-4 py-2 min-h-[44px]">Save</button>
        <button onClick={onCancel} className="inline-flex items-center rounded-xl border border-slate-300 text-slate-700 px-4 py-2 min-h-[44px] bg-white">Cancel</button>
      </div>
    </div>
  )
}
