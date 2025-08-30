import { getCityMarketSnapshot, looksLikeRealEstateAsk } from './market'

export interface ContextBundle {
  market?: any
}

export function parseLocationFromText(text: string): { city?: string; state?: string; zip?: string } {
  const out: { city?: string; state?: string; zip?: string } = {}
  try {
    const t = String(text || '')
    // Pattern: City, ST [ZIP]
    const m1 = t.match(/([A-Za-z][A-Za-z\s\.-]{2,}),\s*([A-Za-z]{2})(?:\s+(\d{5}))?/)
    if (m1) {
      out.city = m1[1].trim().replace(/\s+/g, ' ')
      out.state = m1[2].trim().toUpperCase()
      if (m1[3]) out.zip = m1[3]
      return out
    }
    // ZIP only
    const m2 = t.match(/\b(\d{5})(?:-\d{4})?\b/)
    if (m2) out.zip = m2[1]
  } catch {}
  return out
}

export async function getContextBundle(message: string, sheetRow?: any): Promise<ContextBundle | null> {
  const bundle: ContextBundle = {}
  const isMarket = looksLikeRealEstateAsk(message)
  if (isMarket) {
    // Find location: prefer DB row, else parse from the message
    const loc: { city?: string; state?: string; zip?: string } = {}
    try {
      const s: any = sheetRow || {}
      const keys = Object.keys(s)
      for (const k of keys) {
        const kn = k.toLowerCase().replace(/\s+/g, '_')
        const val = String(s[k] ?? '').trim()
        if (!loc.city && /(city|town)/.test(kn)) loc.city = val
        if (!loc.state && /(^|_)state(_|$)|province/.test(kn)) loc.state = val
        if (!loc.zip && /(zip|postal)/.test(kn)) loc.zip = val
        if ((!loc.city || !loc.state) && /location|address/.test(kn)) {
          const m = val.match(/([A-Za-z\s]+),\s*([A-Za-z]{2})(?:\s+(\d{5}))?/)
          if (m) { loc.city ||= m[1]?.trim(); loc.state ||= m[2]?.trim(); loc.zip ||= m[3]?.trim() }
        }
      }
    } catch {}
    if (!loc.city && !loc.zip) {
      const p = parseLocationFromText(message)
      if (p.city || p.zip) Object.assign(loc, p)
    }
    if (loc.city || loc.zip) {
      try {
        const snap = await getCityMarketSnapshot(loc.city, loc.state, loc.zip)
        if (snap) bundle.market = snap
      } catch {}
    }
  }
  return Object.keys(bundle).length ? bundle : null
}
