"use client"
import React, { useState, useEffect, useMemo } from 'react'
import { sanitizeEmailBody, cleanPlaceholders, plaintextToHtml } from '@/lib/emailSanitizer'
import { useUI } from '@/store/ui'
import { useClient } from '@/hooks/useClient'
import { useNoteItems } from '@/hooks/useNoteItems'
import type { NoteItem } from '@/lib/types'
import { useSessionUser } from '@/hooks/useSessionUser'

// Rebuilt Followup Composer: focuses on clear hit targets & accessible structure
export default function FollowupComposer({ onGmailConnected, onSendComplete }: { onGmailConnected?: () => void; onSendComplete?: () => void } = {}) {
  const { selectedClientId, pushToast } = useUI()
  const { data: activeClient } = useClient((selectedClientId || '') as any)
  const { user } = useSessionUser()
  const { data: noteItems = [] } = useNoteItems(selectedClientId || undefined)

  // Core form state
  const [channel, setChannel] = useState<'email'|'sms'>('email')
  const [tone, setTone] = useState<'Professional'|'Friendly'|'Concise'>('Professional')
  const [subject, setSubject] = useState('Follow-up')
  
  // Gmail sender integration
  const [senders, setSenders] = useState<any[]>([])
  const [selectedSenderId, setSelectedSenderId] = useState<string | null>(null)
  const [loadingSenders, setLoadingSenders] = useState(false)

  // Load Gmail senders on component mount
  useEffect(() => {
    if (channel === 'email') {
      loadSenders()
    }
  }, [channel])

  const loadSenders = async () => {
    setLoadingSenders(true)
    try {
      const res = await fetch('/api/senders')
      if (res.ok) {
        const data = await res.json()
        setSenders(data.senders || [])
        // Auto-select first sender if available and none selected
        if (data.senders?.length > 0 && !selectedSenderId) {
          setSelectedSenderId(data.senders[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to load senders:', error)
    } finally {
      setLoadingSenders(false)
    }
  }

  const handleConnectGmail = () => {
    const popup = window.open('/api/senders/oauth/google/start', '_blank', 'width=500,height=600')
    
    // Poll for popup closure to refresh senders
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed)
        // Refresh senders after OAuth completion
        setTimeout(() => loadSenders(), 1000)
      }
    }, 1000)

    // Listen for OAuth success message from popup
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      
      if (event.data?.type === 'GMAIL_OAUTH_SUCCESS') {
        // Close popup and clean up
        popup?.close()
        clearInterval(checkClosed)
        window.removeEventListener('message', handleMessage)
        
        // Show success toast
        pushToast({
          type: 'success',
          message: `Gmail connected successfully! (${event.data.email})`
        })
        
        // Refresh senders
        setTimeout(() => loadSenders(), 500)
        
        // Close modal if callback provided
        if (onGmailConnected) {
          setTimeout(() => onGmailConnected(), 1000) // Small delay to let user see the success message
        }
      }
    }
    
    window.addEventListener('message', handleMessage)
  }
  const baseInstruction = 'Draft a concise follow-up referencing relevant milestones and next steps. Avoid redundancy. Close with a clear call-to-action.'
  const personalizationPrompts = [
    { key:'deadlines', label:'Deadlines', text:'Highlight any upcoming key dates (inspection, appraisal, closing) briefly.' },
    { key:'nextsteps', label:'Next Steps', text:'List the immediate next steps with who owns each (buyer vs. us) in a friendly tone.' },
    { key:'milestones', label:'Milestones', text:'Reference recent milestones we completed (e.g., offer acceptance, appraisal ordered).' },
    { key:'market', label:'Market Update', text:'Add one sentence micro‑market insight (inventory or recent comp) to build credibility.' },
    { key:'property', label:'Property Fit', text:'Tie one property preference back to what we are watching (price point, school district, feature).' },
    { key:'financing', label:'Financing', text:'If applicable, remind them to confirm lending docs / rate lock status politely.' },
    { key:'gratitude', label:'Appreciation', text:'Open with a warm appreciation line referencing their time/decisions so far.' },
    { key:'cta', label:'Call to Reply', text:'Close with a single clear question that invites a 1‑line reply.' },
    { key:'alt', label:'Availability', text:'Offer 2 short call windows (e.g., tomorrow 9:30a or 4:00p) for quick alignment.' },
  ] as const
  const [selectedPrompts, setSelectedPrompts] = useState<string[]>([])
  const togglePrompt = (k:string) => setSelectedPrompts(p=> p.includes(k)? p.filter(x=>x!==k): [...p,k])
  const [draft, setDraft] = useState('')
  const [generating, setGenerating] = useState(false)
  const [scheduleMode, setScheduleMode] = useState<'now'|'later'|'tomorrow'|'custom'|'sequence'>('now')
  const [customWhen, setCustomWhen] = useState('')

  // Derived structured context (auto‑includes all structured notes now)
  const contextData = useMemo(()=>{
    const deadlines = noteItems.filter(i=> ['deadline','inspection','appraisal','emd'].includes(i.kind) && i.date)
      .sort((a,b)=> (a.date||'').localeCompare(b.date||''))
    const nextSteps = noteItems.filter(i=> i.kind==='next_step')
    const contacts: Record<string, NoteItem[]> = {}
    for (const n of noteItems.filter(i=> i.kind==='contact')) {
      const key = n.party || 'other'; (contacts[key] ||= []).push(n)
    }
    const milestones = {
      ratified: deadlines.find(d=>/ratified/i.test(d.title))?.date,
      inspection: deadlines.find(d=>/inspection/i.test(d.title))?.date,
      appraisal: deadlines.find(d=>/appraisal/i.test(d.title))?.date,
      emd: deadlines.find(d=>/emd/i.test(d.title))?.date,
      closing: deadlines.find(d=>/closing/i.test(d.title))?.date,
    }
    return { deadlines, nextSteps, contacts, milestones }
  }, [noteItems])

  // Offsets for sequence mode (days)
  const cadenceOptions = [2,7,14,30,60,90,120,150,180]
  const cadenceLabels: Record<number,string> = {
    2: '2 days',
    7: '1 week',
    14: '2 weeks',
    30: '1 month',
    60: '2 months',
    90: '3 months',
    120: '4 months',
    150: '5 months',
    180: '6 months',
  }
  // Multi-select for cadence offsets in sequence mode
  const [sequenceOffsets, setSequenceOffsets] = useState<number[]>([2])
  const toggleOffset = (d:number) => setSequenceOffsets(prev => 
    prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort((a, b) => a - b)
  )

  const canGenerate = !!selectedClientId && !generating

  // Helper function to calculate and format schedule time
  const getScheduleTime = () => {
    if (scheduleMode === 'now') return 'immediately'
    
    let sendAt = new Date()
    if (scheduleMode === 'later') {
      const t = new Date()
      t.setHours(17, 0, 0, 0)
      if (t < new Date()) t.setDate(t.getDate() + 1)
      sendAt = t
    } else if (scheduleMode === 'tomorrow') {
      const t = new Date()
      t.setDate(t.getDate() + 1)
      t.setHours(9, 0, 0, 0)
      sendAt = t
    } else if (scheduleMode === 'custom' && customWhen) {
      sendAt = new Date(customWhen)
    } else if (scheduleMode === 'sequence') {
      if (sequenceOffsets.length === 0) return 'no times selected'
      const times = sequenceOffsets.map(d => {
        const when = new Date()
        when.setDate(when.getDate() + d)
        if (d !== 0) when.setHours(9, 0, 0, 0)
        return when.toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric',
          hour: d === 0 ? 'numeric' : 'numeric',
          minute: d === 0 ? '2-digit' : '2-digit'
        })
      })
      return times.join(', ')
    }
    
    return sendAt.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric', 
      hour: 'numeric', 
      minute: '2-digit'
    })
  }

  const schedulePreview = getScheduleTime()

  async function generateDraft() {
    if (!selectedClientId) { pushToast({ type:'info', message:'Pick a client first.' }); return }
    setGenerating(true)
    try {
      const ctx = {
        deadlines: contextData.deadlines,
        next_steps: contextData.nextSteps,
        contacts: contextData.contacts,
        milestones: contextData.milestones,
      }
      
      // Map selected prompts to their labels for structured processing
      const promptMap: Record<string,string> = Object.fromEntries(personalizationPrompts.map(p=>[p.key,p.label]))
      const selectedFocusAreas = selectedPrompts.map(k=>promptMap[k]).filter(Boolean)
      
      const combinedInstruction = `Generate a professional ${tone} email following the exact template format. 
      
Selected Focus Areas: ${selectedFocusAreas.join(', ')}

Create a separate personalization block for each selected focus area. Context JSON: ${JSON.stringify(ctx)}`

      const payload = { 
        clientId: selectedClientId, 
        channel, 
        instruction: combinedInstruction,
        focusAreas: selectedFocusAreas,
        tone
      }
      const res = await fetch('/api/ai/followup', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) })
      const json = await res.json(); if (!res.ok) throw new Error(json?.error || 'Failed')
  // Prefer explicit first/last name metadata if present (stored as first_name/last_name or name/full_name)
  const meta = user?.user_metadata || {}
  const metaFirst = (meta as any)?.first_name || (meta as any)?.firstName
  const metaLast = (meta as any)?.last_name || (meta as any)?.lastName
  const combinedMeta = [metaFirst, metaLast].filter(Boolean).join(' ')
  const displayName = combinedMeta || meta?.full_name || meta?.name || user?.email?.split('@')[0] || 'Agent'
      const clientName = (activeClient as any)?.name || 'there'
      
      let body = json.draft || ''

      // Normalize greeting to a consistent "Hi [ClientName]," format
      if (body.match(/^(Dear|Hi|Hello)\s*\[?([^\],\n]*)\]?,?/i)) {
        body = body.replace(/^(Dear|Hi|Hello)\s*\[?([^\],\n]*)\]?,?/i, `Hi ${clientName},`)
      } else if (body.match(/^(Dear|Hi|Hello)\s*,/i)) {
        body = body.replace(/^(Dear|Hi|Hello)\s*,/i, `Hi ${clientName},`)
      } else if (!body.match(/^Hi\s+/i)) {
        body = `Hi ${clientName},\n\n${body}`
      }

      // Aggressively remove citation markers and orphaned parentheses
      body = body.replace(/\(\([^)]*\)\)/g, '') // remove ((...)) blocks
      body = body.replace(/\(\(/g, '') // remove orphaned ((
      body = body.replace(/\)\)/g, '') // remove orphaned ))
      body = body.replace(/\([^)]*https?:\/\/[^)]*\)/gi, '') // remove (...https://...)
      body = body.replace(/https?:\/\/[^\s\n)]+/gi, '') // remove standalone urls

      // Remove common signoff sentences and any trailing agent name/signature
      body = body.replace(/\bThank you for your time and attention\.?\s*I look forward to your reply\.?/i, '')
      body = body.replace(/\bBest regards,?\b[\s\S]*$/i, '')

      // Remove any accidental repetition of the agent's display name in the body (signature leftovers)
      const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      try {
        const nameRe = new RegExp(escapeRegExp(displayName), 'gi')
        body = body.replace(nameRe, '')
      } catch(e) {
        // ignore regexp errors for weird display names
      }

      // Normalize whitespace
      body = body.replace(/\r\n/g, '\n')
      body = body.replace(/[ \t]{2,}/g, ' ')
      body = body.replace(/\n{3,}/g, '\n\n')
      body = body.trim()

      // Smart paragraph grouping: split into sentences, then group into 2-3 sentence paragraphs
      const makeParagraphs = (text: string) => {
        if (!text) return ''
        // Preserve existing paragraph breaks to not break intentionally formatted content
        const existingParas = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
        const paras: string[] = []

        const splitToSentences = (p: string) => {
          // Split on sentence-ending punctuation (., ?, !) followed by space and uppercase / digit / quote
          const sentences = p.split(/(?<=[.!?])\s+(?=[A-Z0-9"'“‘\(])/g).map(s => s.trim()).filter(Boolean)
          return sentences
        }

        for (const p of existingParas) {
          const sentences = splitToSentences(p)
          if (sentences.length <= 3) {
            paras.push(sentences.join(' '))
            continue
          }

          // Group sentences into chunks of 2-3
          let i = 0
          while (i < sentences.length) {
            // try to take 3 sentences if combined length small, else 2
            let take = 3
            const nextSlice = sentences.slice(i, i + 3).join(' ')
            if (nextSlice.length > 240) take = 2
            const chunk = sentences.slice(i, i + take).join(' ')
            paras.push(chunk)
            i += take
          }
        }

        return paras.join('\n\n')
      }

      // Apply smart paragraphing but preserve the greeting on its own followed by a blank line
      const greetingMatch = body.match(/^(Hi\s[^,]+,)([\s\S]*)/i)
      if (greetingMatch) {
        const greet = greetingMatch[1].trim()
        const rest = greetingMatch[2].trim()
        const paras = makeParagraphs(rest)
        body = `${greet}\n\n${paras}`.trim()
      } else {
        body = makeParagraphs(body)
      }

      // Final cleanup: remove any leftover orphan parentheses or double spaces
      body = body.replace(/\(\(/g, '').replace(/\)\)/g, '')
      body = body.replace(/\s{2,}/g, ' ')

      // Remove unmatched parentheses safely (skip unmatched closing, then strip extra opens)
      const removeUnmatchedParens = (text: string) => {
        let out = ''
        let depth = 0
        for (const ch of text) {
          if (ch === '(') { depth++; out += ch }
          else if (ch === ')') {
            if (depth === 0) {
              // skip unmatched closing
            } else { depth--; out += ch }
          } else { out += ch }
        }
        // If there are unmatched opening parens left, remove the earliest ones
        if (depth === 0) return out
        let res = ''
        let toRemove = depth
        for (let i = out.length - 1; i >= 0; i--) {
          const ch = out[i]
          if (ch === '(' && toRemove > 0) { toRemove--; continue }
          res = ch + res
        }
        return res
      }

      body = removeUnmatchedParens(body)
      // Collapse any leftover empty parenthesis pairs
      body = body.replace(/\(\s*\)/g, '')

      // If 'Market Update' was requested, focus the content on interest rates and real estate.
      // Keep the greeting and the first sentence, then filter the rest to sentences matching key terms.
      if (selectedPrompts.includes('market')) {
        const gm = body.match(/^(Hi\s[^,]+,)?\s*([\s\S]*)/i)
        let greet = ''
        let rest = body
        if (gm) {
          greet = (gm[1] || '').trim()
          rest = (gm[2] || '').trim()
        }

  const sentences = rest.split(/(?<=[.!?])\s+/g).map((s: string) => s.trim()).filter(Boolean)
        const keep: string[] = []
        // Always keep a short opener if present
        if (sentences.length > 0) keep.push(sentences[0])

        const keywords = /\b(rate|interest|mortgage|mortgage rates|housing|home|real estate|inventory|Fed|fed|interest rate|rates)\b/i
        for (let i = 1; i < sentences.length; i++) {
          const s = sentences[i]
          if (keywords.test(s)) keep.push(s)
          // Limit kept sentences to a reasonable amount
          if (keep.length >= 4) break
        }

        // If filtering removed too much, fallback to original rest
        const newRest = keep.length > 0 ? keep.join(' ') : rest
        body = greet ? `${greet}\n\n${newRest}` : newRest
      }

      body = body.replace(/\[Your Name\]/gi, displayName)
      body = sanitizeEmailBody(subject, body)
      body = cleanPlaceholders(body, clientName, displayName)
      setDraft(body)
      pushToast({ type:'success', message:'Draft ready' })
    } catch(e:any) {
      pushToast({ type:'error', message: e?.message || 'Generation failed' })
    } finally {
      setGenerating(false)
    }
  }

  async function scheduleSend() {
    if (!selectedClientId || !draft) { pushToast({ type:'info', message:'Need client & draft first' }); return }
    const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Agent'
    const to: string[] = (activeClient as any)?.email && channel==='email' ? [(activeClient as any).email] : []
    if (channel==='email' && to.length===0) { pushToast({ type:'info', message:'Client missing email' }); return }
    
    // For "Send now", use the direct email sending endpoint
    if (scheduleMode === 'now') {
      try {
        const payload = {
          to,
          subject,
          bodyMd: cleanPlaceholders(draft, activeClient?.name || undefined, displayName),
          clientId: selectedClientId,
          senderId: selectedSenderId, // Use selected Gmail sender if available
        }
        
        console.log('[followup] Sending email now via /api/email/send-now')
        const res = await fetch('/api/email/send-now', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(payload) 
        })
        const json = await res.json()
        
        if (!res.ok) {
          throw new Error(json?.error || 'Failed to send email')
        }
        
        pushToast({ type: 'success', message: 'Your message has been sent!' })
        
        // Reset form after successful send
        setDraft('')
        setSubject('Follow-up')
        setSelectedPrompts([])
        
        // Close modal if callback provided
        if (onSendComplete) {
          setTimeout(() => onSendComplete(), 500) // Small delay to let user see the success message
        }
        return
      } catch (e: any) {
        console.error('[followup] Send now error:', e)
        pushToast({ type: 'error', message: e?.message || 'Failed to send email' })
        return
      }
    }
    
    // For scheduling, use the original logic
    let sendAt = new Date()
    if (scheduleMode==='later') { const t = new Date(); t.setHours(17,0,0,0); if (t<new Date()) t.setDate(t.getDate()+1); sendAt=t }
    else if (scheduleMode==='tomorrow') { const t = new Date(); t.setDate(t.getDate()+1); t.setHours(9,0,0,0); sendAt=t }
    else if (scheduleMode==='custom') { if(!customWhen) { pushToast({ type:'info', message:'Pick date/time' }); return } sendAt=new Date(customWhen) }
    
    const payload = {
      clientId: selectedClientId,
      to: to,
      subject,
      bodyMd: cleanPlaceholders(draft, activeClient?.name || undefined, displayName),
      sendAt: sendAt.toISOString(),
      senderId: selectedSenderId, // Use selected Gmail sender if available
    }
    
    try {
      if (scheduleMode==='sequence') {
        if (sequenceOffsets.length===0) { pushToast({ type:'info', message:'Pick at least one cadence point' }); return }
        const base = new Date()
        const scheduledEmails = []
        let emailsSent = 0
        let emailsScheduled = 0
        
        for (const off of sequenceOffsets) {
          const when = new Date(base)
          when.setDate(when.getDate()+off)
          // For offset 0 we send now; others schedule at 9am local
          if (off!==0) { when.setHours(9,0,0,0) }
          
          const seqPayload = { 
            ...payload, 
            sendAt: when.toISOString(), 
            subject: off===0? subject : `${subject} (Follow‑Up ${off}d)` 
          }
          
          if (off === 0) {
            // Send immediately for offset 0
            const immediatePayload = {
              to: payload.to,
              subject: payload.subject,
              bodyMd: payload.bodyMd,
              clientId: payload.clientId,
              senderId: selectedSenderId,
            }
            
            const res = await fetch('/api/email/send-now', { 
              method: 'POST', 
              headers: { 'Content-Type': 'application/json' }, 
              body: JSON.stringify(immediatePayload) 
            })
            const j = await res.json()
            if(!res.ok) throw new Error(j?.error||`Failed to send immediate email`)
            scheduledEmails.push(j.emailId)
            emailsSent++
          } else {
            // Schedule for future
            const res = await fetch('/api/email/schedule', { 
              method:'POST', 
              headers:{ 'Content-Type':'application/json' }, 
              body: JSON.stringify(seqPayload) 
            })
            const j = await res.json()
            if(!res.ok) throw new Error(j?.error||`Failed at +${off}d`)
            scheduledEmails.push(j.emailId)
            emailsScheduled++
          }
        }
        
        const sequenceMessage = []
        if (emailsSent > 0) sequenceMessage.push(`${emailsSent} sent`)
        if (emailsScheduled > 0) sequenceMessage.push(`${emailsScheduled} scheduled`)
        
        pushToast({ 
          type:'success', 
          message: emailsSent > 0 && emailsScheduled > 0 
            ? 'Your message has been sent and future messages have been scheduled!'
            : emailsSent > 0 
              ? 'Your message has been sent!'
              : 'Your messages have been scheduled!'
        })
        
        // Reset form after successful scheduling
        setDraft('')
        setSubject('Follow-up')
        setSelectedPrompts([])
        setSequenceOffsets([])
        
        // Close modal if callback provided
        if (onSendComplete) {
          setTimeout(() => onSendComplete(), 500) // Small delay to let user see the success message
        }
      } else {
        const res = await fetch('/api/email/schedule', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) })
        const j = await res.json(); if(!res.ok) throw new Error(j?.error||'Schedule failed')
        
        const scheduleTime = scheduleMode === 'later' ? 'today at 5:00 PM' 
          : scheduleMode === 'tomorrow' ? 'tomorrow at 9:00 AM' 
          : scheduleMode === 'custom' && customWhen ? new Date(customWhen).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }) 
          : 'the selected time'
        
        pushToast({ type:'success', message: 'Your message has been scheduled!' })
        // Reset form after successful scheduling
        setDraft('')
        setSubject('Follow-up')
        setSelectedPrompts([])
        setCustomWhen('')
        
        // Close modal if callback provided
        if (onSendComplete) {
          setTimeout(() => onSendComplete(), 500) // Small delay to let user see the success message
        }
      }
    } catch(e:any) { 
      console.error('[followup] Schedule error:', e)
      pushToast({ type:'error', message: `❌ Failed to schedule email: ${e?.message || 'Unknown error'}` }) 
    }
  }

  return (
    <section className="rounded-2xl border-2 border-slate-300 bg-white p-6 mt-4 shadow-sm" aria-labelledby="followup_header">
      <div className="flex flex-wrap gap-4 items-end justify-between">
        <div>
          <h2 id="followup_header" className="font-semibold text-2xl md:text-3xl text-slate-900 tracking-tight">Follow‑Up Composer</h2>
          <p className="mt-1 text-sm md:text-base text-slate-600">Generate a personalized client follow‑up using recent activity, milestones, and selected focus areas.</p>
        </div>
        <div className="text-xs md:text-sm font-medium text-slate-500">{activeClient? `Client: ${(activeClient as any)?.name || (activeClient as any)?.first_name || ''}`:'No client selected'}</div>
      </div>

      {/* Step 1: Configuration */}
      <fieldset className="mt-4 border rounded-xl p-4" aria-labelledby="cfg_legend">
        <legend id="cfg_legend" className="px-1 text-sm font-semibold text-slate-800">1. Configuration</legend>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted" htmlFor="fu_channel">Channel</label>
            <select id="fu_channel" value={channel} onChange={e=>setChannel(e.target.value as any)} className="h-10 rounded-md border-2 border-default px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </select>
          </div>
          {channel === 'email' && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted" htmlFor="fu_sender">Sender</label>
              <div className="flex gap-2">
                {loadingSenders ? (
                  <div className="flex-1 h-10 rounded-md border-2 border-default px-3 text-sm flex items-center text-slate-500">
                    Loading...
                  </div>
                ) : senders.length > 0 ? (
                  <>
                    <select 
                      id="fu_sender" 
                      value={selectedSenderId || ''} 
                      onChange={e => setSelectedSenderId(e.target.value || null)}
                      className="flex-1 h-10 rounded-md border-2 border-default px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Default sender</option>
                      {senders.map(sender => (
                        <option key={sender.id} value={sender.id}>
                          {sender.email} {sender.method === 'oauth_google' ? '(Gmail)' : ''}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleConnectGmail}
                      className="px-3 h-10 rounded-md border-2 border-indigo-300 bg-indigo-50 text-indigo-700 text-xs font-medium hover:bg-indigo-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      title="Add another Gmail account"
                    >
                      + Gmail
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectGmail}
                    className="flex-1 h-10 px-3 rounded-md border-2 border-indigo-500 bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    Connect Gmail
                  </button>
                )}
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted" htmlFor="fu_tone">Tone</label>
            <select id="fu_tone" value={tone} onChange={e=>setTone(e.target.value as any)} className="h-10 rounded-md border-2 border-default px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {['Professional','Friendly','Concise'].map(t=> <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted" htmlFor="fu_subject">Subject</label>
            <input id="fu_subject" value={subject} onChange={e=>setSubject(e.target.value)} className="h-10 rounded-md border-2 border-default px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted">Client</label>
            <div className="h-10 rounded-md border-2 border-default bg-surface-2 px-3 text-sm flex items-center">{(activeClient as any)?.name || '—'}</div>
          </div>
        </div>
      </fieldset>

  {/* Step 2 removed – context auto included */}

      {/* Step 2 (new numbering): Personalization */}
      <fieldset className="mt-6 border-2 rounded-2xl p-5" aria-labelledby="pers_legend">
        <legend id="pers_legend" className="px-1 text-sm font-semibold text-slate-800">2. Personalize Focus</legend>
        <p className="text-sm md:text-base text-slate-600 mb-4">Pick the details you want included, and we’ll make sure they flow naturally in the draft.</p>
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {personalizationPrompts.map(p=>{
            const active = selectedPrompts.includes(p.key)
            return (
              <li key={p.key}>
                <button
                  type="button"
                  onClick={()=>togglePrompt(p.key)}
                  aria-pressed={active}
                  className={`w-full text-left rounded-xl border-2 px-4 py-3 text-sm leading-snug transition font-semibold ${active? 'bg-blue-800 border-blue-700 text-white shadow-sm':'bg-blue-100/70 border-blue-400 text-blue-900 hover:bg-blue-200'} focus:outline-none focus:ring-2 focus:ring-blue-600/60`}
                >
                  <span className="block mb-1 text-[13px] tracking-tight">{p.label}</span>
                  <span className={`block text-[11px] font-normal leading-snug ${active? 'text-blue-100':'text-blue-700/90'}`}>{p.text}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </fieldset>

      {/* Step 3: Generate & Preview */}
      <fieldset className="mt-4 border rounded-xl p-4" aria-labelledby="gen_legend">
        <legend id="gen_legend" className="px-1 text-sm font-semibold text-slate-800">3. Generate</legend>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            disabled={!canGenerate}
            onClick={generateDraft}
            className={`h-10 px-5 rounded-md text-sm font-medium text-white transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${canGenerate? 'bg-indigo-600 hover:bg-indigo-700':'bg-slate-400 cursor-not-allowed'}`}
          >{generating? 'Generating…':'Generate Draft'}</button>
          {draft && (
            <>
              <button type="button" onClick={()=>navigator.clipboard.writeText(draft)} className="h-10 px-4 rounded-md border border-default text-sm bg-white hover:bg-surface-2">Copy</button>
              {channel==='email' && (activeClient as any)?.email && (
                <a
                  href={`mailto:${(activeClient as any).email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(draft)}`}
                  className="h-10 px-4 rounded-md bg-emerald-600 text-white text-sm flex items-center hover:bg-emerald-700"
                >Open Email</a>
              )}
              {channel==='sms' && (activeClient as any)?.phone && (
                <a
                  href={`sms:${(activeClient as any).phone}?body=${encodeURIComponent(draft.slice(0,160))}`}
                  className="h-10 px-4 rounded-md bg-emerald-600 text-white text-sm flex items-center hover:bg-emerald-700"
                >Open SMS</a>
              )}
            </>
          )}
        </div>
        <div className="mt-4 rounded-lg border border-default bg-surface p-4 min-h-[140px] overflow-auto">
          <div className="text-xs font-semibold text-muted mb-2">Draft Preview - Click to Edit</div>
          {draft ? (
            <>
            <textarea 
              className="w-full min-h-[120px] text-sm leading-relaxed text-ink email-preview resize-y bg-transparent border-none p-0 focus:outline-none"
              style={{
                fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
                lineHeight: '1.6',
                color: '#374151',
              }}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Your generated email draft will appear here..."
            />
            {/* Preview removed: keep only the editable textarea so it is the single source of truth */}
            </>
          ) : (
            <div className="text-xs text-muted">No draft yet.</div>
          )}
        </div>
      </fieldset>

    {/* Step 4: Schedule (email only) */}
      {channel==='email' && (
        <fieldset className="mt-4 border rounded-xl p-4" aria-labelledby="sched_legend">
      <legend id="sched_legend" className="px-1 text-sm font-semibold text-slate-800">4. Send / Schedule</legend>
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted">Timing</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { value:'now', label:'Send now' },
                  { value:'later', label:'Later today (5pm)' },
                  { value:'tomorrow', label:'Tomorrow 9am' },
                  { value:'custom', label:'Custom' },
                  { value:'sequence', label:'Sequence (beta)' },
                ].map(opt => {
                  const active = scheduleMode===opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      aria-pressed={active}
                      onClick={()=>setScheduleMode(opt.value as any)}
                      className={`px-3 h-10 rounded-md text-xs font-medium border-2 transition ${active? 'bg-indigo-600 border-indigo-600 text-white shadow-sm':'border-indigo-300 text-indigo-800 bg-indigo-50 hover:bg-indigo-100'}`}
                    >{opt.label}</button>
                  )
                })}
              </div>
            </div>

            {/* Schedule Preview */}
            {draft && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                <div className="flex items-start gap-2">
                  <div className="text-blue-600 mt-0.5">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-blue-900">
                      {scheduleMode === 'now' 
                        ? 'Email will be sent immediately'
                        : scheduleMode === 'sequence'
                        ? `Email sequence will be sent: ${schedulePreview}`
                        : `Email will be sent on ${schedulePreview}`
                      }
                    </p>
                    {scheduleMode !== 'now' && scheduleMode !== 'sequence' && (
                      <p className="text-xs text-blue-700 mt-1">
                        To: {(activeClient as any)?.email || 'No email address'}
                      </p>
                    )}
                    {scheduleMode === 'sequence' && sequenceOffsets.length > 0 && (
                      <p className="text-xs text-blue-700 mt-1">
                        {sequenceOffsets.length} email{sequenceOffsets.length > 1 ? 's' : ''} scheduled
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {scheduleMode==='custom' && (
              <div className="flex flex-col gap-1 max-w-xs">
                <label className="text-xs font-medium text-muted" htmlFor="custom_when">When</label>
                <input id="custom_when" type="datetime-local" value={customWhen} onChange={e=>setCustomWhen(e.target.value)} className="h-10 rounded-md border-2 border-default px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                {customWhen && (
                  <p className="text-xs text-slate-600 mt-1">
                    Will send on {new Date(customWhen).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric', 
                      year: 'numeric',
                      hour: 'numeric', 
                      minute: '2-digit'
                    })}
                  </p>
                )}
              </div>
            )}
            
            <div className="pt-1">
              <button
                type="button"
                disabled={!draft || (scheduleMode === 'custom' && !customWhen) || (scheduleMode === 'sequence' && sequenceOffsets.length === 0)}
                onClick={scheduleSend}
                className={`h-10 px-8 rounded-md text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  draft && (scheduleMode !== 'custom' || customWhen) && (scheduleMode !== 'sequence' || sequenceOffsets.length > 0)
                    ? 'bg-indigo-600 hover:bg-indigo-700'
                    : 'bg-slate-400 cursor-not-allowed'
                }`}
              >{scheduleMode==='now'? 'Send now' : scheduleMode === 'sequence' ? `Schedule ${sequenceOffsets.length} emails` : 'Schedule email'}</button>
            </div>
          </div>
          {scheduleMode==='sequence' && (
            <div className="mt-4 space-y-3">
              <p className="text-base font-medium text-slate-700">Send follow‑up in:</p>
              <div className="flex flex-wrap gap-2">
                {cadenceOptions.map(d => {
                  const active = sequenceOffsets.includes(d)
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={active}
                      onClick={()=>toggleOffset(d)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium border-2 transition ${active? 'bg-indigo-600 border-indigo-600 text-white shadow-sm':'border-indigo-300 text-indigo-800 bg-indigo-50 hover:bg-indigo-100'}`}
                    >{cadenceLabels[d]}</button>
                  )
                })}
              </div>
              <p className="text-[10px] text-slate-500">Options range up to 6 months out.</p>
            </div>
          )}
        </fieldset>
      )}
    </section>
  )
}
