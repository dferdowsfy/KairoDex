"use client"
import { useInputtedNotes } from '@/hooks/useInputtedNotes'
import { Trash2 } from 'lucide-react'

export default function NotesHistory({ clientId }: { clientId?: string }) {
  const { data: items = [], isLoading, add, remove } = useInputtedNotes(clientId)
  if (!clientId) return null
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
      <div className="flex items-center gap-2">
        <div className="font-semibold text-slate-900">Notes History</div>
        <span className="text-xs text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">{items.length}</span>
        <div className="ml-auto text-xs text-slate-500">{isLoading? 'Loading…' : null}</div>
      </div>
      {!items.length && <div className="text-sm text-slate-600">No notes yet.</div>}
      <ul className="space-y-2">
        {items.map(it => (
          <li key={it.id} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs text-slate-500 w-28 shrink-0">{new Date(it.created_at).toLocaleString()}</div>
            <div className="text-sm text-slate-800 flex-1">
              {/* If the backend provided structured note, render it nicely */}
              {it.structured ? (
                <div className="space-y-2">
                  {it.structured.name && <div className="font-semibold">{it.structured.name}</div>}
                  {it.structured.summary && (
                    <div className="flex gap-2 items-center text-xs">
                      {it.structured.summary.budget && <div className="px-2 py-1 bg-slate-100 rounded-full">Budget: {it.structured.summary.budget}</div>}
                      {it.structured.summary.email && <div className="px-2 py-1 bg-slate-100 rounded-full">{it.structured.summary.email}</div>}
                      {it.structured.summary.phone && <div className="px-2 py-1 bg-slate-100 rounded-full">{it.structured.summary.phone}</div>}
                    </div>
                  )}
                  <div className="mt-1 space-y-1">
                    {it.structured.sections.map((s, idx) => (
                      <div key={idx} className="text-sm">
                        <div className="font-medium text-slate-700">{s.title}</div>
                        <div className="text-slate-700 whitespace-pre-wrap text-sm">{s.content}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{it.text}</div>
              )}
            </div>
            <button aria-label="Delete" title="Delete" className="ml-2 inline-flex items-center gap-1 text-xs text-rose-700 hover:text-rose-900" onClick={()=>remove.mutate(it.id)}>
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </li>
        ))}
      </ul>
      <form className="pt-2" onSubmit={async (e)=>{ e.preventDefault(); const f = e.target as HTMLFormElement; const t = (f.elements.namedItem('note') as HTMLTextAreaElement); const v = t.value.trim(); if (!v) return; await add.mutateAsync(v); t.value=''; }}>
        <textarea name="note" placeholder="Add a quick note…" className="w-full input-neon px-3 py-2" />
        <div className="mt-2 flex justify-end">
          <button type="submit" className="h-9 px-3 rounded bg-slate-900 text-white text-sm">Add</button>
        </div>
      </form>
    </section>
  )
}
