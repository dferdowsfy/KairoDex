"use client"
export const dynamic = 'force-dynamic'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useClients } from '@/hooks/useClients'
import { Sparkles, Users, Clock, TrendingUp, Calendar, Phone, Mail, BarChart2, FileEdit } from 'lucide-react'
import { useUI } from '@/store/ui'
import { useClient } from '@/hooks/useClient'

export default function HomePage() {
  const { data: clients = [] } = useClients()
  const router = useRouter()
  const { selectedClientId, pushToast } = useUI()
  const { data: activeClient } = useClient((selectedClientId || '') as any)
  
  // Calculate stats from clients data
  const activeClients = clients.filter(c => ['touring', 'offer', 'under_contract'].includes(c.stage)).length
  const newLeads = clients.filter(c => c.stage === 'new').length
  const closings = clients.filter(c => c.stage === 'under_contract').length
  const totalClients = clients.length
  const mailtoHref = (() => {
    const email = (activeClient as any)?.email
    if (!email) return ''
    const subject = encodeURIComponent('Follow-up')
    return `mailto:${email}?subject=${subject}`
  })()

  return (
    <main className="min-h-screen" style={{ background: 'var(--page-bg)' }}>
  <div className="max-w-7xl mx-auto p-6 space-y-6">
        
        {/* Welcome Header */}
        <div className="text-center mb-8 lh-section-loose">
          <h1 className="sf-display h1 text-white mb-1">Dashboard Overview</h1>
          <p className="sf-text text-[1.0625rem] text-ink/70">Your real estate business at a glance</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Active Clients */}
          <div className="relative overflow-hidden rounded-apple p-6 tile tile-active">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4 lh-card-tight">
                <h3 className="sf-display h3 text-white">Active Clients</h3>
                <div className="w-10 h-10 rounded-lg grid place-items-center icon-chip-dark">
                  <Users className="w-6 h-6 icon-accent-active" />
                </div>
              </div>
                <div className="sf-display text-3xl font-semibold mb-1 text-white">{activeClients}</div>
                <div className="sf-text text-sm text-gray-200">Currently touring, offering, or under contract</div>
            </div>
          </div>

          {/* New Leads */}
          <div className="relative overflow-hidden rounded-apple p-6 tile tile-leads">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4 lh-card-tight">
                <h3 className="sf-display h3 text-white">New Leads</h3>
                <div className="w-10 h-10 rounded-lg grid place-items-center icon-chip-dark">
                  <Sparkles className="w-6 h-6 icon-accent-leads" />
                </div>
              </div>
                <div className="sf-display text-3xl font-semibold mb-1 text-white">{newLeads}</div>
                <div className="sf-text text-sm text-gray-200">Fresh prospects to nurture</div>
            </div>
          </div>

          {/* Pending Closings */}
          <div className="relative overflow-hidden rounded-apple p-6 tile tile-closings">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4 lh-card-tight">
                <h3 className="sf-display h3 text-[#111827]">Pending Closings</h3>
                <div className="w-10 h-10 rounded-lg grid place-items-center icon-chip-yellow">
                  <Clock className="w-6 h-6 icon-accent-closings" />
                </div>
              </div>
                <div className="sf-display text-3xl font-semibold mb-1 text-[#111827]">{closings}</div>
                <div className="sf-text text-sm text-slate-700">Under contract</div>
            </div>
          </div>

          {/* Total Portfolio */}
          <div className="relative overflow-hidden rounded-apple p-6 tile tile-total">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4 lh-card-tight">
                <h3 className="sf-display h3 text-white">Total Clients</h3>
                <div className="w-10 h-10 rounded-lg grid place-items-center icon-chip-dark">
                  <TrendingUp className="w-6 h-6 icon-accent-total" />
                </div>
              </div>
                <div className="sf-display text-3xl font-semibold mb-1 text-white">{totalClients}</div>
                <div className="sf-text text-sm text-gray-200">All clients in your portfolio</div>
            </div>
          </div>
        </div>

        {/* Recent Clients */}
  <div className="relative overflow-hidden rounded-apple p-8 panel-glass">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="sf-display h2 text-ink">Recent Clients</h2>
              <a href="/clients" className="text-primary hover:opacity-90 font-medium">View all</a>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clients.slice(0, 6).map((client) => (
                <a
                  key={client.id}
                  href={`/clients/${client.id}`}
                  onClick={() => useUI.getState().setSelectedClientId(client.id)}
                  className="block p-4 panel-glass rounded-2xl hover:shadow-lg transition-all duration-200 hover:scale-105"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full grid place-items-center bg-primary text-white font-semibold">
                {(client.name ?? client.email ?? "?").charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="sf-text text-[0.95rem] font-medium text-white truncate">{client.name}</p>
                        <p className="sf-text text-xs text-gray-300 capitalize">{client.stage.replace('_', ' ')}</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <button className="p-6 panel-glass rounded-apple shadow-sm hover:shadow-lg transition-all duration-200 hover:scale-105 group" onClick={() => router.push('/tasks?quick=calls')}>
            <div className="mb-3 group-hover:scale-110 transition-transform"><Phone className="w-7 h-7"/></div>
            <div className="text-sm font-medium text-white">Schedule Calls</div>
          </button>
          <a
            href={mailtoHref || undefined}
            aria-disabled={!mailtoHref}
            onClick={(e) => { if (!mailtoHref) { e.preventDefault(); pushToast({ type: 'info', message: 'Pick a client with an email from the top bar first.' }) } }}
            className={`p-6 panel-glass rounded-apple shadow-sm transition-all duration-200 group ${mailtoHref ? 'hover:shadow-lg hover:scale-105' : 'opacity-60 cursor-not-allowed'}`}
          >
            <div className="mb-3 group-hover:scale-110 transition-transform"><Mail className="w-7 h-7"/></div>
            <div className="text-sm font-medium text-white">Send Emails</div>
          </a>
          <button className="p-6 panel-glass rounded-apple shadow-sm hover:shadow-lg transition-all duration-200 hover:scale-105 group" onClick={() => router.push('/tasks?view=calendar')}>
            <div className="mb-3 group-hover:scale-110 transition-transform"><Calendar className="w-7 h-7"/></div>
            <div className="text-sm font-medium text-white">View Calendar</div>
          </button>
          <button className="p-6 panel-glass rounded-apple shadow-sm hover:shadow-lg transition-all duration-200 hover:scale-105 group" onClick={() => router.push('/clients?view=reports')}>
            <div className="mb-3 group-hover:scale-110 transition-transform"><BarChart2 className="w-7 h-7"/></div>
            <div className="text-sm font-medium text-white">View Reports</div>
          </button>
          <button className="p-6 panel-glass rounded-apple shadow-sm hover:shadow-lg transition-all duration-200 hover:scale-105 group" onClick={() => router.push('/followup')}>
            <div className="mb-3 group-hover:scale-110 transition-transform"><Sparkles className="w-7 h-7"/></div>
            <div className="text-sm font-medium text-white">Generate Follow‑Up</div>
          </button>
          <button className="p-6 panel-glass rounded-apple shadow-sm hover:shadow-lg transition-all duration-200 hover:scale-105 group" onClick={() => {
            if (selectedClientId) {
              window.location.href = `/clients/${selectedClientId}#amend`
            } else {
              pushToast({ type: 'info', message: 'Pick a client from the top bar to amend a contract.' })
            }
          }}>
            <div className="mb-3 group-hover:scale-110 transition-transform"><FileEdit className="w-7 h-7"/></div>
            <div className="text-sm font-medium text-white">Amend Contracts</div>
          </button>
        </div>
      </div>
    </main>
  )
}
 
