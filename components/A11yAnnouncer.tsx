"use client"
import { useEffect, useRef } from 'react'
import { useUI } from '@/store/ui'

export default function A11yAnnouncer() {
  const { chatOpen } = useUI()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.textContent = chatOpen ? 'Chat opened' : 'Chat closed'
    const t = setTimeout(() => { if (el) el.textContent = '' }, 1000)
    return () => clearTimeout(t)
  }, [chatOpen])

  return (
    <div
      ref={ref}
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  )
}
