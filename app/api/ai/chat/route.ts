import { NextRequest } from 'next/server'
import { aiComplete } from '@/lib/ai'
import { inferPreferredMethod } from '@/lib/sheets'
import { supabaseServer } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
  const { clientId, message, intent } = await req.json()
    if (!message) {
      return new Response(JSON.stringify({ error: 'Missing message' }), { status: 400 })
    }
    let client: any = null
    let sheetRow: any = null
    // Prefer Supabase AgentHub_DB as the source of truth
    if (clientId) {
      try {
        const supabase = supabaseServer()
        const { data, error } = await supabase
          .from('AgentHub_DB')
          .select('*')
          .eq('client_id', clientId)
          .maybeSingle()
        if (error) throw error
        if (data) {
          sheetRow = data
          const name = [data.name_first, data.name_last].filter(Boolean).join(' ').trim()
          client = {
            id: data.client_id || clientId,
            name: name || data.email || 'Client',
            email: data.email,
            phone: data.phone,
            stage: data.stage || 'new'
          }
        }
      } catch {}
    }
  const system = `You are AgentHub’s assistant.
Rules:
- Use only the provided CLIENT_CONTEXT. Do not invent facts or statuses.
- If DB_ROW is present, prefer its values. If a field is missing, say you don't know.
- Only refuse to draft a follow-up when the DB row explicitly marks the client as do-not-contact (e.g., do_not_contact, DNC, opt_out, unsubscribe is true/yes).
- When drafting a follow-up, use the client's preferred contact method if present (e.g., sms/text, email, phone). If not present, default to email. Keep it brief and professional.
- Assume outreach is allowed if there is no explicit DNC/opt-out flag. Never infer do-not-contact from hints or absence of data.
- If the user asks for a follow-up and no DNC flag exists, output the follow-up message directly without warnings or caveats.
- Do NOT label a client as \"do not contact\" (or DNC) unless an explicit field in sheetRow says so.`
  const user = `CLIENT_CONTEXT (from Supabase AgentHub_DB):\n${JSON.stringify({ client, dbRow: sheetRow, intent }, null, 2)}\n\nUSER:\n${message}`
    let response = await aiComplete(system, user)
    // If intent is 'next steps', structure a clear answer from sheetRow
    if (intent === 'next_steps' || /next steps?/i.test(message)) {
      let nextAction = ''
      let dueDate = ''
      if (sheetRow) {
        // Try common column names
        const keys = Object.keys(sheetRow)
        for (const k of keys) {
          const kn = k.trim().toLowerCase()
          if (!nextAction && /next[_ ]?action|next[_ ]?step|next[_ ]?steps?/i.test(kn)) {
            nextAction = String(sheetRow[k] ?? '').trim()
          }
          if (!dueDate && (kn.includes('next_action_due') || /(due[_ ]?date|next[_ ]?due|action[_ ]?date)/i.test(kn))) {
            dueDate = String(sheetRow[k] ?? '').trim()
          }
        }
      }
      if (nextAction) {
        response = `The next step for${client?.name ? ` ${client.name}` : ' this client'} is: ${nextAction}${dueDate ? ` (due by ${dueDate})` : ''}.`
      } else {
        response = `I don’t see a specific next step for${client?.name ? ` ${client.name}` : ' this client'} in the database. Please check with your team or review the client’s details.`
      }
    }
    // Safety net: if there's no explicit do-not-contact signal, scrub accidental refusals/hallucinations
    const lower = response.toLowerCase()
    const rowStr = JSON.stringify(sheetRow || {})
    const truthy = (v: any) => typeof v === 'string' ? /^(true|yes|y|1)$/i.test(v.trim()) : !!v
    const rowHasDnc = (() => {
      try {
        const obj = sheetRow || {}
        const keys = Object.keys(obj as any)
        const envKeys = (process.env.SHEET_DNC_KEYS || '').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean)
        const allowed = envKeys.length ? envKeys : ['do_not_contact','dnc','opt_out','optout','unsubscribe','do-not-contact']
        for (const k of keys) {
          const kn = k.toLowerCase().replace(/\s+/g, '_')
          if (allowed.includes(kn)) {
            const v = (obj as any)[k]
            if (truthy(v)) return true
            const val = String(v ?? '').toLowerCase()
            if (/(^|\b)(true|yes|y|1|dnc|do\s*not\s*contact|opt\s*out|unsubscribe)(\b|$)/i.test(val)) return true
          }
        }
      } catch {}
      return false
    })()

    // If model says not to send follow-up without a DNC flag, rewrite to proceed via preferred method
  const refusalPattern = /no\s+(?:further\s+)?follow[- ]?up\s+should\s+be\s+sent|should\s+not\s+be\s+sent|do\s+not\s+send\s+(?:a\s+)?follow[- ]?up|no\s+outreach\s+should\s+be\s+made|should\s+not\s+contact|avoid\s+contacting|refrain\s+from\s+contacting|cannot\s+contact|contact\s+is\s+not\s+permitted|will\s+not\s+be\s+sent|should\s+not\s+be\s+made/i
    if (!rowHasDnc) {
      if (/(do\s*not\s*contact|\bDNC\b)/i.test(response)) {
        // Remove any sentence that claims DNC when not present in the sheet
        response = response
          .replace(/[^.!?]*do\s*not\s*contact[^.!?]*[.!?]/ig, '')
          .replace(/[^.!?]*\bDNC\b[^.!?]*[.!?]/ig, '')
          .trim()
      }
      if (refusalPattern.test(response)) {
        // Remove or neutralize refusal phrases
        response = response
          .replace(/[^.!?]*\b(no\s+outreach\s+should\s+be\s+made|should\s+not\s+contact|avoid\s+contacting|refrain\s+from\s+contacting|cannot\s+contact|contact\s+is\s+not\s+permitted|will\s+not\s+be\s+sent|should\s+not\s+be\s+made)[^.!?]*[.!?]/ig, '')
          .replace(refusalPattern, 'proceed with a brief, polite follow-up using the preferred contact method')
          .trim()
      }
      // If the intent was followup and content still looks like a refusal, provide a minimal template
      if ((intent === 'followup') && /\b(should\s+not\s+send|cannot\s+draft|unable\s+to\s+provide|refuse|no\s+outreach|should\s+not\s+contact)/i.test(response)) {
  const method = inferPreferredMethod(sheetRow)
        response = `Subject: Quick follow-up\n\nHi${(client && client.name) ? ` ${client.name.split(' ')[0]}` : ''},\n\nJust checking in to see if you had any questions or wanted to take the next step. I’m happy to help.\n\nBest,\nAgentHub\n\n(${method})`
      }
      // If after scrubbing we ended up with very little content on a follow-up ask, generate a minimal follow-up
      if ((intent === 'followup') && (!response || response.replace(/\s+/g,' ').trim().length < 40)) {
  const method = inferPreferredMethod(sheetRow)
        response = `Subject: Quick follow-up\n\nHi${(client && client.name) ? ` ${client.name.split(' ')[0]}` : ''},\n\nJust checking in to see if you had any questions or wanted to take the next step. I’m happy to help.\n\nBest,\nAgentHub\n\n(${method})`
      }
    }
    return new Response(JSON.stringify({ reply: response, sheetRow: !!sheetRow }), { status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Chat failed' }), { status: 500 })
  }
}
