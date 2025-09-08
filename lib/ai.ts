export interface AIOptions { model?: string; temperature?: number }

function looksLikeOpenAImodel(m?: string) {
  if (!m) return false
  // Heuristic: OpenAI model ids rarely contain a '/' character and usually start with 'gpt' or 'text'
  return /^(gpt|text|gpt-)/i.test(m) && !m.includes('/')
}

export async function aiComplete(system: string, user: string, opts: AIOptions = {}) {
  const temperature = opts.temperature ?? Number(process.env.AI_TEMPERATURE ?? '0.35')

  // Force OpenRouter for gpt-4o-mini-search-preview model
  const requestedModel = opts.model ?? process.env.AI_MODEL ?? process.env.OPENAI_TEXT_MODEL ?? 'gpt-4o-mini-search-preview'
  const isOpenRouterModel = requestedModel.includes('/') || requestedModel === 'gpt-4o-mini-search-preview'
  
  // If we have OpenRouter key and the model is OpenRouter-style, use OpenRouter
  const openrouterKey = process.env.OPENROUTER_API_KEY
  if (openrouterKey && isOpenRouterModel) {
    const model = requestedModel.includes('/') ? requestedModel : `openai/${requestedModel}`
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

  // Fallback to OpenAI if key present and model is OpenAI-compatible
  const openaiKey = process.env.OPENAI_API_KEY
  if (openaiKey && !isOpenRouterModel) {
    const model = requestedModel
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

  // Final fallback: Google Gemini
  const geminiKey = process.env.GEMINI_API_KEY
  if (geminiKey) {
    const model = (process.env.GEMINI_TEXT_MODEL ?? 'gemini-1.5-flash').toString()
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

  throw new Error('No AI provider configured. Set OPENROUTER_API_KEY for gpt-4o-mini-search-preview or other model keys.')
}
