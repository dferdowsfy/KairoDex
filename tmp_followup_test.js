// Temporary test to exercise FollowupComposer post-processing logic
const fs = require('fs')
const path = require('path')

// Inline simplified versions of sanitizeEmailBody and cleanPlaceholders (JS)
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
    [/\[Recipient\'s Name\]/gi, clientName || ''],
    [/\[Recipient Name\]/gi, clientName || ''],
    [/\[Recipient\]/gi, clientName || ''],
    [/\[specific topic\]/gi, ''],
    [/\[time\]/gi, ''],
    [/\[address\]/gi, ''],
    [/\[date\]/gi, ''],
    [/\[Your Name\]/gi, userName || '']
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

function processDraft(raw, clientName='Tom Smith', displayName='Agent Name', subject='Follow-up'){
  let body = raw
  // greeting normalize
  if (body.match(/^(Dear|Hi|Hello)\s*\[?([^\],\n]*)\]?,?/i)) {
    body = body.replace(/^(Dear|Hi|Hello)\s*\[?([^\],\n]*)\]?,?/i, `Hi ${clientName},`)
  } else if (body.match(/^(Dear|Hi|Hello)\s*,/i)) {
    body = body.replace(/^(Dear|Hi|Hello)\s*,/i, `Hi ${clientName},`)
  } else if (!body.match(/^Hi\s+/i)) {
    body = `Hi ${clientName},\n\n${body}`
  }

  body = body.replace(/\(\([^)]*\)\)/g, '')
  body = body.replace(/\(\(/g, '')
  body = body.replace(/\)\)/g, '')
  body = body.replace(/\([^)]*https?:\/\/[^)]*\)/gi, '')
  body = body.replace(/https?:\/\/[^\s\n)]+/gi, '')

  body = body.replace(/\bThank you for your time and attention\.?\s*I look forward to your reply\.?/i, '')
  body = body.replace(/\bBest regards,?\b[\s\S]*$/i, '')

  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  try { body = body.replace(new RegExp(escapeRegExp(displayName), 'gi'), '') } catch(e){}

  body = body.replace(/\r\n/g, '\n')
  body = body.replace(/[ \t]{2,}/g, ' ')
  body = body.replace(/\n{3,}/g, '\n\n')
  body = body.trim()

  const makeParagraphs = (text) => {
    if (!text) return ''
    const existingParas = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
    const paras = []
    const splitToSentences = (p) => {
      // Basic sentence split: punctuation followed by space + capital letter (or number)
      const sentences = p.split(/(?<=[.!?])\s+(?=[A-Z0-9"'“‘\(])/g).map(s => s.trim()).filter(Boolean)
      return sentences
    }
    for (const p of existingParas) {
      const sentences = splitToSentences(p)
      if (sentences.length <= 3) { paras.push(sentences.join(' ')); continue }
      let i=0
      while (i<sentences.length) {
        let take = 3
        const nextSlice = sentences.slice(i, i+3).join(' ')
        if (nextSlice.length>240) take = 2
        const chunk = sentences.slice(i, i+take).join(' ')
        paras.push(chunk)
        i+=take
      }
    }
    return paras.join('\n\n')
  }

  const greetingMatch = body.match(/^(Hi\s[^,]+,)([\s\S]*)/i)
  if (greetingMatch) {
    const greet = greetingMatch[1].trim()
    let rest = greetingMatch[2]
    // Preserve a single blank line after greeting. Trim leading/trailing spaces from the rest
    rest = rest.replace(/^[ \t\n\r]+/, '\n') // ensure starts with a single newline
    rest = rest.replace(/\n{3,}/g, '\n\n')
    rest = rest.trim()
    const paras = makeParagraphs(rest)
    // Do not trim the entire result here; keep one blank line between greeting and body
    body = `${greet}\n\n${paras}`
  } else {
    body = makeParagraphs(body)
  }

  body = body.replace(/\(\(/g, '').replace(/\)\)/g, '')
  body = body.replace(/\s{2,}/g, ' ')
  body = body.replace(/\[Your Name\]/gi, displayName)
  const beforeClean = body
  body = sanitizeEmailBody(subject, body)
  body = cleanPlaceholders(body, clientName, displayName)

  // If cleaning removed the intentional blank line after greeting, reinsert it
  const greetRe = new RegExp(`^(Hi\\s${clientName.replace(/[-\\/\\^$*+?.()|[\]{}]/g,'\\$&')},)(\\s*)`, 'i')
  const hasGreet = beforeClean.match(/^(Hi\s[^,]+,)/i)
  if (hasGreet) {
    const parts = body.split(/(\n\n)/)
    // If there is no double newline after greeting, force one
    if (!body.match(/^Hi\s[^,]+,\n\n/)) {
      body = body.replace(/^(Hi\s[^,]+,)(\s*)/i, `$1\n\n`)
    }
  }

  return body
}

const raw = fs.readFileSync(path.join(__dirname,'sample_problematic_draft.txt'),'utf8')
const out = processDraft(raw)
// Print JSON so newlines are visible
console.log(JSON.stringify(out))
