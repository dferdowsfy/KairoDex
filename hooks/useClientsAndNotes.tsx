import { useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useOrg } from './useOrg'

const supabase = createClientComponentClient()

export function useClients() {
  const { orgId } = useOrg()

  const fetchClients = useCallback(async (page = 1, perPage = 20) => {
    if (!orgId) throw new Error('orgId required')
    const from = (page - 1) * perPage
    const to = from + perPage - 1
    const TABLE = (process.env.NEXT_PUBLIC_SUPABASE_CLIENTS_TABLE || process.env.SUPABASE_CLIENTS_TABLE || 'AgentHub_DB') as string
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .range(from, to)
    if (error) throw error
    return data
  }, [orgId])

  return { fetchClients }
}

export function useClientNotes() {
  const { orgId, profileId } = useOrg()

  const fetchNotesForClient = useCallback(async (clientId: string, page = 1, perPage = 20) => {
    if (!orgId) throw new Error('orgId required')
    const from = (page - 1) * perPage
    const to = from + perPage - 1
    const { data, error } = await supabase
      .from('client_notes')
      .select('*')
      .eq('org_id', orgId)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .range(from, to)
    if (error) throw error
    return data
  }, [orgId])

  // Create note (sets org_id, author_user_id)
  const createNote = useCallback(async (clientId: string, content: string) => {
    if (!orgId) throw new Error('orgId required')
    const payload = { client_id: clientId, org_id: orgId, content, author_user_id: profileId }
    const { data, error } = await supabase.from('client_notes').insert(payload).select().single()
    if (error) throw error
    return data
  }, [orgId, profileId])

  // Update note with optimistic concurrency: requires version
  const updateNote = useCallback(async (noteId: string, patch: any, expectedVersion: number) => {
    if (!orgId) throw new Error('orgId required')
    // Attempt update where version matches
    const newVersion = expectedVersion + 1
    const updates = { ...patch, version: newVersion, updated_at: new Date().toISOString() }
    const { data, error } = await supabase.from('client_notes').update(updates).eq('id', noteId).eq('org_id', orgId).eq('version', expectedVersion).select().single()
    if (error) {
      // If conflict due to version mismatch, return a specific error object
      if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
        const latest = await supabase.from('client_notes').select('*').eq('id', noteId).single()
        return { conflict: true, latest: latest.data }
      }
      throw error
    }
    return { conflict: false, data }
  }, [orgId])

  // Delete note (checks role via RLS)
  const deleteNote = useCallback(async (noteId: string) => {
    if (!orgId) throw new Error('orgId required')
    const { error } = await supabase.from('client_notes').delete().eq('id', noteId).eq('org_id', orgId)
    if (error) throw error
    return true
  }, [orgId])

  return { fetchNotesForClient, createNote, updateNote, deleteNote }
}
