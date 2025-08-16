"use client"
export const dynamic = 'force-dynamic'
import { useTasks } from '@/hooks/useTasks'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import WheelDateTime from '@/components/WheelDateTime'

export default function TasksPage() {
  const { data, complete, snooze } = useTasks()
  const now = new Date()
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [due, setDue] = useState<Date | null>(null)
  const [reminder, setReminder] = useState('')

  const overdue = (t: any) => t.due_at && new Date(t.due_at) < now && t.status !== 'done'
  const dueSoon = (t: any) => t.due_at && new Date(t.due_at).getTime() - now.getTime() < 1000 * 60 * 60 * 24 && !overdue(t) && t.status !== 'done'
  const colorBar = (t: any) => overdue(t) ? 'bg-warn' : (dueSoon(t) ? 'bg-primary' : 'bg-accent')

  return (
    <main className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Tasks</h1>
        <button aria-label="Add task" className="flex items-center gap-1 rounded-lg bg-primary text-white px-3 py-1.5 shadow-sm active:scale-[0.98]" onClick={() => setAdding(v => !v)}>
          <Plus className="h-4 w-4" /> <span className="text-sm">Add</span>
        </button>
      </div>

      {adding && (
        <div className="mb-4 bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
          <div className="flex flex-col gap-3">
            <input
              className="h-10 rounded border border-slate-300 px-3 text-sm"
              placeholder="Task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div>
              <div className="text-xs text-slate-600 mb-1">Date & time</div>
              <WheelDateTime value={due ?? undefined} onChange={setDue} />
            </div>
            <div>
              <div className="text-xs text-slate-600 mb-1">Reminder text</div>
              <input
                className="h-10 w-full rounded border border-slate-300 px-3 text-sm"
                placeholder="What should we remind you to do?"
                value={reminder}
                onChange={(e) => setReminder(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <SaveButton title={title} due={due ?? undefined} reminder={reminder} onSaved={() => { setAdding(false); setTitle(''); setDue(null); setReminder('') }} />
              <button className="h-10 px-4 rounded border border-slate-300 text-slate-700 text-sm" onClick={() => { setAdding(false); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
  <ul className="space-y-2">
        {data?.map(t => (
      <li key={t.id} className={`relative rounded-xl p-3 border shadow-sm ${overdue(t) ? 'border-warn bg-warnSoft' : dueSoon(t) ? 'border-primary bg-primarySoft' : 'border-accent bg-accentSoft'}`}>
            <span className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${colorBar(t)}`}></span>
            <div className="font-medium text-slate-900">{t.title}</div>
            <div className="text-xs text-slate-600 mt-0.5">
        <span className={`inline-block px-2 py-0.5 rounded-full ${overdue(t) ? 'bg-warnSoft text-warn' : dueSoon(t) ? 'bg-primarySoft text-primary' : 'bg-accentSoft text-accent'}`}>
                {t.due_at ? new Date(t.due_at).toLocaleString() : 'No due'}
              </span>
            </div>
            <div className="mt-2 flex gap-2">
    {t.status !== 'done' && <button className="bg-accent hover:opacity-90 text-white rounded-lg px-3 py-1.5 shadow-sm" onClick={() => complete.mutate(t.id)}>Complete</button>}
        {t.status !== 'done' && <button className="bg-white text-slate-700 border border-slate-300 rounded-lg px-3 py-1.5 hover:bg-slate-50" onClick={() => snooze.mutate({ id: t.id, minutes: 60 })}>Snooze 1h</button>}
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}

function SaveButton({ title, due, reminder, onSaved }: { title: string; due?: Date; reminder?: string; onSaved: () => void }) {
  const { create } = useTasks()
  const disabled = !title.trim()
  const handle = async () => {
    let due_at: string | undefined
    if (due) {
      const tzFixed = new Date(due.getTime() - due.getTimezoneOffset() * 60000)
      due_at = tzFixed.toISOString()
    }
    const combinedTitle = `${title.trim()}${reminder && reminder.trim() ? ' — ' + reminder.trim() : ''}`
    await create.mutateAsync({ title: combinedTitle, status: 'open', due_at })
    onSaved()
  }
  return (
    <button disabled={disabled} onClick={handle} className={`h-10 px-4 rounded text-sm text-white shadow-sm ${disabled ? 'bg-slate-300' : 'bg-accent hover:opacity-90'}`}>
      Save task
    </button>
  )
}
