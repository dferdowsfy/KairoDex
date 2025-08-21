"use client"
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { USE_MOCKS, USE_SHEET } from '@/lib/config'
import { mockDb } from '@/lib/mocks'
import type { Client, Stage } from '@/lib/types'


import { supabase } from '@/lib/supabaseBrowser'

export function useClient(id: string) {
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      if (USE_MOCKS) return mockDb.getClient(id)
      const { data, error } = await supabase.from('AgentHub_DB').select('*').eq('client_id', id).maybeSingle()
      if (error) throw error
      const r = (data || {}) as any
      const fullName = [r.name_first, r.name_last].filter(Boolean).join(' ').trim()
      const client: Client = {
        id: r?.client_id || id,
        agent_id: r?.agent_owner_user_id || 'agent',
        name: fullName || r?.email || 'Client',
        email: r?.email || undefined,
        phone: r?.phone || undefined,
        stage: (r?.stage as Stage) || 'new',
        created_at: r?.created_at || new Date().toISOString()
      }
      return client
    },
    enabled: !!id,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: 'always',
    refetchOnMount: 'always',
    placeholderData: undefined,
    retry: 1,
  })

  const updateStage = useMutation({
    mutationFn: async (stage: Stage) => {
      if (USE_MOCKS) return mockDb.updateClientStage(id, stage)
  const { error } = await supabase.from('AgentHub_DB').update({ stage }).eq('client_id', id)
      if (error) throw error
    },
    onMutate: async (stage) => {
      await qc.cancelQueries({ queryKey: ['client', id] })
      const prev = qc.getQueryData<Client>(['client', id])
      if (prev) qc.setQueryData(['client', id], { ...prev, stage })
      return { prev }
    },
    onError: (_err, _vars, ctx) => { if (ctx?.prev) qc.setQueryData(['client', id], ctx.prev) },
    onSettled: () => { qc.invalidateQueries({ queryKey: ['client', id] }); qc.invalidateQueries({ queryKey: ['clients'] }) }
  })

  return { ...q, updateStage }
}
