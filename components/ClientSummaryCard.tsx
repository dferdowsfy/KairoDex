"use client"
import { useClients } from '@/hooks/useClients'

export default function ClientSummaryCard() {
  const { data: clients = [] } = useClients()
  const total = clients.length
  const active = clients.filter(c => ['touring','offer','under_contract'].includes(c.stage)).length
  const pending = clients.filter(c => c.stage === 'new').length
  const closed = clients.filter(c => c.stage === 'closed').length

  return (
    <button className="w-full rounded-2xl border border-slate-200 bg-white p-5 text-left hover:shadow-md transition-all">
      <div className="text-slate-900 font-semibold mb-1">{total} Clients</div>
      <div className="text-sm text-slate-600">({active} Active, {pending} Pending, {closed} Closed)</div>
    </button>
  )
}
