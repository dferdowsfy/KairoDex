"use client"
export const dynamic = 'force-dynamic'
import { useParams } from 'next/navigation'
import { useClient } from '@/hooks/useClient'
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { US_STATES } from '@/lib/us'
import { getContractsForJurisdiction, type ContractTemplate } from '@/lib/contracts'
import { PhoneCall, Mail, Calendar, Wallet, House, Landmark, Phone, BarChart2, NotebookPen, ChevronDown } from 'lucide-react'

interface SheetRow {
  [key: string]: string | number | boolean | null
}

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id as string
  const { data: client } = useClient(id)
  
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
  const [openAmend, setOpenAmend] = useState(false)

  const hasError = !!error
  const loading = !client || !sheetRow

  // Extract data from specific columns
  const clientName = !loading ? (`${sheetRow['name_first'] || ''} ${sheetRow['name_last'] || ''}`.trim() || sheetRow['name'] as string || client.name) : ''
  const status = !loading ? ((sheetRow['stage'] as string) || client.stage) : ''
  const budgetMin = !loading ? (sheetRow['budget_min'] as string || '') : ''
  const budgetMax = !loading ? (sheetRow['budget_max'] as string || '') : ''
  const style = !loading ? ((sheetRow['style'] as string) || (sheetRow['property_style'] as string) || '') : ''
  const financing = !loading ? ((sheetRow['financing'] as string) || (sheetRow['financing_type'] as string) || '') : ''
  const preferredComm = !loading ? ((sheetRow['preferred_communication'] as string) || (sheetRow['preferred_channel'] as string) || '') : ''
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
    setOpenAmend(false)
  }, [id])

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
    <main key={id} className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {hasError && (
          <div className="text-center py-12">
            <div className="text-lg text-red-600">Failed to load client dashboard.</div>
          </div>
        )}
        {loading && !hasError && (
          <div className="text-center py-12">
            <div className="text-lg text-gray-600">Loading client dashboard...</div>
          </div>
        )}
        {!loading && !hasError && (
        <>
        
        {/* Client Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">{clientName}</h1>
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 shadow-sm">
            <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
            <span className="text-sm font-medium text-gray-700 capitalize">{status.replace('_', ' ')}</span>
          </div>
        </div>

        {/* Glass Tile Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
      {/* Budget Tile */}
          <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 text-white shadow-2xl backdrop-blur-xl border border-white/10">
            <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Budget Range</h3>
        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center"><Wallet className="w-5 h-5"/></div>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold">{formatCurrency(budgetMin)}</div>
                <div className="text-purple-200 text-sm">to</div>
                <div className="text-2xl font-bold">{formatCurrency(budgetMax)}</div>
              </div>
            </div>
          </div>

      {/* Style Preference Tile */}
          <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-800 text-white shadow-2xl backdrop-blur-xl border border-white/10">
            <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Style Preference</h3>
        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center"><House className="w-5 h-5"/></div>
              </div>
              <div className="text-2xl font-bold capitalize">
                {style || 'Not specified'}
              </div>
            </div>
          </div>

      {/* Financing Tile */}
          <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-orange-600 via-orange-700 to-red-800 text-white shadow-2xl backdrop-blur-xl border border-white/10">
            <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Financing</h3>
        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center"><Landmark className="w-5 h-5"/></div>
              </div>
              <div className="text-2xl font-bold capitalize">
                {financing || 'Not specified'}
              </div>
            </div>
          </div>

      {/* Communication Preference Tile */}
          <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white shadow-2xl backdrop-blur-xl border border-white/10">
            <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Preferred Contact</h3>
        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center"><Phone className="w-5 h-5"/></div>
              </div>
              <div className="text-2xl font-bold capitalize">
                {preferredComm || 'Not specified'}
              </div>
            </div>
          </div>

      {/* Status Tile */}
          <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-pink-600 via-pink-700 to-rose-800 text-white shadow-2xl backdrop-blur-xl border border-white/10">
            <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Current Status</h3>
        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center"><BarChart2 className="w-5 h-5"/></div>
              </div>
              <div className="text-2xl font-bold capitalize">
                {status.replace('_', ' ')}
              </div>
            </div>
          </div>

      {/* Contact Info Tile */}
          <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-violet-600 via-violet-700 to-purple-800 text-white shadow-2xl backdrop-blur-xl border border-white/10">
            <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Contact Info</h3>
        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center"><Mail className="w-5 h-5"/></div>
              </div>
              <div className="space-y-2">
                <div className="text-lg font-medium">{client.email || 'No email'}</div>
                <div className="text-lg font-medium">{client.phone || 'No phone'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Notes Section */}
        {notes && (
          <div className="mt-8">
            <div className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-slate-700 via-slate-800 to-gray-900 text-white shadow-2xl backdrop-blur-xl border border-white/10">
              <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl"></div>
              <div className="relative z-10">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mr-4"><NotebookPen className="w-5 h-5"/></div>
                  <h3 className="text-2xl font-bold">Notes</h3>
                </div>
                <div className="text-lg leading-relaxed whitespace-pre-wrap">
                  {notes}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
          <a
            href={telHref || undefined}
            aria-disabled={!telHref}
            className={`p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-sm transition-all duration-200 ${telHref ? 'hover:shadow-md hover:scale-105' : 'opacity-50 cursor-not-allowed'}`}
          >
            <PhoneCall className="w-6 h-6 mb-2"/>
            <div className="text-sm font-medium text-gray-700">Call Client</div>
            {!telHref && <div className="text-xs text-gray-500 mt-1">No phone on file</div>}
          </a>
          <a
            href={mailtoHref || undefined}
            aria-disabled={!mailtoHref}
            className={`p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-sm transition-all duration-200 ${mailtoHref ? 'hover:shadow-md hover:scale-105' : 'opacity-50 cursor-not-allowed'}`}
          >
            <Mail className="w-6 h-6 mb-2"/>
            <div className="text-sm font-medium text-gray-700">Send Email</div>
            {!mailtoHref && <div className="text-xs text-gray-500 mt-1">No email on file</div>}
          </a>
          <button className="p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105">
            <Calendar className="w-6 h-6 mb-2"/>
            <div className="text-sm font-medium text-gray-700">Schedule</div>
          </button>
        </div>

  {/* AI Tools */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-800 text-white shadow-2xl backdrop-blur-xl border border-white/10">
            <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl"></div>
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Generate follow-up</h3>
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center"><Mail className="w-5 h-5"/></div>
              </div>
              <button
                onClick={handleGenerateFollowup}
                disabled={followupLoading}
                className={`px-4 py-2 rounded-lg text-indigo-900 bg-white/90 hover:bg-white font-medium transition ${followupLoading ? 'opacity-70 cursor-wait' : ''}`}
              >
                {followupLoading ? 'Generating…' : 'Draft email'}
              </button>
              {followupDraft && (
                <div className="mt-2 p-3 bg-black/30 rounded-xl text-sm whitespace-pre-wrap">
                  {followupDraft}
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <span className="opacity-80">Tone:</span>
                <select
                  value={tone}
                  onChange={e => setTone(e.target.value as any)}
                  className="text-indigo-900 rounded-md px-2 py-1 bg-white/90"
                >
                  <option>Professional</option>
                  <option>Casual</option>
                  <option>Friendlier</option>
                </select>
                <button onClick={handleGenerateFollowup} className="px-3 py-1 rounded-md bg-white/80 text-indigo-900 border border-white/40">Regenerate</button>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-amber-600 via-amber-700 to-red-700 text-white shadow-2xl backdrop-blur-xl border border-white/10">
            <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl"></div>
            <div className="relative z-10 space-y-4">
              <button type="button" onClick={()=>setOpenAmend(v=>!v)} className="w-full text-left flex items-center justify-between">
                <span className="inline-flex items-center gap-2"><div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center"><NotebookPen className="w-5 h-5"/></div><span className="text-lg font-semibold">Amend contracts</span></span>
                <ChevronDown className={`w-5 h-5 transition-transform ${openAmend ? 'rotate-180' : ''}`} />
              </button>
              {openAmend && (
              <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select value={stateCode} onChange={e => setStateCode(e.target.value)} className="text-amber-900 rounded-md px-2 py-2 bg-white/90">
                  <option value="">State</option>
                  {US_STATES.map(s => (
                    <option key={s.code} value={s.code}>{s.name}</option>
                  ))}
                </select>
                <select value={countyFips} onChange={e => setCountyFips(e.target.value)} className="text-amber-900 rounded-md px-2 py-2 bg-white/90">
                  <option value="">Jurisdiction (County)</option>
                  {counties.map(c => (
                    <option key={c.fips} value={c.fips}>{c.name}</option>
                  ))}
                </select>
                <select value={selectedContractId} onChange={e => setSelectedContractId(e.target.value)} className="text-amber-900 rounded-md px-2 py-2 bg-white/90">
                  {contracts.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <textarea
                value={changeText}
                onChange={e => setChangeText(e.target.value)}
                placeholder="Describe the changes in natural language (e.g., move closing to Sept 15, add 7-day inspection contingency)."
                className="w-full min-h-[120px] text-amber-900 rounded-lg px-3 py-2 bg-white/90 placeholder-amber-800/70"
              />
              <button
                onClick={handleAmendContracts}
                disabled={amendLoading}
                className={`px-4 py-2 rounded-lg text-amber-900 bg-white/90 hover:bg-white font-medium transition ${amendLoading ? 'opacity-70 cursor-wait' : ''}`}
              >
                {amendLoading ? 'Generating…' : 'Generate amendment summary'}
              </button>
              {amendDraft && (
                <div className="mt-2 p-3 bg-black/30 rounded-xl text-sm whitespace-pre-wrap">
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
