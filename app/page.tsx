"use client"
export const dynamic = 'force-dynamic'
import React, { useState } from 'react'
import { useClients } from '@/hooks/useClients'
import { Sparkles, Users, Clock, TrendingUp, Calendar, Phone, Mail, BarChart2 } from 'lucide-react'

export default function HomePage() {
  const { data: clients = [] } = useClients()
  
  // Calculate stats from clients data
  const activeClients = clients.filter(c => ['touring', 'offer', 'under_contract'].includes(c.stage)).length
  const newLeads = clients.filter(c => c.stage === 'new').length
  const closings = clients.filter(c => c.stage === 'under_contract').length
  const totalClients = clients.length

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        
        {/* Welcome Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Dashboard Overview</h1>
          <p className="text-lg text-gray-600">Your real estate business at a glance</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Active Clients */}
          <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white shadow-2xl backdrop-blur-xl border border-white/10">
            <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Active Clients</h3>
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
              </div>
              <div className="text-3xl font-bold mb-2">{activeClients}</div>
              <div className="text-blue-200 text-sm">Currently touring, offering, or under contract</div>
            </div>
          </div>

          {/* New Leads */}
          <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white shadow-2xl backdrop-blur-xl border border-white/10">
            <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">New Leads</h3>
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
              </div>
              <div className="text-3xl font-bold mb-2">{newLeads}</div>
              <div className="text-emerald-200 text-sm">Fresh prospects to nurture</div>
            </div>
          </div>

          {/* Pending Closings */}
          <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-orange-600 via-orange-700 to-red-800 text-white shadow-2xl backdrop-blur-xl border border-white/10">
            <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Pending Closings</h3>
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
              </div>
              <div className="text-3xl font-bold mb-2">{closings}</div>
              <div className="text-orange-200 text-sm">Under contract</div>
            </div>
          </div>

          {/* Total Portfolio */}
          <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 text-white shadow-2xl backdrop-blur-xl border border-white/10">
            <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Total Clients</h3>
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
              <div className="text-3xl font-bold mb-2">{totalClients}</div>
              <div className="text-purple-200 text-sm">All clients in your portfolio</div>
            </div>
          </div>
        </div>

        {/* Recent Clients */}
        <div className="relative overflow-hidden rounded-3xl p-8 bg-white/80 backdrop-blur-xl border border-gray-200 shadow-xl">
          <div className="absolute inset-0 bg-white/40 backdrop-blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Recent Clients</h2>
              <a href="/clients" className="text-blue-600 hover:text-blue-700 font-medium">View all</a>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clients.slice(0, 6).map((client) => (
                <a
                  key={client.id}
                  href={`/clients/${client.id}`}
                  className="block p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200 hover:shadow-lg transition-all duration-200 hover:scale-105"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {client.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{client.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{client.stage.replace('_', ' ')}</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-6 bg-white/80 backdrop-blur-sm rounded-3xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-200 hover:scale-105 group">
            <div className="mb-3 group-hover:scale-110 transition-transform"><Phone className="w-7 h-7"/></div>
            <div className="text-sm font-medium text-gray-700">Schedule Calls</div>
          </button>
          <button className="p-6 bg-white/80 backdrop-blur-sm rounded-3xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-200 hover:scale-105 group">
            <div className="mb-3 group-hover:scale-110 transition-transform"><Mail className="w-7 h-7"/></div>
            <div className="text-sm font-medium text-gray-700">Send Emails</div>
          </button>
          <button className="p-6 bg-white/80 backdrop-blur-sm rounded-3xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-200 hover:scale-105 group">
            <div className="mb-3 group-hover:scale-110 transition-transform"><Calendar className="w-7 h-7"/></div>
            <div className="text-sm font-medium text-gray-700">View Calendar</div>
          </button>
          <button className="p-6 bg-white/80 backdrop-blur-sm rounded-3xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-200 hover:scale-105 group">
            <div className="mb-3 group-hover:scale-110 transition-transform"><BarChart2 className="w-7 h-7"/></div>
            <div className="text-sm font-medium text-gray-700">View Reports</div>
          </button>
        </div>
      </div>
    </main>
  )
}
