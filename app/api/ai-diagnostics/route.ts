import { NextResponse } from 'next/server'

function detectProvider() {
  const hasOpenAI = !!process.env.OPENAI_API_KEY
  const hasOpenRouter = !!process.env.OPENROUTER_API_KEY
  const hasGemini = !!process.env.GEMINI_API_KEY

  // Model priority: AI_MODEL -> MARKET_OPENROUTER_MODEL -> OPENAI_TEXT_MODEL -> default
  const requestedModel = process.env.AI_MODEL || process.env.MARKET_OPENROUTER_MODEL || process.env.OPENAI_TEXT_MODEL || 'openai/gpt-4o-mini-search-preview'
  const isOpenRouterModel = requestedModel.includes('/') || requestedModel === 'gpt-4o-mini-search-preview'

  let provider: string | null = null
  let model: string | null = requestedModel

  // Prioritize OpenRouter for OpenRouter-style models
  if (hasOpenRouter && isOpenRouterModel) {
    provider = 'openrouter'
  } else if (hasOpenAI && !isOpenRouterModel) {
    provider = 'openai'
  } else if (hasGemini) {
    provider = 'gemini'
    model = process.env.GEMINI_TEXT_MODEL || 'gemini-1.5-flash'
  }

  return { provider, model, hasOpenAI, hasOpenRouter, hasGemini, isOpenRouterModel }
}

function looksLikeOpenRouterModel(m: string | null) {
  if (!m) return false
  return m.includes('/') || m.toLowerCase().includes('perplexity')
}

export async function GET() {
  const info = detectProvider()
  const warnings: string[] = []

  if (!info.provider) warnings.push('No LLM provider API key is present (OPENAI, OPENROUTER, or GEMINI).')

  const model = info.model
  const openRouterLike = looksLikeOpenRouterModel(model)

  if (info.provider === 'openai' && openRouterLike) {
    warnings.push('Configured model looks like an OpenRouter-style id but OPENAI_API_KEY is present; this may cause API errors. Consider setting OPENAI_TEXT_MODEL to an OpenAI model name (e.g. gpt-4o-mini).')
  }

  if (info.provider === 'openrouter' && model && !openRouterLike) {
    warnings.push('OpenRouter is selected but the model does not look like an OpenRouter id; ensure the model is valid for OpenRouter (often contains "/").')
  }

  const payload = {
    provider: info.provider,
    model: model ?? null,
    keysPresent: {
      OPENAI_API_KEY: info.hasOpenAI,
      OPENROUTER_API_KEY: info.hasOpenRouter,
      GEMINI_API_KEY: info.hasGemini,
    },
    warnings,
  }

  return NextResponse.json(payload)
}
