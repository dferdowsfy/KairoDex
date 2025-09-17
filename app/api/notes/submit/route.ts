import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

type Entry = { id: string; text: string; user_id: string; created_at: string }

type StructuredNote = {
  name?: string
  summary?: { budget?: string; email?: string; phone?: string }
  sections: { title: string; content: string }[]
}

async function getRow(clientId: string) {
  const admin = supabaseAdmin()
  const { data, error } = await admin.from('AgentHub_DB').select('client_id, Notes_Inputted').eq('client_id', clientId).maybeSingle()
  if (error) throw error
  return (data || { client_id: clientId, Notes_Inputted: [] }) as any as { client_id: string; Notes_Inputted: any }
}

function parseHistory(value: any): Entry[] {
  if (!value) return []
  try {
    if (typeof value === 'string') return JSON.parse(value) as Entry[]
    if (Array.isArray(value)) return value as Entry[]
    return []
  } catch { return [] }
}

async function updateHistory(clientId: string, history: Entry[]) {
  const admin = supabaseAdmin()
  // ensure row exists
  const { data: existing, error: selErr } = await admin.from('AgentHub_DB').select('client_id').eq('client_id', clientId).maybeSingle()
  if (selErr) throw selErr
  if (!existing) {
    const { error: insErr } = await admin.from('AgentHub_DB').insert({ client_id: clientId, Notes_Inputted: history }).single()
    if (insErr) throw insErr
    return
  }
  const { error } = await admin.from('AgentHub_DB').update({ Notes_Inputted: history }).eq('client_id', clientId)
  if (error) throw error
}

export async function GET(req: NextRequest) {
  try {
    const clientId = req.nextUrl.searchParams.get('clientId') || ''
    if (!clientId) return new Response(JSON.stringify({ error: 'clientId required' }), { status: 400 })
    const supabase = supabaseServer()
  const getUserRes = await supabase.auth.getUser()
  const user = getUserRes?.data?.user
  if (getUserRes?.error) throw getUserRes.error
  if (!user?.id) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    const row = await getRow(clientId)
    const history = parseHistory(row?.Notes_Inputted)
    return new Response(JSON.stringify({ items: history }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Unexpected' }), { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { clientId, text } = await req.json()
    if (!clientId || !text) return new Response(JSON.stringify({ error: 'clientId and text required' }), { status: 400 })
  const supabase = supabaseServer()
  const getUserRes = await supabase.auth.getUser()
  const user = getUserRes?.data?.user
  if (getUserRes?.error) throw getUserRes.error
  if (!user?.id) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    const row = await getRow(clientId)
    const history = parseHistory(row?.Notes_Inputted)

    // Simple heuristic parser to convert unstructured notes into titled sections and a small summary
    function structureNote(txt: string): StructuredNote {
      const lines = String(txt || '').split(/\r?\n/).map(l => l.trim())
      const sections: { title: string; contentLines: string[] }[] = []
      let current: { title: string; contentLines: string[] } | null = null

      const knownHeaders = [/^financials[:]?/i, /^budget[:]?/i, /^property requirements[:]?/i, /^key feature/i, /^log & next steps[:]?/i, /^client feedback[:]?/i, /^properties viewed[:]?/i, /^date of initial consultation[:]?/i]

      for (let i = 0; i < lines.length; i++) {
        const l = lines[i]
        if (!l) {
          // blank line separates sections
          if (current) { sections.push(current); current = null }
          continue
        }
        // header heuristics: line that ends with ':' or matches known headers
  if (/[:]\s*$/.test(l) || knownHeaders.some(h => h.test(l))) {
          if (current) sections.push(current)
          const title = l.replace(/^\s+|\s+$/g, '').replace(/[:]+$/g, '')
          current = { title: title, contentLines: [] }
          continue
        }
        // numbered list headings like '1. Property Requirements' -> treat as header
        if (/^\d+\.\s+/.test(l)) {
          if (current) sections.push(current)
          const title = l.replace(/^\d+\.\s+/, '').replace(/[:]+$/g, '')
          current = { title, contentLines: [] }
          continue
        }
        // If there's no current section but line looks like a header-ish single word (all caps or title-case with colon nearby), start a section
        if (!current && /^[A-Z][A-Za-z\s]{2,40}$/.test(l) && l.split(' ').length <= 4) {
          current = { title: l.replace(/[:]+$/g, ''), contentLines: [] }
          continue
        }
        // otherwise append to current or create a default section
        if (!current) current = { title: 'Notes', contentLines: [] }
        current.contentLines.push(l)
      }
      if (current) sections.push(current)

      // extract budget, email, phone from whole text
      const summary: any = {}
      const dollarRe = /\$\s?([0-9,.]+)/
      const mDollar = txt.match(dollarRe)
      if (mDollar && mDollar[1]) summary.budget = '$' + mDollar[1].replace(/,/g, '')
      const emailRe = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig
      const mEmail = txt.match(emailRe)
      if (mEmail && mEmail.length) summary.email = mEmail[0]
      const phoneRe = /(?:\+?\d[\d\s().-]{6,}\d)/g
      const mPhone = txt.match(phoneRe)
      if (mPhone && mPhone.length) summary.phone = mPhone[0]

      // try to find name: often first line if it looks like a name
      let name: string | undefined
      const firstNonEmpty = lines.find(l => !!l)
      if (firstNonEmpty && /^[A-Za-z'-]+\s+[A-Za-z' -]+$/.test(firstNonEmpty) && firstNonEmpty.length < 60) name = firstNonEmpty

      return { name, summary: Object.keys(summary).length ? summary : undefined, sections: sections.map(s => ({ title: s.title, content: s.contentLines.join('\n') })) }
    }

    const structured = structureNote(text)

    const entry: Entry & { structured?: StructuredNote } = { id: `ni_${Date.now()}`, text, user_id: user.id, created_at: new Date().toISOString(), structured }
    history.unshift(entry as any)
    await updateHistory(clientId, history)
    return new Response(JSON.stringify({ item: entry, items: history }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Unexpected' }), { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get('clientId') || ''
    const id = searchParams.get('id') || ''
    if (!clientId || !id) return new Response(JSON.stringify({ error: 'clientId and id required' }), { status: 400 })
  const supabase = supabaseServer()
  const getUserRes = await supabase.auth.getUser()
  const user = getUserRes?.data?.user
  if (getUserRes?.error) throw getUserRes.error
  if (!user?.id) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    const row = await getRow(clientId)
    const history = parseHistory(row?.Notes_Inputted)
    const next = history.filter(e => e.id !== id)
    await updateHistory(clientId, next)
    return new Response(JSON.stringify({ items: next }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Unexpected' }), { status: 500 })
  }
}
