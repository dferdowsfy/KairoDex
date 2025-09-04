import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect } from 'react'
import { useOrg } from '../hooks/useOrg'

const supabase = createClientComponentClient()

export function useOrgRealtime(onEvent: (payload: any) => void) {
  const { orgId } = useOrg()

  useEffect(() => {
    if (!orgId) return
    const channel = supabase.channel(`org-${orgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', filter: `org_id=eq.${orgId}` }, (payload) => {
        onEvent(payload)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [orgId, onEvent])
}

// Helper to broadcast from server: use supabase.rpc or insert into a broadcast table that triggers realtime
