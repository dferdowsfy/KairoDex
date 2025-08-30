"use client"
import Link from 'next/link'
import { useClients } from '@/hooks/useClients'
import { useUI } from '@/store/ui'

export default function RecentClientsList() {
  const { data: clients = [] } = useClients()
  const { setSelectedClientId } = useUI()
  const recent = clients.slice(0, 6)
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold text-slate-900">Recent Clients</div>
        <Link href="/clients" className="text-sm text-sky-600">View all</Link>
      </div>
      <ul className="divide-y divide-slate-100">
        {recent.map(c => (
          <li key={c.id}>
            <Link href={`/clients/${c.id}`} onClick={()=>setSelectedClientId(c.id)} className="flex items-center justify-between py-2 hover:bg-slate-50 px-2 rounded-lg">
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-900 truncate">{c.name}</div>
                {c.email && <div className="text-xs text-slate-500 truncate">{c.email}</div>}
              </div>
              <div className="text-xs capitalize text-slate-600">{c.stage.replace('_',' ')}</div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
