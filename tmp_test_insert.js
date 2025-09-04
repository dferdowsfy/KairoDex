;(async () => {
  // Load .env using dynamic import to support newer dotenv ESM builds
  try {
    const d = await import('dotenv')
    if (d && typeof d.config === 'function') d.config({ path: '.env' })
  } catch (e) {
    // ignore dotenv load errors; rely on process.env if already set
  }

  try {
    const { createClient } = require('@supabase/supabase-js')
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_KEY
    console.log('Using SUPABASE_URL present?', !!url, 'SERVICE_ROLE key present?', !!key)
    if (!url || !key) {
      console.error('Missing SUPABASE_URL or SERVICE_ROLE_KEY in environment')
      process.exit(2)
    }
    const sup = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    const payload = { agent_owner_user_id: 'admin@test.local', name_first: 'Node', name_last: 'Script', email: 'node@example.com', Notes_Inputted: [] }
    const res = await sup.from('AgentHub_DB').insert([payload]).select('*')
    console.log('Insert result:', JSON.stringify(res, null, 2))
  } catch (e) {
    console.error('Unexpected error', e)
    process.exit(1)
  }

})()
