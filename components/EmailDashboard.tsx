"use client"
import { useState } from 'react'
import useSWR from 'swr'
import { format } from 'date-fns'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface EmailSchedule {
  id: string
  campaign_id: string
  client_id: string
  scheduled_at: string
  status: 'scheduled' | 'sent' | 'cancelled'
  email_subject: string
  email_content: string
  recipient_email: string
  sent_at?: string
  error_message?: string
  created_at: string
  clients?: {
    name: string
    company?: string
  }
}

interface EmailDeliveryLog {
  id: string
  schedule_id: string
  attempt_number: number
  status: 'success' | 'failed' | 'bounced' | 'rejected'
  provider_response: any
  attempted_at: string
  delivery_time_ms?: number
}

interface EmailCampaign {
  id: string
  client_id: string
  name: string
  description?: string
  frequency_type: string
  start_date: string
  end_date?: string
  is_active: boolean
  created_at: string
  clients?: {
    name: string
    email: string
  }
}

export default function EmailDashboard() {
  const [activeTab, setActiveTab] = useState<'schedules' | 'campaigns' | 'logs'>('schedules')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  
  // Fetch email schedules
  const { data: schedulesData, error: schedulesError, mutate: refetchSchedules } = useSWR(
    '/api/email/schedules', 
    fetcher
  )
  
  // Fetch email campaigns  
  const { data: campaignsData, error: campaignsError } = useSWR(
    '/api/email/campaigns',
    fetcher
  )

  // Fetch delivery logs
  const { data: logsData, error: logsError } = useSWR(
    '/api/email/delivery-logs',
    fetcher
  )

  const schedules: EmailSchedule[] = schedulesData?.schedules || []
  const campaigns: EmailCampaign[] = campaignsData?.campaigns || []
  const logs: EmailDeliveryLog[] = logsData?.logs || []

  // Filter schedules by status
  const filteredSchedules = schedules.filter(schedule => 
    statusFilter === 'all' || schedule.status === statusFilter
  )

  // Process pending emails manually
  const processPendingEmails = async () => {
    try {
      const response = await fetch('/api/email/worker/process', {
        headers: {
          'x-cron-secret': 'dev-secret' // Dev override
        }
      })
      const result = await response.json()
      
      if (response.ok) {
        alert(`Processed ${result.processed || 0} emails successfully!`)
        refetchSchedules() // Refresh the data
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      alert('Failed to process emails')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
  case 'sent': return 'bg-green-100 text-green-800'
  case 'scheduled': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      default: return 'bg-blue-100 text-blue-800'
    }
  }

  const getStats = () => {
    const total = schedules.length
  const sent = schedules.filter(s => s.status === 'sent').length
  const scheduled = schedules.filter(s => s.status === 'scheduled').length
  return { total, sent, scheduled }
  }

  const stats = getStats()

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900">📧 Email Dashboard</h1>
          <button
            onClick={processPendingEmails}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            🚀 Process Pending Emails
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Emails</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
            <div className="text-sm text-gray-600">Sent</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-yellow-600">{stats.scheduled}</div>
            <div className="text-sm text-gray-600">Scheduled</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'schedules', label: 'Email Schedules', count: schedules.length },
              { key: 'campaigns', label: 'Campaigns', count: campaigns.length },
              { key: 'logs', label: 'Delivery Logs', count: logs.length }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'schedules' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Scheduled Emails</h2>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="sent">Sent</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recipient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Scheduled
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sent At
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSchedules.map((schedule) => (
                  <tr key={schedule.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {schedule.recipient_email}
                        </div>
                        <div className="text-sm text-gray-500">
                          {schedule.clients?.name || 'Unknown Client'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {schedule.email_subject}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(schedule.scheduled_at), 'MMM d, yyyy h:mm a')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(schedule.status)}`}>
                        {schedule.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {schedule.sent_at ? format(new Date(schedule.sent_at), 'MMM d, h:mm a') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredSchedules.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No scheduled emails found
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'campaigns' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Email Campaigns</h2>
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campaign Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Frequency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                      <div className="text-sm text-gray-500">{campaign.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{campaign.clients?.name || 'Unknown'}</div>
                      <div className="text-sm text-gray-500">{campaign.clients?.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {campaign.frequency_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        campaign.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {campaign.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(campaign.created_at), 'MMM d, yyyy')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {campaigns.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No campaigns found
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Delivery Logs</h2>
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Schedule ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Attempt
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Attempted At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Response
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {log.schedule_id.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      #{log.attempt_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(log.status)}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(log.attempted_at), 'MMM d, h:mm a')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {JSON.stringify(log.provider_response)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {logs.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No delivery logs found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
