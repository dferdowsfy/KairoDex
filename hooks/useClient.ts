"use client"
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { USE_MOCKS, USE_SHEET } from '@/lib/config'
import { mockDb } from '@/lib/mocks'
import type { Client, Stage } from '@/lib/types'

export function useClient(id: string) {
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      if (USE_MOCKS) return mockDb.getClient(id)
      // Sheet is the source of truth; fetch via server API to avoid client env issues
      const res = await fetch(`/api/sheets/row?id=${encodeURIComponent(id)}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(await res.text())
      const json = await res.json()
      const c = (json.client || {}) as Partial<Client>
      return {
        id: (c.id as string) || id,
        agent_id: (c.agent_id as string) || 'agent',
        name: c.name || 'Client',
        email: c.email,
        phone: c.phone,
        stage: c.stage || 'new',
        preferences: c.preferences,
        created_at: c.created_at || new Date().toISOString()
      } as Client
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
  // No-op: Sheet is the source of truth; future enhancement could write back to a stage column
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
