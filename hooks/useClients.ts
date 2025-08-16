"use client"
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseBrowser'
import { USE_MOCKS, USE_SHEET } from '@/lib/config'
import { useSessionUser } from './useSessionUser'
import { mockDb } from '@/lib/mocks'
import type { Client, Stage } from '@/lib/types'

export function useClients(params?: { search?: string; stage?: Stage | 'all' }) {
  const { user } = useSessionUser()
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['clients', params?.search ?? '', params?.stage ?? 'all', user?.id ?? 'nouser'],
    queryFn: async () => {
      if (USE_MOCKS) return mockDb.listClients(params)
      
      // Use sheet as primary data source
      const qs = user?.id ? `?userId=${encodeURIComponent(user.id)}` : ''
      const res = await fetch(`/api/clients/from-sheet${qs}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(await res.text())
      const { items } = await res.json()
      let out = items as Client[]
      if (params?.search) out = out.filter(c => c.name.toLowerCase().includes(params.search!.toLowerCase()))
      if (params?.stage && params.stage !== 'all') out = out.filter(c => c.stage === params.stage)
      return out
    },
    enabled: true,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: 'always',
    refetchOnMount: 'always',
    gcTime: 1000 * 60 * 5,
    placeholderData: undefined,
    retry: 1,
  })

  const updateStage = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: Stage }) => {
      if (USE_MOCKS) return mockDb.updateClientStage(id, stage)
      const { error } = await supabase.from('clients').update({ stage }).eq('id', id)
      if (error) throw error
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ['clients'] })
      const prev = qc.getQueryData<Client[]>(['clients', params?.search ?? '', params?.stage ?? 'all'])
      if (prev) qc.setQueryData(['clients', params?.search ?? '', params?.stage ?? 'all'], prev.map(c => c.id === vars.id ? { ...c, stage: vars.stage } : c))
      return { prev }
    },
    onError: (_err, _vars, ctx) => { if (ctx?.prev) qc.setQueryData(['clients', params?.search ?? '', params?.stage ?? 'all'], ctx.prev) },
    onSettled: () => qc.invalidateQueries({ queryKey: ['clients'] })
  })

  return { ...q, updateStage }
}
