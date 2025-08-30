"use client"
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useUI } from '@/store/ui'

export default function AddClientButton() {
  const { pushToast } = useUI()
  const [loading, setLoading] = useState(false)
  async function add() {
    setLoading(true)
    try {
      // Placeholder: navigate to clients or open modal. For now just toast.
      pushToast({ type: 'info', message: 'Add Client flow coming soon.' })
    } finally { setLoading(false) }
  }
  return (
    <button onClick={add} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-3 min-h-[44px]">
      <Plus className="h-5 w-5"/>
      <span>Add Client</span>
    </button>
  )
}
