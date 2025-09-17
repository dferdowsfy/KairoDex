// Minimal JS copy of the needed functions for quick testing
function sanitizeEmailBody(subject, content) {
  if (!subject || !content) return content
  let updated = content

  const normSubject = subject.trim().toLowerCase()
  const htmlSubjectRegex = /^\s*<p[^>]*>\s*Subject:\s*(.*?)<\/p>\s*/i
  const mHtml = updated.match(htmlSubjectRegex)
  if (mHtml) {
    const inner = (mHtml[1] || '').trim().toLowerCase()
    if (inner === normSubject || normSubject.startsWith(inner) || inner.startsWith(normSubject)) {
      updated = updated.replace(htmlSubjectRegex, '')
      return updated.trimStart()
    }
  }

  const plainRegex = /^\s*Subject:\s*(.*?)\n+/i
  const mPlain = updated.match(plainRegex)
  if (mPlain) {
    const inner = (mPlain[1] || '').trim().toLowerCase()
    if (inner === normSubject || normSubject.startsWith(inner) || inner.startsWith(normSubject)) {
      updated = updated.replace(plainRegex, '')
      return updated.trimStart()
    }
  }

  const stripped = updated.trimStart()
  if (stripped.toLowerCase().startsWith(normSubject + '\n')) {
    return stripped.slice(normSubject.length + 1).trimStart()
  }

  return updated
}

function cleanPlaceholders(content, clientName, userName) {
  if (!content) return content
  let out = content

  const mappings = [
    [/\[Recipient's Name\]/gi, clientName || ''],
    [/\[Recipient'\s?s Name\]/gi, clientName || ''],
    [/\[Recipient Name\]/gi, clientName || ''],
    [/\[Recipient\]/gi, clientName || ''],
    [/\[specific topic\]/gi, ''],
    [/\[time\]/gi, ''],
    [/\[address\]/gi, ''],
    [/\[date\]/gi, ''],
    [/\[Your Name\]/gi, userName || ''],
  ]

  for (const [re, repl] of mappings) out = out.replace(re, repl)
  out = out.replace(/\[[^\]]+\]/g, '')
  out = out.replace(/\r\n/g, '\n')
  out = out.replace(/\n{3,}/g, '\n\n')
  out = out.replace(/[ \t]{2,}/g, ' ')
  out = out.replace(/[ \t]+([.,!?;:])/g, '$1')
  out = out.split('\n').map(line => line.trim()).join('\n')
  return out.replace(/^\s+|\s+$/g, '')
}

module.exports = { sanitizeEmailBody, cleanPlaceholders }
