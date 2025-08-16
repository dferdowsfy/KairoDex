"use client"
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseBrowser'
import { USE_MOCKS } from '@/lib/config'
import { mockDb } from '@/lib/mocks'
import type { Event } from '@/lib/types'

export function useEvents(clientId: string) {
  return useQuery({
    queryKey: ['events', clientId],
    queryFn: async () => {
      if (USE_MOCKS) return mockDb.listEvents(clientId)
      const { data, error } = await supabase.from('events').select('*').eq('client_id', clientId).order('created_at', { ascending: false })
      if (error) throw error
      return data as Event[]
    },
    enabled: !!clientId
  })
}
