export const runtime = 'edge'

import { NextRequest } from 'next/server'

type DSEnv = {
  DOCUSIGN_ENV?: string
  DOCUSIGN_CLIENT_ID?: string
  DOCUSIGN_USER_ID?: string
  DOCUSIGN_PRIVATE_KEY_BASE64?: string
  DOCUSIGN_ACCOUNT_ID?: string
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

async function testAccessToken(env: DSEnv): Promise<string> {
  const { DOCUSIGN_CLIENT_ID, DOCUSIGN_USER_ID, DOCUSIGN_PRIVATE_KEY_BASE64, DOCUSIGN_ENV } = env
  if (!DOCUSIGN_CLIENT_ID || !DOCUSIGN_USER_ID || !DOCUSIGN_PRIVATE_KEY_BASE64) {
    throw new Error('DocuSign env missing (client id, user id, private key)')
  }
  
  try {
  const iss = DOCUSIGN_CLIENT_ID
  const sub = DOCUSIGN_USER_ID
  // Aud must be the account host name (no scheme)
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

    // Decode the base64 encoded key to get the proper PEM format
    const keyPem = atob(DOCUSIGN_PRIVATE_KEY_BASE64)
    console.log('Private key format check - starts with:', keyPem.substring(0, 50))
    
    // Check if the key is in PKCS#1 format and needs conversion
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
      console.error('DocuSign token error response:', errText)
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

export async function GET(req: NextRequest) {
  try {
    const env = {
      DOCUSIGN_ENV: process.env.DOCUSIGN_ENV,
      DOCUSIGN_CLIENT_ID: process.env.DOCUSIGN_CLIENT_ID,
      DOCUSIGN_USER_ID: process.env.DOCUSIGN_USER_ID,
      DOCUSIGN_PRIVATE_KEY_BASE64: process.env.DOCUSIGN_PRIVATE_KEY_BASE64,
      DOCUSIGN_ACCOUNT_ID: process.env.DOCUSIGN_ACCOUNT_ID,
    } as DSEnv

    console.log('DocuSign env check:', {
      hasClientId: !!env.DOCUSIGN_CLIENT_ID,
      hasUserId: !!env.DOCUSIGN_USER_ID,
      hasPrivateKey: !!env.DOCUSIGN_PRIVATE_KEY_BASE64,
      hasAccountId: !!env.DOCUSIGN_ACCOUNT_ID,
      environment: env.DOCUSIGN_ENV
    })

    // Test access token generation
    console.log('Testing DocuSign access token generation...')
    const accessToken = await testAccessToken(env)
    console.log('Access token obtained successfully, length:', accessToken.length)
    
    const base = dsBaseUrl(env.DOCUSIGN_ENV)
    const accountId = env.DOCUSIGN_ACCOUNT_ID
    if (!accountId) throw new Error('DOCUSIGN_ACCOUNT_ID missing')

    // Test account info endpoint
    const accountInfoUrl = `${base}/restapi/v2.1/accounts/${accountId}`
    console.log('Testing account info at:', accountInfoUrl)
    
    const accountResp = await fetch(accountInfoUrl, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })
    
    if (!accountResp.ok) {
      const errorText = await accountResp.text()
      console.error('Account info test failed:', accountResp.status, errorText)
      throw new Error(`Account info test failed: ${accountResp.status} ${errorText}`)
    }
    
    const accountInfo = await accountResp.json()
    console.log('Account info retrieved successfully')
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'DocuSign credentials are valid!',
      accountInfo: {
        accountId: accountInfo.accountId,
        accountName: accountInfo.accountName,
        baseUri: accountInfo.baseUri
      }
    }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    })
    
  } catch (e: any) {
    console.error('DocuSign test error:', e)
    return new Response(JSON.stringify({ 
      success: false,
      error: e?.message || 'DocuSign test failed' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
