import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'
import { validateEnv } from '@/lib/email'

async function callLLM(prompt: string, tone: string) {
  const model = process.env.LLM_MODEL || 'gpt-4.1'
  const openaiKey = process.env.OPENAI_API_KEY
  const orKey = process.env.OPENROUTER_API_KEY
  const temperature = tone === 'professional' ? 0.5 : 0.9
  if (openaiKey) {
    const r = await fetch((process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1') + '/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, temperature, messages: [
        { role: 'system', content: 'You output ONLY valid JSON: {"subject": "...", "body_md": "..."}' },
        { role: 'user', content: prompt }
      ] })
    })
    const j = await r.json(); return j.choices?.[0]?.message?.content || '{}'
  } else if (orKey) {
    const r = await fetch((process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1') + '/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${orKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, temperature, messages: [
        { role: 'system', content: 'You output ONLY valid JSON: {"subject": "...", "body_md": "..."}' },
        { role: 'user', content: prompt }
      ] })
    })
    const j = await r.json(); return j.choices?.[0]?.message?.content || '{}'
  }
  return '{"subject":"(No LLM Configured)","body_md":"LLM not configured."}'
}

export async function POST(req: NextRequest) {
  validateEnv()
  const supabase = supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { clientId, tone } = await req.json()
  if (!clientId) return NextResponse.json({ error: 'Missing clientId' }, { status: 400 })
  const { data: client } = await supabase.from('clients').select('*').eq('id', clientId).eq('owner_id', user.id).single()
  const { data: notes } = await supabase.from('client_notes').select('note,created_at').eq('client_id', clientId).order('created_at', { ascending: false }).limit(5)
  const { data: steps } = await supabase.from('next_steps').select('title,due_date').eq('client_id', clientId).order('due_date', { ascending: true }).limit(5)
  const prompt = `Client: ${JSON.stringify(client)}\nNotes: ${JSON.stringify(notes||[])}\nSteps: ${JSON.stringify(steps||[])}\nTone:${tone}`
  try {
    const raw = await callLLM(prompt, tone)
    let parsed: any; try { parsed = JSON.parse(raw) } catch { parsed = { subject: 'Draft Subject', body_md: raw.slice(0,200) } }
    return NextResponse.json({ subject: parsed.subject, bodyMd: parsed.body_md })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
