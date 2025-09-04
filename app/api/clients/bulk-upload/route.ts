import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'
import { createServerClient } from '@supabase/ssr'

function extractFromUnstructured(text: string) {
  // Heuristics: split lines, first non-empty line as name, find email and phone, rest as notes
  const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
  const out: any = { raw: text }
  if (!lines.length) return out
  // Candidate name: first line if it looks like a name (contains letters and spaces, not an email)
  const first = lines[0]
  if (!/^[^@\d]{1,}$/.test(first) || /@/.test(first)) {
    // not a clear name; fall through
  } else {
    out.name = first
  }

  // Find email
  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  if (emailMatch) out.email = emailMatch[0]

  // Find phone: simple patterns
  const phoneMatch = text.match(/(\+?\d[\d().\s-]{6,}\d)/)
  if (phoneMatch) out.phone = phoneMatch[0].replace(/\s+/g, ' ').trim()

  // Notes: everything except name/email/phone lines
  const notes = lines.filter(l => l !== out.name && !(out.email && l.includes(out.email)) && !(out.phone && l.includes(out.phone)))
  if (notes.length) out.Notes_Inputted = [{ source: 'import:unstructured', text: notes.join('\n') }]
  return out
}

function normalizeDnc(val: any) {
  if (val === true || val === false) return !!val
  if (!val) return false
  const s = String(val).trim().toLowerCase()
  return /^(true|1|yes|y|dnc|do\s*not\s*contact|opt\s*out|unsubscribe)$/.test(s)
}

export async function POST(request: NextRequest) {
  try {
    const supabase = supabaseServer()
    const {
      data: { user },
      error: userErr
    } = await supabase.auth.getUser()
    if (userErr) throw userErr
    if (!user?.email) return new Response(JSON.stringify({ error: 'Auth session missing!' }), { status: 401 })
    
    console.log('[BULK-UPLOAD] Authenticated user:', user.email)

  const body = await request.json()
  // If the frontend sets an org_id cookie on sign-in, include it on inserted rows
  const orgId = (request.cookies?.get && request.cookies.get('org_id')?.value) || undefined
    const rows = Array.isArray(body?.rows) ? body.rows as any[] : []
    if (!rows.length) return new Response(JSON.stringify({ error: 'No rows provided' }), { status: 400 })

    const inserted: any[] = []
    const errors: any[] = []

    // Normalize rows: accept both canonical shapes and unstructured 'text' or 'raw' entries
    const normalized = rows.map((r: any, i: number) => {
      try {
        let obj = { ...r }
        // If a single 'text' or 'raw' field present, try to extract
        if (!obj.name_first && !obj.name_last && !obj.name && (obj.text || obj.raw || obj.unstructured)) {
          const parsed = extractFromUnstructured(obj.text || obj.raw || obj.unstructured)
          obj = { ...parsed, ...obj }
        }

        // If there's combined name, split heuristics
        if (!obj.name_first && !obj.name_last && obj.name) {
          const parts = String(obj.name).trim().split(/\s+/).filter(Boolean)
          if (parts.length === 1) { obj.name_first = parts[0] }
          else if (parts.length === 2) { obj.name_first = parts[0]; obj.name_last = parts[1] }
          else if (parts.length > 2) { obj.name_first = parts[0]; obj.name_last = parts.slice(1).join(' ') }
        }

        // Map common keys
        const email = (obj.email || obj.Email || obj.e || '').toString().trim() || undefined
        const phone = (obj.phone || obj.Phone || obj.p || '').toString().trim() || undefined
        const stage = (obj.stage || obj.Stage || 'new').toString()
        const doNot = normalizeDnc(obj.do_not_contact ?? obj.dnc ?? obj.opt_out ?? obj.optout ?? obj.unsubscribe ?? obj['do-not-contact'])

        const notesField = obj.Notes_Inputted || obj.notes || obj.Notes || undefined

  const payload: any = { agent_owner_user_id: user.email, stage, do_not_contact: doNot }
  if (orgId) payload.org_id = orgId
        if (obj.name_first) payload.name_first = String(obj.name_first)
        if (obj.name_last) payload.name_last = String(obj.name_last)
        if (email) payload.email = email
        if (phone) payload.phone = phone
        if (obj.external_id) payload.external_id = obj.external_id
        if (obj.address) payload.address = obj.address
        if (obj.tags) payload.tags = Array.isArray(obj.tags) ? obj.tags : String(obj.tags).split(',').map((s:string)=>s.trim()).filter(Boolean)

        // Normalize notes into Notes_Inputted array of objects
        if (notesField) {
          const arr = Array.isArray(notesField) ? notesField : [notesField]
          const normalizedNotes = arr.map((n: any) => typeof n === 'string' ? { source: 'import', text: n, imported_at: new Date().toISOString() } : { ...n, imported_at: (n.imported_at || new Date().toISOString()) })
          payload.Notes_Inputted = normalizedNotes
        }

        // Minimal validation: require name_first+name_last OR email OR phone
        if (!payload.name_first && !payload.name_last && !payload.email && !payload.phone) {
          return { valid: false, rowIndex: i, error: 'Missing name_first/name_last or email or phone', payload: null }
        }

        return { valid: true, rowIndex: i, payload }
      } catch (e: any) {
        return { valid: false, rowIndex: i, error: e?.message || 'normalize_failed', payload: null }
      }
    })

    // Collect normalization errors
    for (const n of normalized) if (!n.valid) errors.push({ row: n.rowIndex, error: n.error })

    const dryRun = !!body?.options?.dryRun
    const chunkSize = Number(body?.options?.chunkSize) || 100
    const toInsert = normalized.filter((n: any) => n.valid).map((n: any) => n.payload)

    if (dryRun) {
      // Return transformed payloads and validation summary without inserting
      return new Response(JSON.stringify({ preview: toInsert.slice(0, 500), total: toInsert.length, errors }), { status: 200 })
    }

    // Chunk inserts to avoid huge single inserts
    console.log('[BULK-UPLOAD] About to insert', toInsert.length, 'rows')
    for (let i = 0; i < toInsert.length; i += chunkSize) {
      const chunk = toInsert.slice(i, i + chunkSize)
      console.log('[BULK-UPLOAD] Inserting chunk of', chunk.length, 'rows')
      const { data, error } = await supabase.from('AgentHub_DB').insert(chunk).select('*')
      if (error) {
        console.error('[BULK-UPLOAD] Chunk insert failed:', error)
        // if the chunk fails, try individual inserts to collect per-row errors
        for (const item of chunk) {
          const { data: d2, error: e2 } = await supabase.from('AgentHub_DB').insert(item).select('*').single()
          if (e2) {
            console.error('[BULK-UPLOAD] Individual insert failed:', e2, 'for item:', item)
            errors.push({ error: e2.message || e2, item })
          } else {
            console.log('[BULK-UPLOAD] Individual insert succeeded:', d2)
            inserted.push(d2)
          }
        }
      } else {
        console.log('[BULK-UPLOAD] Chunk insert succeeded, got', data?.length || 0, 'rows')
        inserted.push(...(data || []))
      }
    }

    console.log('[BULK-UPLOAD] Final result: inserted', inserted.length, 'errors', errors.length)
    return new Response(JSON.stringify({ inserted: inserted.length, rows: inserted, errors }), { status: 200 })
  } catch (e: any) {
    console.error('[BULK-UPLOAD] Unexpected error:', e)
    return new Response(JSON.stringify({ error: e?.message || 'Bulk upload failed' }), { status: 500 })
  }
}
