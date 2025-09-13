"use client"
import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footerActions?: React.ReactNode
  originPoint?: { x: number; y: number } | null
}

// Reusable centered modal with responsive full-screen mobile layout
export default function Modal({ isOpen, onClose, title, children, footerActions, originPoint }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const mountRef = useRef<HTMLElement | null>(null)
  const [mounted, setMounted] = useState(false)

  // Create portal container on mount
  useEffect(() => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    mountRef.current = el
    setMounted(true)
    return () => {
      if (el.parentNode) el.parentNode.removeChild(el)
      mountRef.current = null
    }
  }, [])

  // Close on ESC
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // Prevent background scroll when open
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [isOpen])

  // When an originPoint is provided, compute transform-origin relative to the modal box
  useEffect(() => {
    if (!isOpen || !originPoint || !panelRef.current) return
    try {
      const rect = panelRef.current.getBoundingClientRect()
      const originX = Math.max(0, Math.min(rect.width, originPoint.x - rect.left))
      const originY = Math.max(0, Math.min(rect.height, originPoint.y - rect.top))
      panelRef.current.style.transformOrigin = `${originX}px ${originY}px`
    } catch (e) {
      // ignore
    }
  }, [isOpen, originPoint])

  if (!isOpen || !mounted || !mountRef.current) return null

  const jsx = (
    <div className="fixed inset-0 z-[200]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-fadeIn" onClick={onClose} aria-hidden />
      {/* Mobile: full-screen; >= sm: centered panel */}
      <div ref={dialogRef}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed inset-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 w-full h-full sm:h-auto sm:w-full sm:max-w-5xl bg-white rounded-none sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-screen sm:max-h-[85vh] overflow-hidden animate-scaleIn"
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4 bg-gradient-to-b from-white to-slate-50">
          <h2 className="font-semibold text-xl md:text-2xl text-slate-900 tracking-tight">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400/40" aria-label="Close modal">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 bg-white">
          {children}
        </div>
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap gap-3 justify-end">
          {footerActions}
        </div>
      </div>
  </div>
      <style jsx global>{`
        @keyframes modal-fade-in { from { opacity: 0 } to { opacity: 1 } }
        /* subtle scale from origin; avoid translate from corner */
        @keyframes modal-scale-in { from { opacity:0; transform: scale(.98) } to { opacity:1; transform: scale(1) } }
        .animate-fadeIn { animation: modal-fade-in .18s ease-out; }
        .animate-scaleIn { animation: modal-scale-in .22s cubic-bezier(.16,.66,.4,1); }
      `}</style>
    </div>
  )

  return createPortal(jsx, mountRef.current)
}
