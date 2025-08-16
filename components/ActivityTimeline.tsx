"use client"
import type { Event } from '@/lib/types'
import { MessageSquare, StickyNote, FileText, CheckSquare, Workflow } from 'lucide-react'

const iconFor: Record<Event['type'], any> = {
  message: MessageSquare,
  note: StickyNote,
  document: FileText,
  task: CheckSquare,
  status: Workflow
}

export default function ActivityTimeline({ events }: { events: Event[] }) {
  return (
    <section className="">
      <div className="font-semibold mb-2 text-slate-900">Activity</div>
      <ul className="space-y-2 text-sm">
        {events.map(e => {
          const Icon = iconFor[e.type]
          return (
            <li key={e.id} className="bg-white rounded-lg p-2 border border-slate-200 flex items-start gap-3">
              <div className="mt-0.5 text-primary"><Icon className="h-4 w-4" /></div>
              <div>
                <div className="text-xs text-slate-500">{new Date(e.created_at).toLocaleString()}</div>
                <div className="capitalize text-slate-800">{e.type}</div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
