type Key = string

const buckets = new Map<Key, { count: number; resetAt: number }>()

export function rateLimit({ key, limit, windowMs }: { key: Key; limit: number; windowMs: number }) {
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs }
  }
  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt }
  }
  bucket.count += 1
  return { allowed: true, remaining: limit - bucket.count, resetAt: bucket.resetAt }
}

export function deviceFingerprint(headers: Headers) {
  const ua = headers.get('user-agent') || ''
  const accept = headers.get('accept') || ''
  const lang = headers.get('accept-language') || ''
  const enc = headers.get('accept-encoding') || ''
  return `${ua}|${accept}|${lang}|${enc}`.slice(0, 256)
}
