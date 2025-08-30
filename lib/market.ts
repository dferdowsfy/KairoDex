/**
 * Market snapshot utilities for fetching up-to-date real estate insights.
 *
 * Implementation notes:
 * - Uses OpenRouter Perplexity model for web-backed retrieval when OPENROUTER_API_KEY is set.
 * - Lightweight in-memory cache with TTL to avoid repeated calls for the same city/state.
 * - Returns a compact, normalized structure the chat API can drop into the prompt as MARKET_CONTEXT.
 */

export interface MarketSnapshotMetrics {
  median_sale_price?: number
  yoy_change_pct?: number
  mom_change_pct?: number
  inventory?: number
  median_days_on_market?: number
  new_listings?: number
  price_per_sqft?: number
  sale_to_list_ratio?: number
  closed_sales?: number
  pending_sales?: number
  mortgage_rate_30yr?: number
}

export interface MarketSnapshot {
  location: { city?: string; state?: string; zip?: string }
  timeframe?: string
  summary?: string
  metrics?: MarketSnapshotMetrics
  sources?: string[]
  asOf?: string
}

type Key = string

const CACHE_TTL_MS = Number(process.env.MARKET_CACHE_TTL_MS || 6 * 60 * 60 * 1000) // default 6h
const cache = new Map<Key, { at: number; value: MarketSnapshot | null }>()

function cacheKey(city?: string, state?: string, zip?: string): Key {
  return [city?.trim().toLowerCase(), state?.trim().toLowerCase(), zip?.trim()].filter(Boolean).join('|')
}

function stripCodeFences(s: string): string {
  return s
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim()
}

/**
 * Returns an up-to-date market snapshot using Perplexity via OpenRouter.
 * If OPENROUTER_API_KEY is missing, returns null.
 */
export async function getCityMarketSnapshot(city?: string, state?: string, zip?: string): Promise<MarketSnapshot | null> {
  const key = cacheKey(city, state, zip)
  const now = Date.now()
  const hit = cache.get(key)
  if (hit && now - hit.at < CACHE_TTL_MS) return hit.value

  const openrouterKey = process.env.OPENROUTER_API_KEY
  if (!openrouterKey) {
    const value = null
    cache.set(key, { at: now, value })
    return value
  }

  // Model precedence for web search snapshots only:
  // 1) MARKET_OPENROUTER_MODEL
  // 2) AI_MODEL (lets you set openai/gpt-4o-mini-2024-07-18 via OpenRouter)
  // 3) default Perplexity sonar for retrieval
  const model = process.env.MARKET_OPENROUTER_MODEL || process.env.AI_MODEL || 'perplexity/sonar-reasoning-pro'
  const sys = [
    'You are a real estate market analyst with access to the open web (via an RAG search model).',
    'Produce a concise, factual snapshot for the requested U.S. location using RECENT (<= 60 days) sources.',
    'Prefer credible datasets such as Redfin Data Center, Realtor.com market trends, local MLS reports, BLS/Census, Freddie Mac (for rates).',
    'Return STRICT JSON only with fields: timeframe (string), summary (string with 4-6 bullet sentences joined by \n- ),',
    'metrics (object with numeric values when available: median_sale_price, yoy_change_pct, mom_change_pct, inventory, median_days_on_market, new_listings, price_per_sqft, sale_to_list_ratio, closed_sales, pending_sales, mortgage_rate_30yr),',
    'sources (array of URLs). Use USD and percentages where applicable. Avoid speculation.',
  ].join('\n')

  const user = [
    `Location: ${[city, state].filter(Boolean).join(', ')}${zip ? ` ${zip}` : ''}`,
    'Focus on the city boundary (not metro) when possible. Use the latest complete monthly data or last 30 days.',
    'If multiple sources differ, use the most recent and note source in sources array.',
    'Output valid JSON only.',
  ].join('\n')

  try {
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openrouterKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: Number(process.env.MARKET_TEMPERATURE ?? '0.2'),
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: user },
        ],
      })
    })
    if (!resp.ok) {
      const txt = await resp.text().catch(()=> '')
      throw new Error(`OpenRouter market snapshot failed: ${txt}`)
    }
    const data = await resp.json()
    let content: string = data?.choices?.[0]?.message?.content || ''
    content = stripCodeFences(content)
    let json: any
    try { json = JSON.parse(content) } catch {
      // try to find first {...}
      const m = content.match(/\{[\s\S]*\}/)
      if (m) json = JSON.parse(m[0])
    }
    if (json && typeof json === 'object') {
      const out: MarketSnapshot = {
        location: { city, state, zip },
        timeframe: json.timeframe || undefined,
        summary: json.summary || undefined,
        metrics: json.metrics || undefined,
        sources: Array.isArray(json.sources) ? json.sources : undefined,
        asOf: new Date().toISOString(),
      }
      cache.set(key, { at: now, value: out })
      return out
    }
  } catch (e) {
    // swallow and cache null to avoid repeated failures within TTL window
  }
  const value = null
  cache.set(key, { at: now, value })
  return value
}

export function looksLikeRealEstateAsk(s: string): boolean {
  const m = s.toLowerCase()
  return /(real\s*estate|housing|market|inventory|listings|median\s*(price|sale)|days\s*on\s*market|mortgage|prices?\b|homes?\s*sold|price\s*per\s*sq|cap\s*rate|rentals?|outlook|forecast|trend[s]?|future\b|buyer'?s\s*market|seller'?s\s*market|affordability)/.test(m)
}
