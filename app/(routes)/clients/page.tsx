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
    <main className="min-h-screen p-4" style={{ background: 'var(--page-bg)' }}>
      <h1 className="sf-display h2 mb-3 text-white">Clients</h1>
      <div className="panel-glass rounded-apple p-3 mb-3 grid grid-cols-2 gap-2">
        <input aria-label="Search" placeholder="Search name" className="input-neon h-10 px-3 placeholder:text-slate-500" value={search} onChange={e => setSearch(e.target.value)} />
        <select aria-label="Stage" className="input-neon h-10 px-3" value={stage} onChange={e => setStage(e.target.value)}>
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
          <li key={c.id} className="panel-glass rounded-apple p-3 border border-white/10 hover:shadow-md transition-all row-pill">
            <Link href={`/clients/${c.id}`} className="block">
              <div className="font-medium text-white">{c.name}</div>
              <div className="mt-1 text-xs">
                <span className={`badge capitalize ${c.stage==='new' ? 'badge-green' : c.stage==='under_contract' ? 'badge-yellow' : /closed|lost/.test(c.stage) ? 'badge-red' : 'badge-blue'}`}>{c.stage.replace('_',' ')}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
