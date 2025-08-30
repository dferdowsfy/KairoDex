"use client"
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { useUI } from '@/store/ui'

export default function AddClientModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: (id: string) => void }) {
  const { pushToast, setSelectedClientId } = useUI()
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)

  // Ensure the modal appears at the top and the viewport is scrolled to top on open
  useEffect(() => {
    if (open) {
      try {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } catch {}
    }
  }, [open])

  if (!open) return null

  const submit = async () => {
    if (!name.trim() && !email.trim() && !phone.trim()) {
      pushToast({ type: 'info', message: 'Enter at least a name, email, or phone.' })
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/clients/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim() })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to add')
      const id = json.id as string
  setSelectedClientId(id)
  qc.invalidateQueries({ queryKey: ['clients'] })
      pushToast({ type: 'success', message: 'Client added.' })
      onCreated?.(id)
      onClose()
    } catch (e: any) {
      pushToast({ type: 'error', message: e?.message || 'Add failed' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 sm:p-6 overflow-y-auto">
      <div className="w-full sm:max-w-md rounded-2xl bg-white text-slate-900 shadow-lg mt-2 sm:mt-6">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="font-semibold">Add Client</div>
          <button onClick={onClose} className="text-slate-500" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-sm text-slate-600 mb-1">Name</label>
            <input value={name} onChange={e=>setName(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2" placeholder="e.g., Alex Rivera" />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Email</label>
            <input value={email} onChange={e=>setEmail(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2" placeholder="alex@example.com" />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Phone</label>
            <input value={phone} onChange={e=>setPhone(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2" placeholder="(555) 123-4567" />
          </div>
        </div>
        <div className="p-4 border-t flex gap-2 justify-end">
          <button onClick={onClose} className="rounded-xl px-4 py-2 border border-slate-300">Cancel</button>
          <button onClick={submit} disabled={loading} className="rounded-xl px-4 py-2 bg-slate-900 text-white disabled:opacity-60">{loading ? 'Adding…' : 'Add'}</button>
        </div>
      </div>
    </div>
  )
}
