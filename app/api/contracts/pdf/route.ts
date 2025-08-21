export const runtime = 'edge'

import { NextRequest } from 'next/server'

async function generatePdfFromText(text: string, title?: string) {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
  const pdfDoc = await PDFDocument.create()
  const pageMargin = 56 // 0.78in
  const fontSize = 12
  const page = pdfDoc.addPage()
  const { width, height } = page.getSize()
  const contentWidth = width - pageMargin * 2
  const helv = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const lineHeight = fontSize * 1.35

  // Optional title header
  let cursorY = height - pageMargin
  if (title) {
    const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const titleSize = 16
    const titleLines = wrapText(title, titleFont, titleSize, contentWidth)
    for (const l of titleLines) {
      if (cursorY - lineHeight < pageMargin) {
        const p = pdfDoc.addPage()
        cursorY = p.getSize().height - pageMargin
      }
      const currentPage = pdfDoc.getPages()[pdfDoc.getPageCount() - 1]
      currentPage.drawText(l, { x: pageMargin, y: cursorY, size: titleSize, font: titleFont, color: rgb(0.1,0.1,0.1) })
      cursorY -= lineHeight
    }
    cursorY -= lineHeight * 0.5
  }

  // Body
  const paragraphs = text.replace(/\r\n/g, '\n').split('\n')
  for (const para of paragraphs) {
    const lines = wrapText(para.length ? para : ' ', helv, fontSize, contentWidth)
    for (const l of lines) {
      if (cursorY - lineHeight < pageMargin) {
        const p = pdfDoc.addPage()
        cursorY = p.getSize().height - pageMargin
      }
      const currentPage = pdfDoc.getPages()[pdfDoc.getPageCount() - 1]
      currentPage.drawText(l, { x: pageMargin, y: cursorY, size: fontSize, font: helv, color: rgb(0,0,0) })
      cursorY -= lineHeight
    }
  }

  const bytes = await pdfDoc.save()
  const copy = new Uint8Array(bytes.length)
  copy.set(bytes)
  const body = new Blob([copy.buffer], { type: 'application/pdf' })
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf'
    }
  })
}

function wrapText(text: string, font: any, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const test = line ? line + ' ' + word : word
    const width = font.widthOfTextAtSize(test, size)
    if (width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

// GET /api/contracts/pdf?id=UUID -> application/pdf
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 })
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: 'Supabase config missing' }), { status: 500 })
    }
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: contract, error } = await supabase
      .from('contract_files')
      .select('*')
      .eq('id', id)
      .single()
    if (error || !contract) {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
    }

    // If amended text exists, generate a fresh PDF
    const amendedText = contract?.metadata?.amended_content as string | undefined
    if (contract.status === 'amended' && amendedText) {
      const fileName = sanitizeFileName(`${contract.contract_name || 'Contract'}_v${contract.version || ''}.pdf`)
      const res = await generatePdfFromText(amendedText, contract.contract_name)
      res.headers.set('Content-Disposition', `attachment; filename="${fileName}"`)
      return res
    }

    // Otherwise, if original PDF exists in storage, redirect to a signed URL
    if (contract.bucket && contract.path && contract.mime_type?.includes('pdf')) {
      const { data: signed, error: sErr } = await (supabase as any).storage
        .from(contract.bucket)
        .createSignedUrl(contract.path, 60)
      if (!sErr && signed?.signedUrl) {
        return Response.redirect(signed.signedUrl, 302)
      }
    }

    // Fallback: generate PDF from a synthetic preview (or metadata summary)
    const fallbackText = amendedText || `CONTRACT: ${contract.contract_name}\n\nState: ${contract.state_code}\nCounty: ${contract.county_fips}\nStatus: ${contract.status}\nVersion: ${contract.version}`
    const res = await generatePdfFromText(fallbackText, contract.contract_name)
    res.headers.set('Content-Disposition', `attachment; filename="${sanitizeFileName(contract.contract_name || 'Contract')}.pdf"`)
    return res
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Failed to export PDF', details: e?.message }), { status: 500 })
  }
}

// POST /api/contracts/pdf { text, name }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const text = (body?.text || '').toString()
    const name = (body?.name || 'Contract').toString()
    if (!text.trim()) return new Response(JSON.stringify({ error: 'Missing text' }), { status: 400 })
    const res = await generatePdfFromText(text, name)
    res.headers.set('Content-Disposition', `attachment; filename="${sanitizeFileName(name)}.pdf"`)
    return res
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Failed to generate PDF', details: e?.message }), { status: 500 })
  }
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_')
}
