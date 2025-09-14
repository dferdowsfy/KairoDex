import { marked } from 'marked'
// @ts-ignore - types may not be present in some environments
import sanitizeHtml from 'sanitize-html'

export function markdownToHtml(md: string): string {
  // First, enhance paragraph formatting for better email spacing
  const enhancedMd = md
    .split('\n\n')
    .filter(para => para.trim().length > 0)
    .map(para => para.trim())
    .join('\n\n')
  
  const raw = marked.parse(enhancedMd || '') as string
  
  // Add professional email styling to the HTML
  const styledHtml = raw
    .replace(/<p>/g, '<p style="margin: 0 0 16px 0; line-height: 1.6; color: #333; font-size: 16px; font-family: system-ui, -apple-system, \'Segoe UI\', sans-serif;">')
    .replace(/<\/p>(\s*<p)/g, '</p>$1') // Ensure proper spacing between paragraphs
  
  return sanitizeHtml(styledHtml, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img','h1','h2','h3']),
    allowedAttributes: { 
      a: ['href','name','target','rel'], 
      img: ['src','alt'], 
      '*': ['style'],
      p: ['style']
    }
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
