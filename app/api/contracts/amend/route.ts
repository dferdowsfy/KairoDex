export const runtime = 'edge'
import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'
import { aiComplete } from '@/lib/ai'

export async function POST(req: NextRequest) {
  try {
    const { clientId, description } = await req.json()
    if (!clientId || !description) return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 })

  const supabase = supabaseServer()
  const title = 'Contract Amendment'
  const system = 'You are a contract assistant. Generate a concise redline-style amendment summary. Use clear headings and bullet points. If dates or amounts are ambiguous, add [confirm] tags.'
  const user = `Proposed change: ${description}`
  // Uses provider picked by lib/ai.ts based on env (OpenAI, OpenRouter, or Gemini)
  const content = await aiComplete(system, user)

    const { data: doc } = await supabase
      .from('documents')
      .insert({ client_id: clientId, title, status: 'draft', content })
      .select('*')
      .single()

    await supabase.from('events').insert({ client_id: clientId, type: 'document', ref_id: doc?.id })

  return new Response(JSON.stringify({ documentId: doc?.id }), { status: 200, headers: { 'Content-Type':'application/json' } })
  } catch (e: any) {
  return new Response(JSON.stringify({ error: 'Unexpected', details: e?.message }), { status: 500, headers: { 'Content-Type':'application/json' } })
  }
}
