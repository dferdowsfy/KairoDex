import React, { createContext, useContext, useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

type OrgContextValue = {
  orgId: string | null
  role: 'owner' | 'admin' | 'agent' | 'viewer' | null
  profileId: string | null
  setOrgId: (id: string|null) => void
}

const OrgContext = createContext<OrgContextValue | undefined>(undefined)

export const OrgProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const supabase = createClientComponentClient()
  const [orgId, setOrgId] = useState<string | null>(null)
  const [role, setRole] = useState<OrgContextValue['role']>(null)
  const [profileId, setProfileId] = useState<string | null>(null)

  useEffect(() => {
    // On mount, fetch current profile and default org membership
    async function init() {
      const { data: profile } = await supabase.from('profiles').select('id').maybeSingle()
      if (profile && profile.id) setProfileId(profile.id)
      // Application should provide UX to choose org; fallback to first membership
      const { data: memberships } = await supabase.from('org_memberships').select('org_id, role').limit(1)
      if (memberships && memberships.length) {
        setOrgId(memberships[0].org_id)
        setRole(memberships[0].role)
      }
    }
    init()
  }, [])

  return (
    <OrgContext.Provider value={{ orgId, role, profileId, setOrgId }}>{children}</OrgContext.Provider>
  )
}

export function useOrg() {
  const ctx = useContext(OrgContext)
  if (!ctx) throw new Error('useOrg must be used within OrgProvider')
  return ctx
}
