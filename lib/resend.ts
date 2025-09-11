import { Resend } from 'resend'

const required = ['RESEND_API_KEY','RESEND_FROM'] as const
for (const k of required) {
  if (!process.env[k]) {
    console.error(`[email] Missing env ${k}`)
  }
}

export const resend = new Resend(process.env.RESEND_API_KEY!)
export const RESEND_FROM = process.env.RESEND_FROM || 'Example <noreply@example.com>'
