"use client"
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseBrowser'
import { useSessionUser } from './useSessionUser'

export interface EmailJob {
  id: string
  user_id: string
  client_id: string
  subject: string
  body_html?: string
  body_text?: string
  noteitem_ids?: string[]
  send_at: string
  status: 'scheduled'|'sent'|'failed'
  created_at: string
}

export function useEmailJobs(clientId?: string) {
  const { user } = useSessionUser()
  return useQuery({
    queryKey: ['email_jobs', clientId || 'all', user?.id || 'nouser'],
    enabled: !!user?.id && !!clientId,
    queryFn: async () => {
      if (!user?.id || !clientId) return [] as EmailJob[]
      const { data, error } = await supabase
        .from('email_jobs')
        .select('*')
        .eq('client_id', clientId)
        .order('send_at', { ascending: true })
      if (error) throw error
      return (data || []) as EmailJob[]
    }
  })
}
