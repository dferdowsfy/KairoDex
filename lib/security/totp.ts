import crypto from 'crypto'

// Crockford Base32 alphabet (RFC 4648 without padding for otpauth)
const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32Encode(buf: Uint8Array): string {
  let bits = 0
  let value = 0
  let output = ''
  for (const byte of buf) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += B32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) {
    output += B32_ALPHABET[(value << (5 - bits)) & 31]
  }
  return output
}

export function base32Decode(input: string): Uint8Array {
  const clean = input.replace(/=+$/,'').toUpperCase().replace(/\s/g,'')
  let bits = 0
  let value = 0
  const bytes: number[] = []
  for (const ch of clean) {
    const idx = B32_ALPHABET.indexOf(ch)
    if (idx === -1) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Uint8Array.from(bytes)
}

export function generateTotpSecret(bytes = 20) {
  const buf = crypto.randomBytes(bytes)
  const b32 = base32Encode(buf)
  return { secret: b32 }
}

export function totpCode(secretB32: string, timeStep = 30, digits = 6, t = Date.now()) {
  const key = base32Decode(secretB32)
  const counter = Math.floor(t / 1000 / timeStep)
  const msg = Buffer.alloc(8)
  msg.writeBigUInt64BE(BigInt(counter))
  const hmac = crypto.createHmac('sha1', Buffer.from(key)).update(msg).digest()
  const offset = hmac[hmac.length - 1] & 0x0f
  const code = ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | (hmac[offset + 3])
  const str = (code % 10 ** digits).toString().padStart(digits, '0')
  return str
}

export function verifyTotp(secretB32: string, token: string, window = 1, timeStep = 30, digits = 6, t = Date.now()) {
  const ts = t
  for (let w = -window; w <= window; w++) {
    const tt = ts + w * timeStep * 1000
    if (totpCode(secretB32, timeStep, digits, tt) === token) return true
  }
  return false
}

export function otpauthURL({ secretB32, label, issuer }: { secretB32: string; label: string; issuer?: string }) {
  const iss = issuer ? `&issuer=${encodeURIComponent(issuer)}` : ''
  return `otpauth://totp/${encodeURIComponent(label)}?secret=${secretB32}${iss}`
}
