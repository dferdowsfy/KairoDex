"use client"
import React, { useState, forwardRef, useImperativeHandle } from 'react'
import { useTasks } from '@/hooks/useTasks'
import { useUI } from '@/store/ui'
import WheelDateTime from '@/components/WheelDateTime'

export interface QuickTaskFormHandle { save: () => Promise<void>; isSaving: () => boolean }

interface Props { clientId?: string; onCreated?: () => void; onCancel?: () => void; hideInternalActions?: boolean }

const QuickTaskForm = forwardRef<QuickTaskFormHandle, Props>(function QuickTaskForm({ clientId, onCreated, onCancel, hideInternalActions }, ref) {
  const { create } = useTasks(clientId)
  const { pushToast } = useUI()
  const [title, setTitle] = useState('')
  const [due, setDue] = useState<Date | null>(null)
  const [saving, setSaving] = useState(false)

  async function save() {
    if (saving) return
    const t = title.trim()
    if (!t) { pushToast({ type: 'info', message: 'Enter a task title.' }); return }
    setSaving(true)
    try {
      let due_at: string | undefined
      if (due) {
        const tzFixed = new Date(due.getTime() - due.getTimezoneOffset() * 60000)
        due_at = tzFixed.toISOString()
      }
      await create.mutateAsync({ client_id: clientId, title: t, due_at, status: 'open' as any })
      pushToast({ type: 'success', message: 'Task created.' })
      onCreated?.()
      setTitle('')
      setDue(null)
    } catch (e: any) {
      pushToast({ type: 'error', message: e?.message || 'Failed to create task' })
    } finally { setSaving(false) }
  }

  useImperativeHandle(ref, () => ({ save, isSaving: () => saving }))

  return (
    <form onSubmit={(e)=>{ e.preventDefault(); save() }} className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="font-semibold text-slate-900 mb-3">New Task</div>
      <input
        value={title}
        onChange={(e)=>setTitle(e.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white text-slate-900 px-3 py-3 placeholder-slate-400 text-base mb-4"
        placeholder="Task title"
      />
      <div className="w-full">
        <WheelDateTime value={due ?? undefined} onChange={d=>setDue(d)} />
      </div>
      {!hideInternalActions && (
        <div className="mt-3 flex gap-2">
          <button type="submit" disabled={saving} className="inline-flex items-center rounded-xl bg-slate-900 text-white px-4 py-2 min-h-[44px]">{saving? 'Saving…':'Save'}</button>
          <button onClick={onCancel} className="inline-flex items-center rounded-xl border border-slate-300 text-slate-700 px-4 py-2 min-h-[44px] bg-white">Cancel</button>
        </div>
      )}
    </form>
  )
})

export default QuickTaskForm

