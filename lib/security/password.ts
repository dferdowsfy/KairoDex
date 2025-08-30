import crypto from 'crypto'

export type PasswordCheckInput = {
  password: string
  email?: string
  firstName?: string
  lastName?: string
}

export type PasswordCheckResult = {
  ok: boolean
  issues: string[]
  breached?: boolean
}

const COMMON_PASSWORDS = new Set<string>([
  'password','123456','123456789','12345678','qwerty','111111','123123','abc123','password1','iloveyou','admin','welcome','letmein','monkey','dragon','baseball','football','qwerty123','1q2w3e4r','zaq12wsx','sunshine','princess','login','solo','starwars','trustno1'
])

function hasUpper(s: string) { return /[A-Z]/.test(s) }
function hasLower(s: string) { return /[a-z]/.test(s) }
function hasDigit(s: string) { return /\d/.test(s) }
function hasSymbol(s: string) { return /[^A-Za-z0-9]/.test(s) }

function containsTrivialPersonal(password: string, email?: string, firstName?: string, lastName?: string) {
  const p = password.toLowerCase()
  const parts: string[] = []
  if (email) {
    const [local] = email.toLowerCase().split('@')
    if (local) parts.push(local)
    const dom = email.split('@')[1]
    if (dom) parts.push(dom.split('.')[0])
  }
  if (firstName) parts.push(firstName.toLowerCase())
  if (lastName) parts.push(lastName.toLowerCase())
  for (const part of parts.filter(Boolean)) {
    if (part.length >= 3 && (p.includes(part) || p.includes(part.split('').reverse().join('')))) return true
  }
  return false
}

function hasRepeatingSequences(password: string) {
  // e.g., aaaa, 1111, ababab, 123123
  if (/(.)\1{3,}/.test(password)) return true
  // repeated substrings 2+ times
  for (let len = 2; len <= 4; len++) {
    const re = new RegExp(`(.{${len}})\\1{2,}`, 'i')
    if (re.test(password)) return true
  }
  // ascending sequences like 123456, abcdef
  const lower = password.toLowerCase()
  const sequences = ['abcdefghijklmnopqrstuvwxyz', '0123456789']
  for (const seq of sequences) {
    for (let i = 0; i <= seq.length - 6; i++) {
      const sub = seq.slice(i, i + 6)
      if (lower.includes(sub) || lower.includes(sub.split('').reverse().join(''))) return true
    }
  }
  return false
}

export async function checkPasswordPolicy(input: PasswordCheckInput): Promise<PasswordCheckResult> {
  const { password, email, firstName, lastName } = input
  const issues: string[] = []
  if (!password || password.length < 12) issues.push('Password must be at least 12 characters.')
  if (!hasUpper(password)) issues.push('Add an uppercase letter.')
  if (!hasLower(password)) issues.push('Add a lowercase letter.')
  if (!hasDigit(password)) issues.push('Add a number.')
  if (!hasSymbol(password)) issues.push('Add a symbol.')
  if (COMMON_PASSWORDS.has(password.toLowerCase())) issues.push('Password is too common.')
  if (containsTrivialPersonal(password, email, firstName, lastName)) issues.push('Avoid using your name or email in the password.')
  if (hasRepeatingSequences(password)) issues.push('Avoid repeating or sequential patterns.')

  let breached = false
  try {
    if (process.env.HIBP_CHECK !== 'off') {
      breached = await isBreachedPassword(password)
      if (breached) issues.push('This password appears in known breaches. Choose another.')
    }
  } catch {
    // ignore network errors; offline fallback above already checked
  }

  return { ok: issues.length === 0, issues, breached }
}

export async function isBreachedPassword(password: string): Promise<boolean> {
  // HaveIBeenPwned k-anonymity (SHA-1)
  const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase()
  const prefix = sha1.slice(0, 5)
  const suffix = sha1.slice(5)
  const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    headers: { 'Add-Padding': 'true' },
    // Prevent caching sensitive responses in shared proxies
    cache: 'no-store'
  })
  if (!res.ok) return false
  const text = await res.text()
  const lines = text.split('\n')
  for (const line of lines) {
    const [suf/* , count */] = line.trim().split(':')
    if (suf === suffix) return true
  }
  return false
}
