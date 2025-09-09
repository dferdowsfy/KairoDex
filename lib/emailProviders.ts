import nodemailer from 'nodemailer'
import type SMTPTransport from 'nodemailer/lib/smtp-transport'
import { Resend } from 'resend'

// Email provider configuration
interface EmailProviderResult {
  success: boolean
  messageId?: string
  error?: string
  previewUrl?: string
  meta?: Record<string, any>
}

export interface SendEmailOptions {
  to: string
  subject: string
  content: string
  fromEmail?: string
  fromName?: string
  replyTo?: string
  textFallback?: string
}

interface EmailProvider {
  name: string
  send: (opts: SendEmailOptions) => Promise<EmailProviderResult>
}

// Gmail/Outlook OAuth configuration (placeholder for real implementation)
let cachedTestAccount: { user: string; pass: string } | null = null

const createTransporter = async () => {
  const hasRealCreds = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)

  // If real creds provided, use them directly
  if (hasRealCreds) {
    const opts: SMTPTransport.Options = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!
      }
    }
    return nodemailer.createTransport(opts)
  }

  // Otherwise auto-create (or reuse) an Ethereal test account transparently
  if (!cachedTestAccount) {
    cachedTestAccount = await nodemailer.createTestAccount().catch(err => {
      console.warn('Failed to create Ethereal test account, falling back to static dev credentials.', err)
      return { user: 'test@ethereal.email', pass: 'test-password' }
    }) as any
  }

  const acct = cachedTestAccount || { user: 'test@ethereal.email', pass: 'test-password' }
  const opts: SMTPTransport.Options = {
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: acct.user,
      pass: acct.pass
    }
  }
  return nodemailer.createTransport(opts)
}

export const EmailProviders: Record<string, EmailProvider> = {
  // Resend provider
  resend: {
    name: 'Resend',
    send: async (opts: SendEmailOptions) => {
      const apiKey = process.env.RESEND_API_KEY
      if (!apiKey) {
        return { success: false, error: 'RESEND_API_KEY not configured' }
      }
      try {
        const resend = new Resend(apiKey)
        // Always prefer a verified project-level from address; only substitute user local part if same domain
        const appFrom = process.env.FROM_EMAIL || 'notifications@resend.dev'
        const userFrom = opts.fromEmail
        const appDomain = appFrom.split('@')[1] || ''
        let chosenFrom = appFrom
        let replyTo = opts.replyTo
        if (userFrom) {
          const userDomain = userFrom.split('@')[1] || ''
            if (userDomain.toLowerCase() === appDomain.toLowerCase()) {
              // Safe to send directly as that user address on same verified domain
              chosenFrom = userFrom
            } else {
              // Different domain: keep platform From but set reply-to to user's mailbox
              replyTo = replyTo || userFrom
            }
        }
        const fromName = opts.fromName || process.env.RESEND_FROM_NAME
        const from = fromName ? `${fromName} <${chosenFrom}>` : chosenFrom
        const result = await resend.emails.send({
          from,
          to: [opts.to],
          subject: opts.subject,
          html: opts.content,
          reply_to: replyTo || undefined
        })
        if ((result as any).error) {
          const errObj = (result as any).error
          console.error('Resend send error:', errObj)
          return { success: false, error: errObj.message || 'Resend API error', meta: { code: errObj.code, name: errObj.name, from, chosenFrom, userFrom, replyTo } }
        }
        return {
          success: true,
          messageId: (result as any).data?.id,
          meta: { id: (result as any).data?.id, from, chosenFrom, userFrom, replyTo }
        }
      } catch (e:any) {
        console.error('Resend exception:', e)
        return { success: false, error: e.message, meta: { stack: e.stack } }
      }
    }
  },
  // Nodemailer SMTP provider
  smtp: {
    name: 'SMTP',
    send: async (opts: SendEmailOptions) => {
      try {
        const transporter = await createTransporter()
        const baseFrom = opts.fromEmail || process.env.FROM_EMAIL || 'noreply@agenthub.com'
        const from = opts.fromName ? `${opts.fromName} <${baseFrom}>` : baseFrom
        const info = await transporter.sendMail({
          from,
          to: opts.to,
          subject: opts.subject,
          html: opts.content,
          text: (opts.textFallback || opts.content.replace(/<[^>]*>/g, '')),
          replyTo: opts.replyTo
        })

        const previewUrl = nodemailer.getTestMessageUrl(info) || undefined
        return {
          success: true,
          messageId: info.messageId,
          previewUrl,
          meta: {
            envelope: info.envelope,
            accepted: info.accepted,
            rejected: info.rejected,
            response: info.response,
            using: process.env.SMTP_HOST ? 'configured-smtp' : 'ethereal'
          }
        }
      } catch (error: any) {
        console.error('SMTP send error:', error)
        return {
          success: false,
          error: error.message
        }
      }
    }
  },

  // Mock provider for development
  mock: {
    name: 'Mock Provider',
  send: async (opts: SendEmailOptions) => {
      // Simulate email sending with some random delay and occasional failures
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500))
      
      const success = Math.random() > 0.1 // 90% success rate for testing
      
      return {
        success,
        messageId: success ? `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` : undefined,
    error: success ? undefined : 'Mock delivery failure for testing',
    meta: { simulatedLatencyMs: '≈' + (Math.random()*1000+500).toFixed(0) }
      }
    }
  }
}

// Get the current email provider based on environment
export const getCurrentProvider = (): EmailProvider => {
  const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS === 'true'
  
  if (useMocks) {
    return EmailProviders.mock
  }
  
  // Prefer Resend if configured
  if (process.env.RESEND_API_KEY) {
    return EmailProviders.resend
  }

  // Check if SMTP is configured
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return EmailProviders.smtp
  }
  
  // Fallback to mock if no provider is configured
  console.warn('No email provider configured, falling back to mock mode')
  return EmailProviders.mock
}

// Send email using the current provider
type SendEmailReturn = Promise<{ success: boolean; messageId?: string; error?: string; provider: string; previewUrl?: string; meta?: Record<string, any> }>

// Backward compatible overloads
export async function sendEmail(to: string, subject: string, content: string): SendEmailReturn
export async function sendEmail(opts: SendEmailOptions): SendEmailReturn
export async function sendEmail(arg1: any, arg2?: string, arg3?: string): SendEmailReturn {
  const provider = getCurrentProvider()
  let options: SendEmailOptions
  if (typeof arg1 === 'string') {
    options = { to: arg1, subject: arg2 || '', content: arg3 || '' }
  } else {
    options = arg1 as SendEmailOptions
  }
  const result = await provider.send(options)
  return { ...result, provider: provider.name }
}
