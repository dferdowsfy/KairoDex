"use client"
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseBrowser'
import { USE_MOCKS } from '@/lib/config'
import { mockDb } from '@/lib/mocks'
import type { NoteItem } from '@/lib/types'
import { useSessionUser } from './useSessionUser'

export function useNoteItems(clientId?: string) {
  const qc = useQueryClient()
  const { user } = useSessionUser()
  const q = useQuery({
    queryKey: ['note_items', clientId ?? 'none', user?.id ?? 'nouser'],
    queryFn: async () => {
      if (!clientId || !user?.id) return [] as NoteItem[]
      if (USE_MOCKS) return [] as NoteItem[]
      const { data, error } = await supabase.from('normalized_items').select('*').eq('client_id', clientId).order('date', { ascending: true }).order('created_at', { ascending: false })
      if (error) throw error
      return (data || []) as any as NoteItem[]
    },
    enabled: !!clientId && !!user?.id,
  })

  const upsert = useMutation({
    mutationFn: async (item: Partial<NoteItem>) => {
      if (USE_MOCKS) return item as NoteItem
      if (!user?.id) throw new Error('No user')
      const payload = { ...item, user_id: user.id }
      const { data, error } = await supabase.from('normalized_items').upsert(payload).select('*').single()
      if (error) throw error
      return data as NoteItem
    },
    onMutate: async (item) => {
      const key = ['note_items', clientId ?? 'none', user?.id ?? 'nouser']
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<NoteItem[]>(key)
      if (prev && item) {
        const id = (item.id || `tmp_${Date.now()}`) as string
        const optimistic: NoteItem = {
          id,
          client_id: clientId!,
          user_id: user?.id as string,
          kind: (item.kind as any) || 'general_note',
          title: item.title || '',
          body: item.body,
          party: item.party as any,
          status: item.status as any,
          date: item.date,
          amount: item.amount,
          tags: item.tags,
          source: item.source || 'user_note',
          extra: item.extra,
          created_at: item.created_at || new Date().toISOString(),
          updated_at: item.updated_at || new Date().toISOString(),
        }
        const idx = prev.findIndex(it => it.id === id)
        if (idx >= 0) qc.setQueryData(key, prev.map((it,i)=> i===idx? optimistic: it))
        else qc.setQueryData(key, [optimistic, ...prev])
      }
      return { prev: qc.getQueryData<NoteItem[]>(key) }
    },
    onError: (_e, _v, ctx) => {
      const key = ['note_items', clientId ?? 'none', user?.id ?? 'nouser']
      if (ctx?.prev) qc.setQueryData(key, ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['note_items'] })
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (USE_MOCKS) return
      const { error } = await supabase.from('normalized_items').delete().eq('id', id)
      if (error) throw error
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['note_items'] })
  })

  return { ...q, upsert, remove }
}
