"use client"
import { useEffect, useState } from 'react'
import AdminUserRow from './AdminUserRow'

export default function AdminUserList() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed')
      setUsers(json.users || [])
    } catch (err: any) {
      alert(err?.message || 'Failed to load users')
    } finally { setLoading(false) }
  }

  useEffect(()=>{ load() }, [])

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <button onClick={load} className="rounded-xl px-3 py-1 border">Refresh</button>
      </div>
      {loading ? <div>Loading…</div> : (
        <div className="overflow-auto border rounded">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="p-2">Email</th>
                <th className="p-2">Phone</th>
                <th className="p-2">Created</th>
                <th className="p-2">Role</th>
                <th className="p-2">Disabled</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => <AdminUserRow key={u.id} user={u} onUpdated={(nu:any)=>{ setUsers(prev=>prev.map(p=>p.id===nu.id?nu:p)) }} onDeleted={(id:any)=>setUsers(prev=>prev.filter(p=>p.id!==id))} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
