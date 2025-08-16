export interface AIOptions { model?: string; temperature?: number }

export async function aiComplete(system: string, user: string, opts: AIOptions = {}) {
  const temperature = opts.temperature ?? Number(process.env.AI_TEMPERATURE ?? '0.3')

  // 1) OpenAI
  const openaiKey = process.env.OPENAI_API_KEY
  if (openaiKey) {
    const model = opts.model ?? process.env.OPENAI_TEXT_MODEL ?? 'gpt-4.1'
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

  // 2) OpenRouter
  const openrouterKey = process.env.OPENROUTER_API_KEY
  if (openrouterKey) {
    const model = opts.model ?? process.env.AI_MODEL ?? 'perplexity/sonar-reasoning-pro'
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

  // 3) Google Gemini
  const geminiKey = process.env.GEMINI_API_KEY
  if (geminiKey) {
    const model = opts.model ?? process.env.GEMINI_TEXT_MODEL ?? 'gemini-1.5-flash'
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
