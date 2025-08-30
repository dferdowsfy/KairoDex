import { describe, it, expect } from 'vitest'
import { checkPasswordPolicy } from './password'

describe('password policy', () => {
  it('rejects short and simple passwords', async () => {
    const res = await checkPasswordPolicy({ password: 'short' })
    expect(res.ok).toBe(false)
    expect(res.issues.length).toBeGreaterThan(0)
  })
  it('accepts a strong password', async () => {
    const res = await checkPasswordPolicy({ password: 'S7rong!Enough#Pass', email: 'user@example.com' })
    expect(res.ok).toBe(true)
  })
})
