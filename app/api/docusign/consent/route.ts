export const runtime = 'edge'

// Returns a consent URL to grant signature+impersonation scopes to the integration key/user
export async function GET(req: Request) {
  try {
    const base = (process.env.DOCUSIGN_ENV === 'prod' ? 'https://account.docusign.com' : 'https://account-d.docusign.com')
    const clientId = process.env.DOCUSIGN_CLIENT_ID
    const redirectUri = process.env.DOCUSIGN_REDIRECT_URI || new URL('/api/docusign/callback', req.url).toString()
    if (!clientId) return new Response(JSON.stringify({ error: 'DOCUSIGN_CLIENT_ID missing' }), { status: 500 })

    const url = new URL(base + '/oauth/auth')
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('scope', 'signature impersonation')
    url.searchParams.set('client_id', clientId)
    url.searchParams.set('redirect_uri', redirectUri)

    return new Response(JSON.stringify({ url: url.toString() }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Failed to build consent URL' }), { status: 500 })
  }
}
