"use client"
import { useMemo, useState, useRef, useEffect } from 'react'
import { useClients } from '@/hooks/useClients'
import { useUI } from '@/store/ui'
import { Search, Plus } from 'lucide-react'

export default function ClientSelector({ onAddClient }: { onAddClient?: () => void }) {
  const { data: clients = [] } = useClients()
  const { selectedClientId, setSelectedClientId } = useUI()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!boxRef.current) return
      if (!boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clients
    return clients.filter(c => (c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q))
  }, [clients, query])

  return (
    <div className="w-full" ref={boxRef}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e)=>{ setQuery(e.target.value); setOpen(true) }}
                onFocus={()=>setOpen(true)}
                placeholder="Select Client"
                className="w-full rounded-xl border border-default bg-surface pl-10 pr-3 py-3 text-[25px] outline-none placeholder:text-slate-400"
              />
        </div>
            <button type="button" onClick={onAddClient} className="inline-flex items-center gap-2 rounded-xl bg-white text-primary border border-primary px-4 py-3 min-h-[44px] hover:bg-primarySoft">
          <Plus className="h-5 w-5"/>
          <span className="hidden sm:inline">Add Client</span>
        </button>
      </div>
      {open && (
        <div className="mt-2 max-h-64 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {filtered.length === 0 && <div className="p-3 text-sm text-slate-500">No matches</div>}
          <ul>
            {filtered.slice(0, 12).map(c => (
              <li key={c.id}>
                <button
                  onClick={()=>{ setSelectedClientId(c.id); setQuery(c.name || ''); setOpen(false) }}
                  className={`w-full text-left px-3 py-2 hover:bg-slate-50 ${selectedClientId===c.id?'bg-slate-50':''}`}
                >
                  <div className="font-medium text-slate-900">{c.name}</div>
                  {c.email && <div className="text-xs text-slate-500">{c.email}</div>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
