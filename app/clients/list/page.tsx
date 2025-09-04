"use client"
import React from 'react'
import Link from 'next/link'
import { useClients } from '@/hooks/useClients'
import AddClientButton from '@/components/AddClientButton'

export default function ClientsListPage() {
  const { data: clients = [] } = useClients()

  return (
    <div className="max-w-6xl mx-auto px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Clients</h1>
        <AddClientButton />
      </div>
      <div className="grid gap-3">
        {clients.length === 0 && <div className="text-sm text-muted">No clients</div>}
        {clients.map(c => (
          <ClientCard key={c.id} client={c} />
        ))}
      </div>
    </div>
  )
}

function ClientCard({ client }: { client: any }) {
  const [editing, setEditing] = React.useState(false)
  const [email, setEmail] = React.useState(client.email || '')
  const [phone, setPhone] = React.useState(client.phone || '')
  const [budget, setBudget] = React.useState((client as any).budget || '')
  const [loading, setLoading] = React.useState(false)

  async function save() {
    setLoading(true)
    try {
      const res = await fetch('/api/clients', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: client.id, email, phone, budget }) })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Save failed')
      setEditing(false)
    } catch (err:any) {
      alert(err?.message || 'Save failed')
    } finally { setLoading(false) }
  }

  function fmtPhone(digits: string | undefined) {
    if (!digits) return null
    const d = String(digits).replace(/\D/g, '')
    if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`
    return digits
  }
  function fmtBudget(b: any) {
    if (b === undefined || b === null || b === '') return null
    const n = Number(b)
    if (Number.isNaN(n)) return String(b)
    return n.toLocaleString()
  }

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-medium">{client.name}</div>
          <div className="text-sm text-slate-500">
            {editing ? (
              <input value={email} onChange={e=>setEmail(e.target.value)} className="rounded-md border px-2 py-1" />
            ) : (
              email ? <a href={`mailto:${email}`} className="text-sm text-slate-500 underline">{email}</a> : <span className="text-sm text-slate-400">No email</span>
            )}
          </div>
        </div>
        <div className="text-sm text-slate-500">
          {editing ? (
            <input value={phone} onChange={e=>setPhone(e.target.value)} className="rounded-md border px-2 py-1" />
          ) : (
            phone ? <a href={`tel:${phone}`} className="text-sm text-slate-500">{fmtPhone(phone)}</a> : <span className="text-sm text-slate-400">No phone</span>
          )}
        </div>
      </div>
      <div className="mt-2 text-sm text-slate-600">
        {Array.isArray((client as any).Notes_Inputted) ? (client as any).Notes_Inputted.map((n:any,i:number)=>(<div key={i} className="truncate">{n.text}</div>)) : ((client as any).Notes_Inputted || null)}
      </div>
      <div className="mt-3 flex gap-2 items-center">
        <Link href={`/clients/${client.id}`} className="rounded-md px-3 py-1 border">Open</Link>
        {editing ? (
          <>
            <input value={budget} onChange={e=>setBudget(e.target.value)} placeholder="$" className="rounded-md border px-2 py-1" />
            <button onClick={save} disabled={loading} className="rounded-md px-3 py-1 border bg-slate-900 text-white">{loading ? 'Saving…' : 'Save'}</button>
            <button onClick={()=>setEditing(false)} className="rounded-md px-3 py-1 border">Cancel</button>
          </>
        ) : (
          <>
            <button onClick={()=>setEditing(true)} className="rounded-md px-3 py-1 border">Edit</button>
            {budget ? <div className="text-sm text-slate-500 ml-auto">${fmtBudget(budget)}</div> : null}
          </>
        )}
      </div>
    </div>
  )
}
