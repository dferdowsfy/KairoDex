export const runtime = 'edge'

import { NextRequest } from 'next/server'

type DSEnv = {
  DOCUSIGN_ENV?: string
  DOCUSIGN_CLIENT_ID?: string
  DOCUSIGN_USER_ID?: string
  DOCUSIGN_PRIVATE_KEY_BASE64?: string
  DOCUSIGN_ACCOUNT_ID?: string
  // Optional raw PEM (fallback) so deployments can supply either
  DOCUSIGN_PRIVATE_KEY?: string
}

function dsBaseUrl(env: string | undefined) {
  return env === 'prod' ? 'https://www.docusign.net' : 'https://demo.docusign.net'
}

// OAuth token host name (used for JWT aud) must be the account server host
function dsAccountHost(env: string | undefined) {
  return env === 'prod' ? 'account.docusign.com' : 'account-d.docusign.com'
}

function dsTokenUrl(env: string | undefined) {
  return `https://${dsAccountHost(env)}/oauth/token`
}

function resolvePrivateKey(env: DSEnv): { pem: string, source: string } {
  // Priority: base64 wrapper, else raw PEM, else error
  if (env.DOCUSIGN_PRIVATE_KEY_BASE64) {
    try {
      const decoded = atob(env.DOCUSIGN_PRIVATE_KEY_BASE64)
      return { pem: decoded, source: 'DOCUSIGN_PRIVATE_KEY_BASE64' }
    } catch (e) {
      throw new Error('Failed to base64 decode DOCUSIGN_PRIVATE_KEY_BASE64 – ensure it is a base64 of the full PEM including BEGIN/END lines')
    }
  }
  if (env.DOCUSIGN_PRIVATE_KEY) {
    return { pem: env.DOCUSIGN_PRIVATE_KEY, source: 'DOCUSIGN_PRIVATE_KEY' }
  }
  throw new Error('No DocuSign private key provided (set DOCUSIGN_PRIVATE_KEY_BASE64 or DOCUSIGN_PRIVATE_KEY)')
}

async function getAccessToken(env: DSEnv): Promise<string> {
  const { DOCUSIGN_CLIENT_ID, DOCUSIGN_USER_ID, DOCUSIGN_ENV } = env
  if (!DOCUSIGN_CLIENT_ID || !DOCUSIGN_USER_ID) {
    throw new Error('DocuSign env missing (client id or user id)')
  }

  const { pem: keyPem, source: keySource } = resolvePrivateKey(env)
  
  try {
    const iss = DOCUSIGN_CLIENT_ID
    const sub = DOCUSIGN_USER_ID
    const aud = dsAccountHost(DOCUSIGN_ENV)
    const now = Math.floor(Date.now() / 1000)

    const jwtHeader = { alg: 'RS256', typ: 'JWT' }
    const jwtPayload: any = {
      iss,
      sub,
      aud,
      iat: now,
      exp: now + 600,
      scope: 'signature impersonation',
    }

    const header = btoa(JSON.stringify(jwtHeader)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    const payload = btoa(JSON.stringify(jwtPayload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    const data = `${header}.${payload}`

    console.log('JWT header and payload prepared')

    console.log('Private key source:', keySource, 'starts with:', keyPem.substring(0, 30))

    if (keyPem.includes('RSA PRIVATE KEY')) {
      throw new Error('Private key must be in PKCS#8 format. Please convert your RSA PRIVATE KEY to PRIVATE KEY format using: openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in rsa_key.pem -out pkcs8_key.pem')
    }
    
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      pemToArrayBuffer(keyPem),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    )
    console.log('Crypto key imported successfully')
    
    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(data))
    console.log('JWT signature created')
    
    const jwt = `${data}.${arrayBufferToBase64Url(signature)}`

    const tokenUrl = dsTokenUrl(DOCUSIGN_ENV)
    const form = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    })
    console.log('Requesting DocuSign token from:', tokenUrl)
    
    const resp = await fetch(tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form })
    if (!resp.ok) {
      const errText = await resp.text()
      console.error('DocuSign token error response:', resp.status, errText)
      // Detect consent requirement
      if (/consent_required/i.test(errText)) {
        throw new Error(`Consent required for integration key. Visit /api/docusign/consent then grant access, then retry. Raw: ${resp.status} ${errText}`)
      }
      throw new Error(`DocuSign token error: ${resp.status} ${errText}`)
    }
    const json = await resp.json()
    console.log('DocuSign token received successfully')
    return json.access_token as string
  } catch (e) {
    console.error('JWT generation error:', e)
    throw new Error(`Failed to generate DocuSign access token: ${e}`)
  }
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  try {
    // Clean the PEM by removing headers/footers and whitespace
    const cleanPem = pem
      .replace(/-----BEGIN[\s\S]*?-----\n?/g, '')
      .replace(/-----END[\s\S]*?-----\n?/g, '')
      .replace(/\s+/g, '')
      .trim()
    
    console.log('Cleaned PEM length:', cleanPem.length)
    console.log('Original key type:', pem.includes('RSA PRIVATE KEY') ? 'PKCS#1 (RSA)' : 'PKCS#8')
    
    if (!cleanPem) {
      throw new Error('Empty private key after cleaning')
    }
    
    const binStr = atob(cleanPem)
    const bytes = new Uint8Array(binStr.length)
    for (let i = 0; i < binStr.length; i++) {
      bytes[i] = binStr.charCodeAt(i)
    }
    console.log('PEM converted to buffer, size:', bytes.buffer.byteLength)
    return bytes.buffer
  } catch (e) {
    console.error('PEM parsing error:', e)
    throw new Error(`Invalid private key format: ${e}`)
  }
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export async function POST(req: NextRequest) {
  try {
    const env: DSEnv = {
      DOCUSIGN_ENV: process.env.DOCUSIGN_ENV,
      DOCUSIGN_CLIENT_ID: process.env.DOCUSIGN_CLIENT_ID,
      DOCUSIGN_USER_ID: process.env.DOCUSIGN_USER_ID,
      DOCUSIGN_PRIVATE_KEY_BASE64: process.env.DOCUSIGN_PRIVATE_KEY_BASE64,
      DOCUSIGN_ACCOUNT_ID: process.env.DOCUSIGN_ACCOUNT_ID,
      DOCUSIGN_PRIVATE_KEY: process.env.DOCUSIGN_PRIVATE_KEY,
    }

    console.log('DocuSign env check:', {
      hasClientId: !!env.DOCUSIGN_CLIENT_ID,
      hasUserId: !!env.DOCUSIGN_USER_ID,
      hasPrivateKey: !!(env.DOCUSIGN_PRIVATE_KEY_BASE64 || env.DOCUSIGN_PRIVATE_KEY),
      hasAccountId: !!env.DOCUSIGN_ACCOUNT_ID,
      environment: env.DOCUSIGN_ENV
    })

    const { text, name, contractId } = await req.json()
    if (!text && !contractId) return new Response(JSON.stringify({ error: 'Provide text or contractId' }), { status: 400 })

    // Ensure we have the amended text: prefer direct text else fetch from Supabase by id
    let finalText = (text || '').toString()
    let fileName = (name || 'Contract').toString()
    if (!finalText && contractId) {
      const { createClient } = await import('@supabase/supabase-js')
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
      
      if (!supabaseUrl || !supabaseKey) {
        console.error('Supabase config missing for DocuSign:', { 
          hasUrl: !!supabaseUrl, 
          hasKey: !!supabaseKey,
          envKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
        })
        throw new Error('Supabase configuration missing')
      }
      
      const supabase = createClient(supabaseUrl, supabaseKey)
      const { data: contract, error } = await supabase.from('contract_files').select('*').eq('id', contractId).single()
      if (error || !contract) throw new Error('Contract not found')
  finalText = contract?.metadata?.amended_content || contract?.metadata?.initial_content || ''
      fileName = contract?.contract_name || fileName
      if (!finalText) throw new Error('No amended text available for this contract')
    }

    console.log('Contract data:', { hasText: !!finalText, fileName, textLength: finalText.length })

    // Convert text to PDF via existing route
    const pdfRes = await fetch(new URL('/api/contracts/pdf', req.url).toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: finalText, name: fileName })
    })
    if (!pdfRes.ok) {
      const err = await pdfRes.text()
      throw new Error(`PDF generation failed: ${pdfRes.status} ${err}`)
    }
    const pdfBytes = new Uint8Array(await pdfRes.arrayBuffer())
    const base64Doc = btoa(String.fromCharCode(...pdfBytes))

    console.log('PDF generated, size:', pdfBytes.length, 'bytes')

    // Get access token (JWT grant)
    console.log('Getting DocuSign access token...')
    let accessToken: string
    try {
      accessToken = await getAccessToken(env)
    } catch (tokenErr: any) {
      return new Response(JSON.stringify({
        error: 'Token generation failed',
        stage: 'token',
        details: tokenErr?.message,
        hint: tokenErr?.message?.includes('Consent required') ? 'Open /api/docusign/consent, approve, then retry.' : undefined
      }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
    console.log('Access token obtained, length:', accessToken.length)
    
    const base = dsBaseUrl(env.DOCUSIGN_ENV)
    const accountId = env.DOCUSIGN_ACCOUNT_ID
    if (!accountId) throw new Error('DOCUSIGN_ACCOUNT_ID missing')

    // Create envelope (draft) with a single document
    const createEnvelopeUrl = `${base}/restapi/v2.1/accounts/${accountId}/envelopes`
    console.log('Creating envelope at:', createEnvelopeUrl)
    
    const envelope = {
      emailSubject: `Please review: ${fileName}`,
      status: 'created',
      documents: [
        {
          documentBase64: base64Doc,
          name: `${fileName}.pdf`,
          fileExtension: 'pdf',
          documentId: '1',
        }
      ],
      recipients: {
        signers: [],
      }
    }
    const envResp = await fetch(createEnvelopeUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope)
    })
    if (!envResp.ok) {
      const t = await envResp.text()
      console.error('Envelope creation failed:', envResp.status, t)
      return new Response(JSON.stringify({
        error: 'Envelope creation failed',
        stage: 'envelope',
        status: envResp.status,
        docusign: t
      }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
    const envJson = await envResp.json()
    const envelopeId = envJson.envelopeId
    console.log('Envelope created:', envelopeId)

    // Create sender view (embedded sending UI)
    const senderViewUrl = `${base}/restapi/v2.1/accounts/${accountId}/envelopes/${envelopeId}/views/sender`
    const returnUrl = new URL('/tasks?quick=amend', req.url).toString()
    console.log('Creating sender view at:', senderViewUrl, 'with returnUrl:', returnUrl)
    
    const viewReq = {
      returnUrl,
      envelopeId,
      isSending: true,
    }
    const viewResp = await fetch(senderViewUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(viewReq)
    })
    if (!viewResp.ok) {
      const t = await viewResp.text()
      console.error('Sender view creation failed:', viewResp.status, t)
      return new Response(JSON.stringify({
        error: 'Sender view creation failed',
        stage: 'sender_view',
        status: viewResp.status,
        docusign: t
      }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
    const viewJson = await viewResp.json()
    console.log('Sender view created successfully')
    
    return new Response(JSON.stringify({ url: viewJson.url, envelopeId }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e: any) {
    console.error('DocuSign sender-view error (outer catch):', e)
    return new Response(JSON.stringify({ error: e?.message || 'DocuSign error', stage: 'unexpected' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
