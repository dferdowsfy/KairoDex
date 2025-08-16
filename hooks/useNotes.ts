"use client"
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseBrowser'
import { USE_MOCKS } from '@/lib/config'
import { mockDb } from '@/lib/mocks'
import type { Note } from '@/lib/types'
import { hasJobs, pushJob } from '@/lib/offlineQueue'

export function useNotes(clientId: string) {
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['notes', clientId],
    queryFn: async () => {
      if (USE_MOCKS) return mockDb.listNotes(clientId)
      const { data, error } = await supabase.from('notes').select('*').eq('client_id', clientId).order('created_at', { ascending: false })
      if (error) throw error
      return data as Note[]
    },
    enabled: !!clientId
  })

  const addNote = useMutation({
    mutationFn: async (body: string) => {
      if (USE_MOCKS) {
        return mockDb.addNote(clientId, body)
      }
      // naive offline attempt
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        pushJob({ type: 'note', payload: { client_id: clientId, body } })
        return { id: `tmp_${Date.now()}`, client_id: clientId, body, created_at: new Date().toISOString() } as Note
      }
      const { data, error } = await supabase.from('notes').insert({ client_id: clientId, body }).select('*').single()
      if (error) throw error
      return data as Note
    },
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: ['notes', clientId] })
      const prev = qc.getQueryData<Note[]>(['notes', clientId])
      const optimistic: Note = { id: `tmp_${Date.now()}`, client_id: clientId, body, created_at: new Date().toISOString(), agent_id: '' as any }
      if (prev) qc.setQueryData(['notes', clientId], [optimistic, ...prev])
      return { prev }
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(['notes', clientId], ctx.prev) },
    onSettled: () => qc.invalidateQueries({ queryKey: ['notes', clientId] })
  })

  return { ...q, addNote }
}

// Recent notes across all clients
export function useRecentNotes(limit = 5) {
  return useQuery({
    queryKey: ['recent_notes', limit],
    queryFn: async () => {
  if (USE_MOCKS) return mockDb.listRecentNotes(limit)
      const { data, error } = await supabase.from('notes').select('*').order('created_at', { ascending: false }).limit(limit)
      if (error) throw error
      return data as Note[]
    }
  })
}
