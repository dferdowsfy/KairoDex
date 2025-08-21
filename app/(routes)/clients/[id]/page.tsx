"use client"
export const dynamic = 'force-dynamic'
import { useParams } from 'next/navigation'
import { useClient } from '@/hooks/useClient'
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { useUI } from '@/store/ui'
import { US_STATES } from '@/lib/us'
import { getContractsForJurisdiction, type ContractTemplate } from '@/lib/contracts'
import { PhoneCall, Mail, Calendar, Wallet, House, Landmark, Phone, BarChart2, NotebookPen, ChevronDown } from 'lucide-react'
import { getPreferredContactMethod } from '@/lib/sheets'

interface SheetRow {
  [key: string]: string | number | boolean | null
}

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id as string
  const { data: client } = useClient(id)
  const { setSelectedClientId } = useUI()
  
  // Get sheet data for this specific client via API (avoids client-side env access)
  const { data: sheetRow, error } = useQuery({
    queryKey: ['sheetRow', id],
    queryFn: async () => {
      const res = await fetch(`/api/sheets/row?id=${encodeURIComponent(id)}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`Failed to load sheet row: ${res.status}`)
      const json = await res.json()
      return json.row as SheetRow
    },
    enabled: !!id,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: 'always',
    refetchOnMount: 'always',
  })

  // --- Local UI state/hooks declared before any early returns to satisfy React rules ---
  // AI states
  const [followupLoading, setFollowupLoading] = useState(false)
  const [followupDraft, setFollowupDraft] = useState<string | null>(null)
  const [amendLoading, setAmendLoading] = useState(false)
  const [amendDraft, setAmendDraft] = useState<string | null>(null)
  const [tone, setTone] = useState<'Professional' | 'Casual' | 'Friendlier'>('Professional')
  // Jurisdictional contract UI state
  const [stateCode, setStateCode] = useState<string>('')
  const [countyFips, setCountyFips] = useState<string>('')
  const [counties, setCounties] = useState<{ name: string; fips: string }[]>([])
  const [contracts, setContracts] = useState<ContractTemplate[]>([])
  const [selectedContractId, setSelectedContractId] = useState<string>('')
  const [changeText, setChangeText] = useState('')
  const [openAmend, setOpenAmend] = useState(true)

  const hasError = !!error
  const loading = !client || !sheetRow

  // Extract data from specific columns
  const clientName = !loading ? (`${sheetRow['name_first'] || ''} ${sheetRow['name_last'] || ''}`.trim() || sheetRow['name'] as string || client.name) : ''
  const status = !loading ? ((sheetRow['stage'] as string) || client.stage) : ''
  const budgetMin = !loading ? (sheetRow['budget_min'] as string || '') : ''
  const budgetMax = !loading ? (sheetRow['budget_max'] as string || '') : ''
  const style = !loading ? ((sheetRow['style'] as string) || (sheetRow['property_style'] as string) || '') : ''
  const financing = !loading ? ((sheetRow['financing'] as string) || (sheetRow['financing_type'] as string) || '') : ''
  const preferredComm = !loading ? (getPreferredContactMethod(sheetRow) || '') : ''
  const notes = !loading ? (sheetRow['notes'] as string || '') : ''
  const email = !loading ? ((sheetRow['email'] as string) || client.email || '') : ''
  const phone = !loading ? ((sheetRow['phone'] as string) || client.phone || '') : ''

  const formatCurrency = (value: string) => {
    if (!value) return 'Not specified'
    const num = parseFloat(value.replace(/[$,]/g, ''))
    return isNaN(num) ? value : `$${num.toLocaleString()}`
  }

  const telHref = (() => {
    if (!phone) return ''
    const digits = phone.replace(/[^0-9+]/g, '')
    return digits ? `tel:${digits}` : ''
  })()

  const mailtoHref = (() => {
    if (!email) return ''
    const subject = encodeURIComponent(`Follow-up: ${clientName}`)
    return `mailto:${email}?subject=${subject}`
  })()

  // Reset local UI state when client id changes to avoid stale UI when switching clients
  useEffect(() => {
  setSelectedClientId(id)
    setFollowupLoading(false)
    setFollowupDraft(null)
    setAmendLoading(false)
    setAmendDraft(null)
    setTone('Professional')
    setStateCode('')
    setCountyFips('')
    setCounties([])
    setContracts([])
    setSelectedContractId('')
    setChangeText('')
  setOpenAmend(true)
  }, [id, setSelectedClientId])

  async function handleGenerateFollowup() {
    try {
      setFollowupLoading(true)
      setFollowupDraft(null)
      const instruction = `Draft a ${tone.toLowerCase()} follow-up email.`
      const res = await fetch('/api/ai/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: id, channel: 'email', instruction })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to generate follow-up')
      setFollowupDraft(json.draft as string)
    } catch (e) {
      setFollowupDraft('Generation failed. Please try again.')
    } finally {
      setFollowupLoading(false)
    }
  }

  async function handleAmendContracts() {
    if (!selectedContractId) {
      alert('Select a contract template')
      return
    }
    if (!changeText.trim()) {
      alert('Describe the changes to apply')
      return
    }
    try {
      setAmendLoading(true)
      setAmendDraft(null)
      const contract = contracts.find(c => c.id === selectedContractId)
      const res = await fetch('/api/contracts/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractTemplate: contract?.template,
          naturalChanges: changeText,
          clientContext: { client, sheetRow, stateCode, countyFips }
        })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to apply changes')
      setAmendDraft(json.updated as string)
    } catch (e) {
      setAmendDraft('Amendment generation failed. Please try again.')
    } finally {
      setAmendLoading(false)
    }
  }

  // Load counties when state changes
  useEffect(() => {
    let ignore = false
    async function run() {
      if (!stateCode) { setCounties([]); setCountyFips(''); return }
      try {
        const stateFips = US_STATES.find(s => s.code === stateCode)?.fips
        if (!stateFips) return
        const resp = await fetch(`/api/geo/counties?state=${stateFips}`)
        const data = await resp.json()
        if (!ignore) setCounties(data.items || [])
      } catch {
        if (!ignore) setCounties([])
      }
    }
    run()
    return () => { ignore = true }
  }, [stateCode])

  // Load contract templates when jurisdiction changes
  useEffect(() => {
    const list = getContractsForJurisdiction(stateCode, countyFips)
    setContracts(list)
    setSelectedContractId(list[0]?.id || '')
  }, [stateCode, countyFips])

  return (
  <main key={id} className="min-h-screen" style={{ background: 'var(--page-bg)' }}>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {hasError && (
          <div className="text-center py-12">
            <div className="text-lg text-red-600">Failed to load client dashboard.</div>
          </div>
        )}
        {loading && !hasError && (
          <div className="text-center py-12">
            <div className="text-lg text-ink/70">Loading client dashboard...</div>
          </div>
        )}
        {!loading && !hasError && (
        <>
        
        {/* Client Header with actions on the right */}
        <div className="mb-8 lh-section-loose">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between text-center lg:text-left gap-3">
            <div>
              <h1 className="sf-display h1 text-white mb-2">{clientName}</h1>
              <div className="inline-flex items-center px-4 py-2 pill capitalize" style={{ background: 'rgba(37,99,235,0.18)', color: '#BFDBFE' }}>
                <div className="w-2.5 h-2.5 bg-primary rounded-full mr-2"></div>
                <span>{status.replace('_', ' ')}</span>
              </div>
            </div>
            <div className="flex items-center justify-center lg:justify-end gap-2">
              <a
                href={telHref || undefined}
                aria-disabled={!telHref}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-2 border text-white/90 bg-white/10 border-white/20 hover:bg-white/15 transition ${telHref ? '' : 'opacity-50 cursor-not-allowed pointer-events-none'}`}
              >
                <PhoneCall className="w-4 h-4" />
                <span className="sf-text text-sm">Call Client</span>
              </a>
              <a
                href={mailtoHref || undefined}
                aria-disabled={!mailtoHref}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-2 border text-white/90 bg-white/10 border-white/20 hover:bg-white/15 transition ${mailtoHref ? '' : 'opacity-50 cursor-not-allowed pointer-events-none'}`}
              >
                <Mail className="w-4 h-4" />
                <span className="sf-text text-sm">Send Email</span>
              </a>
              <a
                href="/tasks?quick=calls"
                className="inline-flex items-center gap-2 rounded-full px-3 py-2 border text-white bg-white/10 border-white/20 hover:bg-white/15 transition"
              >
                <Calendar className="w-4 h-4" />
                <span className="sf-text text-sm">Schedule</span>
              </a>
            </div>
          </div>
        </div>

        {/* Glass Tile Grid */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
  {/* Budget Tile */}
      <div className="relative overflow-hidden rounded-apple p-6 tile-soft">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4 lh-card-tight">
        <h3 className="sf-display h3 accent-green">Budget Range</h3>
        <div className="w-10 h-10 rounded-lg grid place-items-center tint-primary"><Wallet className="w-5 h-5"/></div>
              </div>
              <div className="space-y-2">
                <div className="sf-display text-2xl font-semibold">{formatCurrency(budgetMin)}</div>
        <div className="sf-text text-sm text-subtle">to</div>
                <div className="sf-display text-2xl font-semibold">{formatCurrency(budgetMax)}</div>
              </div>
            </div>
          </div>

  {/* Style Preference Tile */}
      <div className="relative overflow-hidden rounded-apple p-6 tile-soft">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4 lh-card-tight">
        <h3 className="sf-display h3 accent-teal">Style Preference</h3>
        <div className="w-10 h-10 rounded-lg grid place-items-center tint-primary"><House className="w-5 h-5"/></div>
              </div>
              <div className="sf-display text-2xl font-semibold capitalize">
                {style || 'Not specified'}
              </div>
            </div>
          </div>

  {/* Financing Tile */}
      <div className="relative overflow-hidden rounded-apple p-6 tile-soft">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4 lh-card-tight">
        <h3 className="sf-display h3 accent-amber">Financing</h3>
        <div className="w-10 h-10 rounded-lg grid place-items-center tint-warn"><Landmark className="w-5 h-5"/></div>
              </div>
              <div className="sf-display text-2xl font-semibold capitalize">
                {financing || 'Not specified'}
              </div>
            </div>
          </div>

  {/* Communication Preference Tile */}
      <div className="relative overflow-hidden rounded-apple p-6 tile-soft">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4 lh-card-tight">
        <h3 className="sf-display h3 accent-blue">Preferred Contact</h3>
        <div className="w-10 h-10 rounded-lg grid place-items-center tint-accent"><Phone className="w-5 h-5"/></div>
              </div>
              <div className="sf-display text-2xl font-semibold capitalize">
                {preferredComm || 'Not specified'}
              </div>
            </div>
          </div>

  {/* Status Tile */}
      <div className="relative overflow-hidden rounded-apple p-6 tile-soft">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4 lh-card-tight">
        <h3 className="sf-display h3">Current Status</h3>
        <div className="w-10 h-10 rounded-lg grid place-items-center tint-danger"><BarChart2 className="w-5 h-5"/></div>
              </div>
      <div className={`sf-display text-2xl font-semibold capitalize ${/closed/i.test(status) ? 'status-closed' : 'status-open'}`}>{status.replace('_', ' ')}</div>
            </div>
          </div>

  {/* Contact Info Tile */}
    <div className="relative overflow-hidden rounded-apple p-6 tile-soft">
            <div className="relative z-10">
        <div className="flex items-center justify-between mb-4 lh-card-tight">
    <h3 className="sf-display h3 accent-purple">Contact Info</h3>
  <div className="w-10 h-10 rounded-lg grid place-items-center tint-primary"><Mail className="w-5 h-5"/></div>
              </div>
              <div className="space-y-2">
    <div className="sf-text text-[1.0625rem] font-medium">{client.email || 'No email'}</div>
    <div className="sf-text text-[1.0625rem] font-medium">{client.phone || 'No phone'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Notes Section */}
        {notes && (
          <div className="mt-8">
            <div className="relative overflow-hidden rounded-apple p-8 panel-glass panel-elevated">
              <div className="relative z-10">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 rounded-xl grid place-items-center tint-primary mr-4"><NotebookPen className="w-5 h-5"/></div>
                  <h3 className="sf-display h2">Notes</h3>
                </div>
                <div className="sf-text text-[1.0625rem] lh-section-loose whitespace-pre-wrap">
                  {notes}
                </div>
              </div>
            </div>
          </div>
        )}

  {/* Quick Actions moved to header */}

  {/* AI Tools */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          {/* Vibrant flat card: Follow-up */}
          <div className="relative overflow-hidden p-6 ai-card ai-card-blue">
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="sf-display h3 heading-blue">Generate follow-up</h3>
                <div className="ai-chip ai-chip-blue"><Mail className="w-5 h-5"/></div>
              </div>
              <button
                onClick={handleGenerateFollowup}
                disabled={followupLoading}
                className={`px-4 py-2 rounded-lg text-white bg-primary hover:opacity-95 font-medium transition ${followupLoading ? 'opacity-70 cursor-wait' : ''}`}
              >
                {followupLoading ? 'Generating…' : 'Draft email'}
              </button>
              {followupDraft && (
                <div className="mt-2 p-3 rounded-xl text-sm whitespace-pre-wrap content-box-light">
                  {followupDraft}
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <span className="opacity-90 text-pop">Tone:</span>
                <select
                  value={tone}
                  onChange={e => setTone(e.target.value as any)}
                  className="input-neon px-2 py-1"
                >
                  <option>Professional</option>
                  <option>Casual</option>
                  <option>Friendlier</option>
                </select>
                <button onClick={handleGenerateFollowup} className="px-3 py-1 rounded-md btn-neon">Regenerate</button>
              </div>
            </div>
          </div>

      {/* Vibrant flat card: Amend */}
      <div className="relative overflow-hidden p-6 ai-card ai-card-amber">
            <div className="relative z-10 space-y-4">
              <button type="button" onClick={()=>setOpenAmend(v=>!v)} className="w-full text-left flex items-center justify-between">
        <span className="inline-flex items-center gap-2"><div className="ai-chip ai-chip-amber"><NotebookPen className="w-5 h-5"/></div><span className="sf-display h3 heading-amber">Amend contracts</span></span>
                <ChevronDown className={`w-5 h-5 transition-transform ${openAmend ? 'rotate-180' : ''}`} />
              </button>
              {openAmend && (
              <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
  <select value={stateCode} onChange={e => setStateCode(e.target.value)} className="input-neon px-2 py-2">
                  <option value="">State</option>
                  {US_STATES.map(s => (
                    <option key={s.code} value={s.code}>{s.name}</option>
                  ))}
                </select>
  <select value={countyFips} onChange={e => setCountyFips(e.target.value)} className="input-neon px-2 py-2">
                  <option value="">Jurisdiction (County)</option>
                  {counties.map(c => (
                    <option key={c.fips} value={c.fips}>{c.name}</option>
                  ))}
                </select>
  <select value={selectedContractId} onChange={e => setSelectedContractId(e.target.value)} className="input-neon px-2 py-2">
                  {contracts.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <textarea
                value={changeText}
                onChange={e => setChangeText(e.target.value)}
                placeholder="Describe the changes in natural language (e.g., move closing to Sept 15, add 7-day inspection contingency)."
  className="w-full min-h-[120px] input-neon px-3 py-2 placeholder-amber-200/70"
              />
              <button
                onClick={handleAmendContracts}
                disabled={amendLoading}
        className={`px-4 py-2 rounded-lg text-white bg-primary hover:opacity-95 font-medium transition ${amendLoading ? 'opacity-70 cursor-wait' : ''}`}
              >
                {amendLoading ? 'Generating…' : 'Generate amendment summary'}
              </button>
              {amendDraft && (
        <div className="mt-2 p-3 rounded-xl text-sm whitespace-pre-wrap content-box-light">
                  {amendDraft}
                </div>
              )}
              </>
              )}
            </div>
          </div>
        </div>
        </>
        )}
      </div>
    </main>
  )
}
