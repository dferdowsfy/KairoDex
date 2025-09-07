export interface AIOptions { model?: string; temperature?: number }

function looksLikeOpenAImodel(m?: string) {
  if (!m) return false
  // Heuristic: OpenAI model ids rarely contain a '/' character and usually start with 'gpt' or 'text'
  return /^(gpt|text|gpt-)/i.test(m) && !m.includes('/')
}

export async function aiComplete(system: string, user: string, opts: AIOptions = {}) {
  const temperature = opts.temperature ?? Number(process.env.AI_TEMPERATURE ?? '0.35')

  // Prefer OpenAI if key present
  const openaiKey = process.env.OPENAI_API_KEY
  if (openaiKey) {
    const model = (opts.model ?? process.env.OPENAI_TEXT_MODEL ?? 'gpt-4.1').toString()
    // Basic sanity check: don't pass OpenRouter-style model ids (contain '/') to OpenAI
    if (model.includes('/')) {
      throw new Error(`OpenAI selected but model value looks like an OpenRouter model id ('${model}'). Set OPENAI_TEXT_MODEL to an OpenAI model (for example 'gpt-4.1') or pass a compatible model.`)
    }

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model,
        temperature,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      })
    })
    if (!resp.ok) throw new Error(`AI error (OpenAI): ${await resp.text()}`)
    const data = await resp.json()
    return data?.choices?.[0]?.message?.content ?? ''
  }

  // Next: OpenRouter
  const openrouterKey = process.env.OPENROUTER_API_KEY
  if (openrouterKey) {
    const model = (opts.model ?? process.env.AI_MODEL ?? 'perplexity/sonar-reasoning-pro').toString()
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openrouterKey}`,
      },
      body: JSON.stringify({
        model,
        temperature,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      })
    })
    if (!resp.ok) throw new Error(`AI error (OpenRouter): ${await resp.text()}`)
    const data = await resp.json()
    return data?.choices?.[0]?.message?.content ?? ''
  }

  // Finally: Google Gemini
  const geminiKey = process.env.GEMINI_API_KEY
  if (geminiKey) {
    const model = (opts.model ?? process.env.GEMINI_TEXT_MODEL ?? 'gemini-1.5-flash').toString()
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: `${system}\n\n${user}` }] }
        ]
      })
    })
    if (!resp.ok) throw new Error(`AI error (Gemini): ${await resp.text()}`)
    const data = await resp.json()
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  }

  throw new Error('No AI provider configured. Set OPENAI_API_KEY, OPENROUTER_API_KEY, or GEMINI_API_KEY.')
}
