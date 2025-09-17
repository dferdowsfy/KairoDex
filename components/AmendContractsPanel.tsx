"use client"
import React, { useEffect, useMemo, useState, forwardRef, useImperativeHandle } from 'react'
import { useUI } from '@/store/ui'
import { useClient } from '@/hooks/useClient'
import { US_STATES, getStateByCode } from '@/lib/us'
import { getContractsForJurisdiction, type ContractTemplate } from '@/lib/contracts'
import { getContractDisplayName, CONTRACT_CATEGORIES } from '@/lib/contractMappings'

const ALLOWED_STATES = ['MD', 'DC', 'VA'] as const

export interface AmendContractsPanelHandle { apply: () => Promise<boolean> }

const AmendContractsPanel = forwardRef<AmendContractsPanelHandle>(function AmendContractsPanel(_, ref) {
  const { selectedClientId, pushToast } = useUI()
  const { data: activeClient } = useClient((selectedClientId || '') as any)

  // Jurisdiction and contracts state
  const [stateCode, setStateCode] = useState<string>('')
  const [countyFips, setCountyFips] = useState<string>('')
  const [counties, setCounties] = useState<{ name: string; fips: string }[]>([])
  const [contractId, setContractId] = useState<string>('')
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null)
  const [nlCommand, setNlCommand] = useState('')
  const [applyLoading, setApplyLoading] = useState(false)
  const [applyResult, setApplyResult] = useState<{ updated?: string; summary?: string } | null>(null)
  const [supabaseContracts, setSupabaseContracts] = useState<any[]>([])
  const [loadingSupabase, setLoadingSupabase] = useState(false)
  const [selectedSupabaseContract, setSelectedSupabaseContract] = useState<string>('')
  const [contractPreview, setContractPreview] = useState<string>('')
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [sendingDs, setSendingDs] = useState(false)
  const [dsError, setDsError] = useState<string | null>(null)

  // Counties by state via API
  useEffect(() => {
    const s = stateCode && getStateByCode(stateCode)
    if (!s) { setCounties([]); setCountyFips(''); return }
    const fips = s.fips
    fetch(`/api/geo/counties?state=${encodeURIComponent(fips)}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject(new Error('counties failed')))
      .then(json => setCounties(json.items || []))
      .catch(() => setCounties([]))
  }, [stateCode])

  // Load Supabase contracts when state/county changes (MD/DC/VA only)
  useEffect(() => {
    if (!stateCode || !ALLOWED_STATES.includes(stateCode as any)) {
      setSupabaseContracts([])
      return
    }
    setLoadingSupabase(true)
    const load = async () => {
      try {
        const { supabase } = await import('@/lib/supabaseBrowser')
        let query = supabase.from('contract_files').select('*').eq('state_code', stateCode)
        if (countyFips) query = query.eq('county_fips', countyFips)
        const { data, error } = await query
        if (error) throw error
        setSupabaseContracts(data || [])
      } catch (e) {
        setSupabaseContracts([])
      } finally {
        setLoadingSupabase(false)
      }
    }
    load()
  }, [stateCode, countyFips])

  // Hardcoded templates list for jurisdiction
  const hardcodedContracts = useMemo(
    () => getContractsForJurisdiction(stateCode || undefined, countyFips || undefined),
    [stateCode, countyFips]
  )

  // Combined list
  const contracts = useMemo(() => {
    const supabaseOptions = supabaseContracts.map(sc => ({
      id: `sb:${sc.id}`,
      name: sc.contract_name,
      template: '',
      supabaseContract: sc
    }))
    return [...supabaseOptions, ...hardcodedContracts]
  }, [supabaseContracts, hardcodedContracts])

  // Reflect selection -> template and preview
  useEffect(() => {
    const found = contracts.find(c => c.id === contractId) || null
    setSelectedTemplate(found)
    setApplyResult(null)
    if (!contractId) return
    if (contractId.startsWith('sb:')) {
      const actualId = contractId.replace('sb:', '')
      loadContractPreview(actualId)
    } else {
      setContractPreview('')
    }
  }, [contractId, contracts])

  const loadContractPreview = async (id: string) => {
    setLoadingPreview(true)
    try {
      const res = await fetch(`/api/contracts/preview?id=${id}`, { cache: 'no-store' })
      const data = await res.json()
      if (res.ok) setContractPreview(data.previewText || 'No preview available')
      else setContractPreview('Failed to load contract preview')
    } catch {
      setContractPreview('Error loading contract preview')
    } finally {
      setLoadingPreview(false)
    }
  }

  const onLoadSupabaseContract = async (contractFile: any) => {
    if (!contractFile) return
    setApplyResult(null)
    try {
      // Prefer server preview endpoint for reliability (works even for PDFs and private storage)
      setSelectedTemplate({ id: `sb:${contractFile.id}`, name: getContractDisplayName(contractFile.path.split('/').pop() || ''), template: '' })
      setContractId('')
      setSelectedSupabaseContract(contractFile.id)
      await loadContractPreview(contractFile.id)
    } catch (e:any) {
      alert(e?.message || 'Failed to load contract preview')
    }
  }

  const onApplyChanges = async (): Promise<boolean> => {
    if (!nlCommand.trim()) { pushToast({ type: 'info', message: 'Describe the changes to apply.' }); return false }
    if (!selectedTemplate && !selectedSupabaseContract) { pushToast({ type: 'info', message: 'Pick a contract first.' }); return false }
    if (!selectedClientId) { pushToast({ type: 'info', message: 'Pick a client first.' }); return false }
    setApplyLoading(true)
    setApplyResult(null)
    try {
      // Optimistic local adjustments (e.g., date change) so user sees something immediately
      const dateInstr = nlCommand.match(/change\s+(the\s+)?(contract\s+)?date\s+(to|=)\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/i)
      if (dateInstr && contractPreview) {
        const newDate = dateInstr[4]
        const firstDateRegex = /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/
        if (!contractPreview.includes(newDate)) {
          const locallyPatched = contractPreview.replace(firstDateRegex, newDate)
          if (locallyPatched !== contractPreview) setContractPreview(locallyPatched)
        }
      }
      const useSb = selectedSupabaseContract || (selectedTemplate?.id?.startsWith('sb:'))
      const contractFileId = selectedSupabaseContract || (selectedTemplate?.id?.startsWith('sb:') ? selectedTemplate.id.replace('sb:', '') : null)
      if (useSb && contractFileId) {
  const res = await fetch('/api/contracts/amend-storage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contractFileId, naturalChanges: nlCommand, clientId: selectedClientId, baseText: contractPreview || null }) })
        const json = await res.json(); if (!res.ok) throw new Error(json?.error || 'Failed to amend')
        // Show the actual amended contract text, not just a success message
        setApplyResult({ updated: json.amendedText || 'Contract amended successfully', summary: json.summary })
        if (json.amendedText) setContractPreview(json.amendedText)
        // Keep the amended text visible; only update internal selection so future applies amend the new version
        if (json.updatedContractId) { 
          setSelectedSupabaseContract(json.updatedContractId)
          // Update contractId to point to the new amended contract for consistent state
          setContractId(`sb:${json.updatedContractId}`)
          // Also load the preview from the new contract to ensure it's the amended version
          await loadContractPreview(json.updatedContractId)
        }
        // refresh
        const { supabase } = await import('@/lib/supabaseBrowser')
        let query = supabase.from('contract_files').select('*').eq('state_code', stateCode)
        if (countyFips) query = query.eq('county_fips', countyFips)
        const { data: refreshed } = await query
        if (refreshed) setSupabaseContracts(refreshed)
      } else if (selectedTemplate?.template) {
        const clientContext = { clientId: selectedClientId, location: { state: stateCode, countyFips }, templateId: selectedTemplate.id }
        const res = await fetch('/api/contracts/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contractTemplate: selectedTemplate.template, naturalChanges: nlCommand, clientContext }) })
        const json = await res.json(); if (!res.ok) throw new Error(json?.error || 'Failed to apply')
        setApplyResult({ updated: json.updated, summary: json.summary })
        if (json.updated) setContractPreview(json.updated)
      } else {
        throw new Error('No valid contract selected')
      }
  return true
    } catch (e:any) {
      alert(e?.message || 'Failed to apply changes')
      return false
    } finally {
      setApplyLoading(false)
    }
  }

  useImperativeHandle(ref, () => ({ apply: async () => await onApplyChanges() }))

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 mt-3 space-y-3 relative">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-slate-900">Amend Contracts</div>
        {activeClient && (
          <div className="text-sm text-slate-500">Client: {(activeClient as any)?.name || (activeClient as any)?.first_name || ''} {(activeClient as any)?.last_name || ''}</div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <select className="input-neon px-2 py-2" value={stateCode} onChange={e => { setStateCode(e.target.value); setCountyFips(''); setContractId('') }}>
          <option value="">Select state…</option>
          {ALLOWED_STATES.map(code => {
            const s = US_STATES.find(x => x.code === code)
            return s ? <option key={s.code} value={s.code}>{s.name}</option> : null
          })}
        </select>
        <select className="input-neon px-2 py-2" value={countyFips} onChange={e => { setCountyFips(e.target.value); setContractId('') }} disabled={!stateCode}>
          <option value="">All counties</option>
          {counties.map(c => <option key={c.fips} value={c.fips}>{c.name}</option>)}
        </select>
        <select className="input-neon px-2 py-2" value={contractId} onChange={e => setContractId(e.target.value)} disabled={!stateCode}>
          <option value="">Select contract…</option>
          {contracts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {(loadingSupabase || supabaseContracts.length > 0) && !contractId && (
        <div className="mt-2">
          <div className="text-sm text-ink/80 mb-2 font-medium">Your uploaded contracts</div>
          {loadingSupabase ? (
            <div className="text-slate-600">Loading contracts...</div>
          ) : (
            <div className="space-y-4">
              {Object.entries(CONTRACT_CATEGORIES).map(([category, categoryFiles]) => {
                const categoryContracts = supabaseContracts.filter(contract => categoryFiles.includes(contract.path.split('/').pop() || ''))
                if (categoryContracts.length === 0) return null
                return (
                  <div key={category}>
                    <div className="text-sm font-semibold mb-2">{category}</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {categoryContracts.map(contract => {
                        const filename = contract.path.split('/').pop() || ''
                        const displayName = getContractDisplayName(filename)
                        return (
                          <button
                            key={contract.id}
                            className={`p-4 rounded-lg border text-left text-base font-medium ${selectedSupabaseContract === contract.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50'}`}
                            onClick={() => onLoadSupabaseContract(contract)}
                          >
                            <div className="font-semibold">{displayName}</div>
                            <div className="text-sm opacity-70 mt-1">{contract.state_code} • {contract.status} • v{contract.version}</div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {contractId && selectedTemplate && (
        <div className="mt-2">
          <div className="text-sm text-ink/80 mb-2 font-medium">Selected Contract</div>
          <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 text-slate-900">
            <div className="font-semibold text-lg">{selectedTemplate.name}</div>
            <div className="text-sm opacity-70 mt-1">{contractId.startsWith('sb:') ? 'From your uploads' : 'Template contract'}</div>
          </div>
          <button className="mt-2 text-sm text-slate-700 hover:text-slate-900 font-medium" onClick={() => { setContractId(''); setSelectedTemplate(null); setSelectedSupabaseContract(''); setNlCommand(''); setApplyResult(null) }}>← Back to all contracts</button>
        </div>
      )}

  {(selectedTemplate || selectedSupabaseContract) && (
        <div className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            {/* Preview Panel */}
            <div className="contract-preview rounded-xl p-4 border border-slate-200 bg-slate-50 max-h-[60vh] overflow-auto order-2 lg:order-1">
              <div className="text-sm font-semibold mb-2 sticky top-0 bg-slate-50/95 backdrop-blur-sm py-1">Contract Preview</div>
              {loadingPreview ? (
                <div className="text-red-700">Loading contract...</div>
              ) : contractPreview ? (
                <pre className="whitespace-pre-wrap text-slate-900">{contractPreview}</pre>
              ) : selectedTemplate?.template ? (
                <pre className="whitespace-pre-wrap text-slate-900">{selectedTemplate.template}</pre>
              ) : (
                <div className="text-slate-600">No preview available</div>
              )}
            </div>
            {/* Describe Changes (Sticky) */}
            <div className="flex flex-col gap-4 order-1 lg:order-2 lg:sticky lg:top-4">
              <div>
                <div className="text-sm text-ink/80 mb-2 font-semibold">Describe your changes</div>
                <textarea className="w-full h-[28vh] lg:h-[32vh] input-neon p-3 text-base text-black placeholder-black/70 resize-vertical" value={nlCommand} onChange={e => setNlCommand(e.target.value)} placeholder="e.g., extend closing by 10 days; increase earnest money to $5,000; add inspection contingency." />
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <button className={`px-4 py-2 rounded-lg text-white ${applyLoading ? 'bg-slate-400' : 'bg-slate-900 hover:opacity-95'}`} disabled={applyLoading || !nlCommand.trim()} onClick={onApplyChanges}>{applyLoading ? 'Applying…' : 'Apply changes'}</button>
                <button className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-900" onClick={() => { setNlCommand(''); setApplyResult(null) }}>Reset</button>
                {(contractPreview || selectedSupabaseContract) && (
                  <button
                    className={`px-4 py-2 rounded-lg text-white ${sendingDs ? 'bg-slate-500' : 'bg-red-700 hover:bg-red-800'}`}
                    disabled={sendingDs}
                    onClick={async () => {
                      setDsError(null)
                      setSendingDs(true)
                      try {
                        const payload: any = selectedSupabaseContract
                          ? { contractId: selectedSupabaseContract }
                          : { text: contractPreview || selectedTemplate?.template, name: selectedTemplate?.name || 'Contract' }
                        const res = await fetch('/api/docusign/sender-view', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                        const json = await res.json()
                        if (!res.ok) {
                          if ((json?.error || '').toLowerCase().includes('consent')) {
                            const c = await fetch('/api/docusign/consent')
                            const j = await c.json()
                            if (j?.url) window.open(j.url, '_blank', 'noopener')
                            else throw new Error(json?.error || 'DocuSign consent required')
                          } else {
                            throw new Error(json?.error || `Failed to start DocuSign (${res.status})`)
                          }
                        } else if (json?.url) {
                          window.open(json.url, '_blank', 'noopener')
                        }
                      } catch (e:any) {
                        setDsError(e?.message || 'DocuSign error')
                      } finally {
                        setSendingDs(false)
                      }
                    }}
                  >
                    {sendingDs ? 'Opening DocuSign…' : 'Send to DocuSign'}
                  </button>
                )}
              </div>
              {dsError && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{dsError}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {applyResult && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 overflow-auto max-h-[50vh]">
            <div className="text-sm font-semibold mb-2">Updated Contract</div>
            <pre className="whitespace-pre-wrap text-slate-900">{applyResult.updated}</pre>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 overflow-auto max-h-[50vh]">
            <div className="text-sm font-semibold mb-2">Summary of Changes</div>
            <pre className="whitespace-pre-wrap text-slate-900">{applyResult.summary}</pre>
          </div>
        </div>
      )}
    </section>
  )
})

export default AmendContractsPanel
