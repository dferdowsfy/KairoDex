import { createClient } from '@supabase/supabase-js'

// Server-only admin client. Do NOT import in client bundles.
// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE in env.
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_KEY
  if (!url || !serviceKey) {
    console.error('Missing Supabase admin env vars:', { url: !!url, serviceKey: !!serviceKey })
    throw new Error('Supabase admin env missing: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
}
