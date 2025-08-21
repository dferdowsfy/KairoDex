"use client"
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseBrowser'
import { USE_MOCKS, USE_SHEET } from '@/lib/config'
import { useSessionUser } from './useSessionUser'
import { mockDb } from '@/lib/mocks'
import type { Client, Stage } from '@/lib/types'


// ...existing code...

export function useClients(params?: { search?: string; stage?: Stage | 'all' }) {
  const { user } = useSessionUser()
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['clients', params?.search ?? '', params?.stage ?? 'all', user?.email ?? 'nouser'],
    queryFn: async () => {
      if (USE_MOCKS) return mockDb.listClients(params)
      if (!user?.email) return []
      const email = user.email
      // Try strict case-insensitive match first
      let { data, error } = await supabase.from('AgentHub_DB').select('*').ilike('agent_owner_user_id', email)
      if (error) throw error
      let rows = (data ?? []) as any[]
      // Fallback: handle stray whitespace or casing issues by using a pattern match
      if (!rows.length) {
        const pattern = `%${email.trim()}%`
        const res2 = await supabase.from('AgentHub_DB').select('*').ilike('agent_owner_user_id', pattern)
        if (res2.error) throw res2.error
        rows = res2.data ?? []
      }
      // Apply stage filter client-side if necessary when using fallback
      if (params?.stage && params.stage !== 'all') {
        rows = rows.filter(r => r.stage === params.stage)
      }
      
      
      const mapped: Client[] = rows.map(r => {
        const fullName = [r.name_first, r.name_last].filter(Boolean).join(' ').trim()
        return {
          id: r.client_id || r.id || r.email || crypto.randomUUID(),
          agent_id: r.agent_owner_user_id || 'agent',
          name: fullName || r.email || 'Client',
          email: r.email || undefined,
          phone: r.phone || undefined,
          stage: (r.stage as Stage) || 'new',
          created_at: r.created_at || new Date().toISOString(),
        }
      })
      let out = mapped
      if (params?.search) out = out.filter(c => (c.name || '').toLowerCase().includes(params.search!.toLowerCase()))
      return out
    },
    enabled: !!user?.email,
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
  const { error } = await supabase.from('AgentHub_DB').update({ stage }).eq('client_id', id)
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
