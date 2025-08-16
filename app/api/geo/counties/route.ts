export const runtime = 'edge'

// Minimal pass-through to US Census Counties API to avoid CORS issues in browsers
// GET /api/geo/counties?state=06  (FIPS 2-digit)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const state = searchParams.get('state')
  if (!state) return new Response(JSON.stringify({ error: 'Missing state FIPS' }), { status: 400 })
  try {
    const url = `https://api.census.gov/data/2023/pep/population?get=NAME&for=county:*&in=state:${encodeURIComponent(state)}`
    const resp = await fetch(url, { cache: 'no-store' })
    if (!resp.ok) throw new Error(`Census error ${resp.status}`)
    const json = await resp.json() as any[]
    const header = json.shift()
    const items = json.map(row => ({
      name: row[0] as string, // NAME
      fips: `${row[1]}${row[2]}` // state + county
    }))
    return new Response(JSON.stringify({ items }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Failed to load counties', details: e?.message }), { status: 500 })
  }
}
