"use client"
import { useUI } from '@/store/ui'
import { useEffect } from 'react'

export default function Toast() {
  const { toast, popToast } = useUI()
  useEffect(() => { if (toast) { const t = setTimeout(popToast, 2500); return () => clearTimeout(t) } }, [toast, popToast])
  if (!toast) return null
  return (
    <div role="status" className="fixed bottom-24 left-1/2 -translate-x-1/2 glass rounded-xl px-4 py-2 text-sm">
      {toast.message}
    </div>
  )
}
