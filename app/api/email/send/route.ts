export const runtime = 'edge'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { provider, to, subject, body } = await req.json()
    if (!provider || !to || !body) {
      return new Response(JSON.stringify({ error: 'provider, to, and body are required' }), { status: 400 })
    }

    const useMocks = (process.env.NEXT_PUBLIC_USE_MOCKS ?? 'true') !== 'false'

    if (useMocks) {
      // Simulate sending without leaving the page
      return new Response(JSON.stringify({ ok: true, provider, to }), { status: 200 })
    }

    // Placeholder for real integrations (OAuth + provider APIs)
    // Gmail: Gmail API via OAuth2 (users.messages.send)
    // Outlook: Microsoft Graph /sendMail
    return new Response(JSON.stringify({ error: 'Email provider not configured' }), { status: 501 })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Unexpected', details: e?.message }), { status: 500 })
  }
}
