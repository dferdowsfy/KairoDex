import { describe, it, expect, vi } from 'vitest'
import { sendEmail } from '@/lib/emailProviders'

// Basic unit tests for new sendEmail overload

describe('sendEmail overload', () => {
  it('supports legacy signature', async () => {
    const res = await sendEmail('legacy@example.com', 'Legacy Subject', '<p>Hello</p>')
    expect(res).toHaveProperty('provider')
    expect(res).toHaveProperty('success')
  })

  it('supports options signature with replyTo', async () => {
    const res = await sendEmail({
      to: 'opt@example.com',
      subject: 'Opt Subject',
      content: '<b>Hi</b>',
      fromEmail: 'user@example.com',
      fromName: 'User Example',
      replyTo: 'user@example.com'
    })
    expect(res).toHaveProperty('provider')
    expect(res).toHaveProperty('success')
  })
})
