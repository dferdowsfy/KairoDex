"use client"
import { useUI } from '@/store/ui'
import { useEffect, useState } from 'react'

export default function Toast() {
  const { toast, popToast } = useUI()
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (toast) {
      setVisible(true)
      const t = setTimeout(() => { setVisible(false); setTimeout(popToast, 200) }, 2500)
      return () => clearTimeout(t)
    }
  }, [toast, popToast])
  if (!toast) return null
  const base = 'fixed z-[120] left-1/2 -translate-x-1/2 top-4 px-4 py-2 text-sm rounded-full shadow-lg border transition-all duration-200'
  const subtle = (toast as any).subtle
  const color = subtle
    ? 'bg-white/85 backdrop-blur text-slate-900 border-slate-200'
    : toast.type === 'error'
      ? 'bg-rose-600 text-white border-rose-700'
      : toast.type === 'info'
        ? 'bg-slate-900 text-white border-slate-900'
        : 'bg-emerald-600 text-white border-emerald-700'
  const motion = visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
  return (
    <div role="status" aria-live="polite" className={`${base} ${color} ${motion}`} onClick={()=>{ setVisible(false); setTimeout(popToast, 150) }}>
      {toast.message}
    </div>
  )
}
