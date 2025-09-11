import { marked } from 'marked'
// @ts-ignore - types may not be present in some environments
import sanitizeHtml from 'sanitize-html'

export function markdownToHtml(md: string): string {
  const raw = marked.parse(md || '') as string
  return sanitizeHtml(raw, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img','h1','h2','h3']),
    allowedAttributes: { a: ['href','name','target','rel'], img: ['src','alt'], '*': ['style'] }
  })
}

export function validateEnv() {
  const base = ['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','RESEND_API_KEY','RESEND_FROM']
  const model = process.env.LLM_MODEL || 'gpt-4.1'
  const llmKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY
  const missing: string[] = []
  for (const k of base) if (!process.env[k]) missing.push(k)
  if (!llmKey) missing.push('OPENAI_API_KEY or OPENROUTER_API_KEY')
  if (missing.length) {
    console.warn('[env] Missing vars:', missing.join(', '))
  }
  return { model }
}
