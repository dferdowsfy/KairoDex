"use client"
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  chatOpen: boolean
  setChatOpen: (v: boolean) => void
  selectedClientId?: string | null
  setSelectedClientId: (id: string | null) => void
  toast?: { id: string; message: string; type?: 'success'|'error'|'info' }
  pushToast: (t: { message: string; type?: 'success'|'error'|'info' }) => void
  popToast: () => void
}

export const useUI = create<UIState>()(
  persist(
    (set) => ({
      chatOpen: false,
      setChatOpen: (v) => set({ chatOpen: v }),
      selectedClientId: null,
      setSelectedClientId: (id) => set({ selectedClientId: id }),
      pushToast: (t) => set({ toast: { id: Math.random().toString(36).slice(2), ...t } }),
      popToast: () => set({ toast: undefined })
    }),
    {
      name: 'ui-store',
      partialize: (state) => ({ selectedClientId: state.selectedClientId })
    }
  )
)
