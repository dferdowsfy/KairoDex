"use client"
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  chatOpen: boolean
  setChatOpen: (v: boolean) => void
  selectedClientId?: string | null
  setSelectedClientId: (id: string | null) => void
  // Chat compose helpers
  chatPrefill?: { text?: string; tone?: 'professional'|'friendly'|'casual' }
  setChatPrefill: (p?: { text?: string; tone?: 'professional'|'friendly'|'casual' }) => void
  toast?: { id: string; message: string; type?: 'success'|'error'|'info' }
  pushToast: (t: { message: string; type?: 'success'|'error'|'info' }) => void
  popToast: () => void
  followIncludeIds: string[]
  setFollowIncludeIds: (ids: string[]) => void
  toggleFollowIncludeId: (id: string) => void
}

export const useUI = create<UIState>()(
  persist(
    (set) => ({
      chatOpen: false,
      setChatOpen: (v) => set({ chatOpen: v }),
  chatPrefill: undefined,
  setChatPrefill: (p) => set({ chatPrefill: p }),
      selectedClientId: null,
      setSelectedClientId: (id) => set({ selectedClientId: id }),
      pushToast: (t) => set({ toast: { id: Math.random().toString(36).slice(2), ...t } }),
  popToast: () => set({ toast: undefined }),
  followIncludeIds: [],
  setFollowIncludeIds: (ids) => set({ followIncludeIds: ids }),
  toggleFollowIncludeId: (id) => set((s)=> ({ followIncludeIds: s.followIncludeIds.includes(id)? s.followIncludeIds.filter(x=>x!==id): [...s.followIncludeIds, id] }))
    }),
    {
      name: 'ui-store',
  partialize: (state) => ({ selectedClientId: state.selectedClientId })
    }
  )
)
