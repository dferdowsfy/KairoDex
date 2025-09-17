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

  // Normalize newlines (support CRLF input)
  out = out.replace(/\r\n/g, '\n')

  // Reduce any runs of 3+ newlines down to exactly two (keep paragraph breaks)
  out = out.replace(/\n{3,}/g, '\n\n')

  // Collapse multiple spaces/tabs but do NOT collapse newlines (preserve paragraph spacing)
  out = out.replace(/[ \t]{2,}/g, ' ')

  // Remove spaces/tabs before punctuation but leave newlines intact
  out = out.replace(/[ \t]+([.,!?;:])/g, '$1')

  // Trim each line individually to remove accidental leading/trailing spaces while preserving blank lines
  out = out.split('\n').map(line => line.trim()).join('\n')

  // Trim overall leading/trailing whitespace
  return out.replace(/^\s+|\s+$/g, '')
}

// Convert plain-text email body into safe HTML with <p> paragraphs.
// - Escapes HTML special chars to avoid XSS
// - Splits on two-or-more newlines into paragraphs
// - Preserves single newlines inside paragraphs as <br />
export function plaintextToHtml(content: string): string {
  if (!content) return ''
  // Normalize newlines
  let out = content.replace(/\r\n/g, '\n')

  // Escape HTML special characters
  const escapeHtml = (s: string) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

  // Split into paragraphs on 2+ newlines, trim each paragraph
  const paragraphs = out.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)

  const html = paragraphs.map(p => {
    // Within a paragraph, convert single line breaks to <br /> for soft breaks
    const withLineBreaks = escapeHtml(p).replace(/\n/g, '<br />')
    return `<p>${withLineBreaks}</p>`
  }).join('\n')

  return html
}
