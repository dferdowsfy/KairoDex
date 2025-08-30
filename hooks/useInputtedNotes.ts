"use client"
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export type InputtedNote = { id: string; text: string; user_id: string; created_at: string }

export function useInputtedNotes(clientId?: string) {
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['inputted_notes', clientId || 'none'],
    queryFn: async () => {
      if (!clientId) return [] as InputtedNote[]
      const res = await fetch(`/api/notes/submit?clientId=${encodeURIComponent(clientId)}`)
      const j = await res.json()
      if (!res.ok) throw new Error(j?.error || 'Failed to load')
      return (j.items || []) as InputtedNote[]
    },
    enabled: !!clientId,
  })

  const add = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch('/api/notes/submit', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ clientId, text }) })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.error || 'Failed to add')
      return j.item as InputtedNote
    },
    onMutate: async (text) => {
      const key = ['inputted_notes', clientId || 'none']
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<InputtedNote[]>(key)
      const optimistic: InputtedNote = { id: `tmp_${Date.now()}`, text, user_id: 'me', created_at: new Date().toISOString() }
      if (prev) qc.setQueryData(key, [optimistic, ...prev])
      return { prev }
    },
    onError: (_e, _v, ctx) => { const key = ['inputted_notes', clientId || 'none']; if (ctx?.prev) qc.setQueryData(key, ctx.prev) },
    onSettled: () => qc.invalidateQueries({ queryKey: ['inputted_notes'] })
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const url = `/api/notes/submit?clientId=${encodeURIComponent(clientId||'')}&id=${encodeURIComponent(id)}`
      const res = await fetch(url, { method: 'DELETE' })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.error || 'Failed to delete')
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['inputted_notes'] })
  })

  return { ...q, add, remove }
}
