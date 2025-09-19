export const runtime = 'edge'

// Simple diagnostics endpoint to verify which DocuSign env vars are present in this deployment.
// Does NOT leak secret contents – only lengths & booleans.
export async function GET() {
  try {
    const vars = {
      DOCUSIGN_ENV: process.env.DOCUSIGN_ENV,
      DOCUSIGN_CLIENT_ID: process.env.DOCUSIGN_CLIENT_ID,
      DOCUSIGN_USER_ID: process.env.DOCUSIGN_USER_ID,
      DOCUSIGN_ACCOUNT_ID: process.env.DOCUSIGN_ACCOUNT_ID,
      DOCUSIGN_PRIVATE_KEY_BASE64: process.env.DOCUSIGN_PRIVATE_KEY_BASE64,
      DOCUSIGN_PRIVATE_KEY: process.env.DOCUSIGN_PRIVATE_KEY,
    }

    const summary = Object.fromEntries(
      Object.entries(vars).map(([k,v]) => [k, v ? (k.includes('PRIVATE') ? { present:true, length: v.length } : v) : null])
    )

    return new Response(JSON.stringify({ ok: true, vars: summary }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || 'status failed'}), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
