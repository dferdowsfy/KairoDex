"use client"
import { useState } from 'react'

export default function AdminUserRow({ user, onUpdated, onDeleted }: any) {
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState(user.role || 'user')
  const [disabled, setDisabled] = useState(!!user.disabled)

  async function doUpdate(changes: any) {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: user.id, action: 'update', payload: changes }) })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Update failed')
      onUpdated && onUpdated(json.user || json)
    } catch (err: any) {
      alert(err?.message || 'Failed')
    } finally { setLoading(false) }
  }

  async function doDelete() {
    if (!confirm('Delete user? This cannot be undone.')) return
    setLoading(true)
    try {
      const url = `/api/admin/users?id=${encodeURIComponent(user.id)}`
      const res = await fetch(url, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Delete failed')
      onDeleted && onDeleted(user.id)
    } catch (err: any) {
      alert(err?.message || 'Failed')
    } finally { setLoading(false) }
  }

  return (
    <tr className="border-t">
      <td className="py-3 px-2 text-sm">{user.email || <span className="text-xs text-slate-400">(no email)</span>}</td>
      <td className="py-3 px-2 text-sm">{user.phone || '-'}</td>
      <td className="py-3 px-2 text-sm">{new Date(user.created_at || '').toLocaleString()}</td>
      <td className="py-3 px-2 text-sm">
        <select value={role} onChange={(e)=>{ setRole(e.target.value); doUpdate({ role: e.target.value }) }} disabled={loading} className="rounded-md border px-2 py-1 text-sm">
          <option value="user">user</option>
          <option value="admin">admin</option>
        </select>
      </td>
      <td className="py-3 px-2 text-sm">
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={disabled} onChange={(e)=>{ setDisabled(e.target.checked); doUpdate({ disabled: e.target.checked }) }} disabled={loading} /> Disabled
        </label>
      </td>
      <td className="py-3 px-2 text-sm">
        <button onClick={doDelete} disabled={loading} className="text-sm text-red-600">Delete</button>
      </td>
    </tr>
  )
}
