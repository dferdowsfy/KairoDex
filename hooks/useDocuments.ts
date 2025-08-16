"use client"
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { USE_MOCKS } from '@/lib/config'
import { mockDb } from '@/lib/mocks'
import { supabase } from '@/lib/supabaseBrowser'
import type { Document } from '@/lib/types'

export function useDocuments(params?: { status?: 'draft'|'final'; clientId?: string }) {
  return useQuery({
    queryKey: ['documents', params?.status ?? 'all', params?.clientId ?? 'all'],
    queryFn: async () => {
      if (USE_MOCKS) return mockDb.listDocuments(params)
      let q = supabase.from('documents').select('*').order('created_at', { ascending: false })
      if (params?.status) q = q.eq('status', params.status)
      if (params?.clientId) q = q.eq('client_id', params.clientId)
      const { data, error } = await q
      if (error) throw error
      return data as Document[]
    }
  })
}

export function useAmendDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, command, clientId }: { id: string; command: string; clientId?: string }) => {
      if (USE_MOCKS) return mockDb.amendDocument(id, command)
      const res = await fetch('/api/contracts/amend', { method: 'POST', body: JSON.stringify({ clientId, description: command }) })
      if (!res.ok) throw new Error('Failed to amend')
      return await res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] })
  })
}
