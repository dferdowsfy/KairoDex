export const runtime = 'edge'

export async function GET() {
  try {
    const privateKey = process.env.DOCUSIGN_PRIVATE_KEY
    
    console.log('Private key length:', privateKey?.length)
    console.log('Private key starts with:', privateKey?.substring(0, 100))
    console.log('Private key ends with:', privateKey?.substring(privateKey.length - 100))
    
    // Clean the PEM
    const cleanPem = privateKey
      ?.replace(/-----BEGIN[\s\S]*?-----\n?/g, '')
      .replace(/-----END[\s\S]*?-----\n?/g, '')
      .replace(/\s+/g, '')
      .trim()
    
    console.log('Clean PEM length:', cleanPem?.length)
    console.log('Clean PEM starts with:', cleanPem?.substring(0, 50))
    console.log('Clean PEM ends with:', cleanPem?.substring(cleanPem.length - 50))
    
    // Test base64 decoding character by character to find the problematic one
    try {
      const testDecode = atob(cleanPem || '')
      console.log('Base64 decode successful, length:', testDecode.length)
      
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Private key base64 decoding works',
        keyLength: privateKey?.length,
        cleanLength: cleanPem?.length,
        decodedLength: testDecode.length
      }), { status: 200 })
    } catch (decodeError) {
      console.error('Base64 decode error:', decodeError)
      return new Response(JSON.stringify({ 
        success: false,
        error: `Base64 decode error: ${decodeError}`,
        keyLength: privateKey?.length,
        cleanLength: cleanPem?.length
      }), { status: 500 })
    }
    
  } catch (e: any) {
    console.error('Debug error:', e)
    return new Response(JSON.stringify({ 
      success: false,
      error: e?.message || 'Debug failed' 
    }), { status: 500 })
  }
}
