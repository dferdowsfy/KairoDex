"use client"
import { createBrowserClient } from '@supabase/ssr'

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)
const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY)

export const supabase = (url && key)
  ? createBrowserClient(url, key)
  : new Proxy({} as any, {
      get() {
        throw new Error('Supabase is not configured in this environment')
      }
    })
