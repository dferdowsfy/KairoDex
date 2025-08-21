"use client"
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseBrowser'

export function useSessionUser() {
  const [user, setUser] = useState<import('@supabase/supabase-js').User | null>(null)
  const [loading, setLoading] = useState(true)
  const [synced, setSynced] = useState(false)
  useEffect(() => {
    let mounted = true
    // In environments without Supabase configured, supabase may throw on access.
    try {
      supabase.auth.getUser().then(({ data }: { data: { user: import('@supabase/supabase-js').User | null } }) => {
        if (mounted) { setUser(data.user ?? null); setLoading(false) }
      })
      const { data: sub } = supabase.auth.onAuthStateChange((_e: any, session: { user: import('@supabase/supabase-js').User | null } | null) => {
        setUser(session?.user ?? null)
      }) as any
      return () => { mounted = false; (sub as any)?.subscription?.unsubscribe?.() }
    } catch {
      // Supabase not available; mark loading false
      setLoading(false)
      return () => { mounted = false }
    }
  }, [])

  // Ensure a corresponding row exists in public.users for new accounts
  useEffect(() => {
    if (!user || synced) return
    const email = (user as any)?.email as string | undefined
    if (!email) return
    ;(async () => {
      try {
        await (supabase as any)
          .from('users')
          .upsert({ email }, { onConflict: 'email' })
      } catch {}
      setSynced(true)
    })()
  }, [user, synced])
  return { user, loading }
}
