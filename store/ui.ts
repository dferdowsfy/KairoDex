"use client"
import { create } from 'zustand'

interface UIState {
  chatOpen: boolean
  setChatOpen: (v: boolean) => void
  toast?: { id: string; message: string; type?: 'success'|'error'|'info' }
  pushToast: (t: { message: string; type?: 'success'|'error'|'info' }) => void
  popToast: () => void
}

export const useUI = create<UIState>((set) => ({
  chatOpen: false,
  setChatOpen: (v) => set({ chatOpen: v }),
  pushToast: (t) => set({ toast: { id: Math.random().toString(36).slice(2), ...t } }),
  popToast: () => set({ toast: undefined })
}))
