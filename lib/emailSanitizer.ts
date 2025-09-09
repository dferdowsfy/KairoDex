// Utility to remove an in-body Subject line duplication from email content
// Handles both plain text and simple HTML (<p>Subject: ...</p>) patterns.
export function sanitizeEmailBody(subject: string, content: string): string {
  if (!subject || !content) return content
  let updated = content

  const normSubject = subject.trim().toLowerCase()

  // HTML pattern: leading <p>Subject: ...</p>
  const htmlSubjectRegex = /^\s*<p[^>]*>\s*Subject:\s*(.*?)<\/p>\s*/i
  const mHtml = updated.match(htmlSubjectRegex)
  if (mHtml) {
    const inner = (mHtml[1] || '').trim().toLowerCase()
    if (inner === normSubject || normSubject.startsWith(inner) || inner.startsWith(normSubject)) {
      updated = updated.replace(htmlSubjectRegex, '')
      return updated.trimStart()
    }
  }

  // Plain text pattern at very top
  const plainRegex = /^\s*Subject:\s*(.*?)\n+/i
  const mPlain = updated.match(plainRegex)
  if (mPlain) {
    const inner = (mPlain[1] || '').trim().toLowerCase()
    if (inner === normSubject || normSubject.startsWith(inner) || inner.startsWith(normSubject)) {
      updated = updated.replace(plainRegex, '')
      return updated.trimStart()
    }
  }

  // Fallback: if the entire content starts with the subject itself (no 'Subject:' prefix)
  const stripped = updated.trimStart()
  if (stripped.toLowerCase().startsWith(normSubject + '\n')) {
    return stripped.slice(normSubject.length + 1).trimStart()
  }

  return updated
}

// Remove or replace bracketed placeholders like [Recipient's Name], [specific topic], [time], [address]
export function cleanPlaceholders(content: string, clientName?: string, userName?: string): string {
  if (!content) return content
  let out = content

  // Common placeholders and preferred replacements
  const mappings: Array<[RegExp, string]> = [
    [/\[Recipient's Name\]/gi, clientName || ''],
    [/\[Recipient\'s Name\]/gi, clientName || ''],
    [/\[Recipient Name\]/gi, clientName || ''],
    [/\[Recipient\]/gi, clientName || ''],
    [/\[specific topic\]/gi, ''],
    [/\[specific topic\]/gi, ''],
    [/\[time\]/gi, ''],
    [/\[address\]/gi, ''],
    [/\[date\]/gi, ''],
    [/\[Your Name\]/gi, userName || ''],
  ]

  for (const [re, repl] of mappings) {
    out = out.replace(re, repl)
  }

  // Remove any remaining bracketed tokens like [something] to avoid placeholders in emails
  out = out.replace(/\[[^\]]+\]/g, '')

  // Collapse multiple spaces and clean up leftover punctuation from removals
  out = out.replace(/\s{2,}/g, ' ').replace(/\s+([.,!?;:])/g, '$1')

  return out.trim()
}
