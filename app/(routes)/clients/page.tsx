"use client"
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { useClients } from '@/hooks/useClients'
import Link from 'next/link'

export default function ClientsPage() {
  const [search, setSearch] = useState('')
  const [stage, setStage] = useState<'all' | any>('all')
  const { data, isLoading } = useClients({ search, stage })

  return (
    <main className="p-4">
      <h1 className="text-xl font-semibold mb-3 text-slate-900">Clients</h1>
      <div className="bg-white rounded-2xl border border-slate-200 p-3 mb-3 grid grid-cols-2 gap-2">
        <input aria-label="Search" placeholder="Search name" className="bg-white text-slate-800 placeholder:text-slate-400 border border-slate-300 rounded-lg px-2 py-1" value={search} onChange={e => setSearch(e.target.value)} />
        <select aria-label="Stage" className="bg-white text-slate-800 border border-slate-300 rounded-lg px-2 py-1" value={stage} onChange={e => setStage(e.target.value)}>
          <option value="all">All Stages</option>
          <option value="new">New</option>
          <option value="nurture">Nurture</option>
          <option value="touring">Touring</option>
          <option value="offer">Offer</option>
          <option value="under_contract">Under Contract</option>
          <option value="closed">Closed</option>
          <option value="lost">Lost</option>
        </select>
      </div>
      {isLoading && <div>Loading…</div>}
      <ul className="space-y-2">
        {data?.map(c => (
          <li key={c.id} className="bg-white rounded-xl p-3 border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow transition-all">
            <Link href={`/clients/${c.id}`} className="block">
              <div className="font-medium text-slate-900">{c.name}</div>
              <div className="mt-1 text-xs">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primarySoft text-primary capitalize">{c.stage.replace('_',' ')}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
