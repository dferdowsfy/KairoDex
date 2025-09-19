"use client"
import { useState } from 'react'
import useSWR from 'swr'
import { format } from 'date-fns'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface EmailRecord {
  id: string
  job_id?: string
  type: 'sent' | 'scheduled'
  recipient_email: string
  subject: string
  status: 'sent' | 'scheduled' | 'failed' | 'cancelled'
  scheduled_at: string
  sent_at?: string
  created_at: string
  client_name: string
  sender_email: string
  sender_method: string
  campaign_title?: string
}

interface EmailsResponse {
  emails: EmailRecord[]
  stats: {
    total: number
    sent: number
    scheduled: number
    failed: number
  }
  total: number
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
  const [activeTab, setActiveTab] = useState<'emails' | 'campaigns' | 'logs'>('emails')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  
  // Fetch unified emails data
  const { data: emailsData, error: emailsError, mutate: refetchEmails } = useSWR(
    `/api/emails?status=${statusFilter}`, 
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

  const emailsResponse: EmailsResponse = emailsData || { emails: [], stats: { total: 0, sent: 0, scheduled: 0, failed: 0 }, total: 0 }
  const emails: EmailRecord[] = emailsResponse.emails || []
  const stats = emailsResponse.stats || { total: 0, sent: 0, scheduled: 0, failed: 0 }
  const campaigns: EmailCampaign[] = campaignsData?.campaigns || []
  const logs: EmailDeliveryLog[] = logsData?.logs || []

  // Filter emails by status (done on server side now, but keeping for client-side changes)
  const filteredEmails = emails.filter(email => 
    statusFilter === 'all' || email.status === statusFilter
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
        refetchEmails() // Refresh the data
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
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-blue-100 text-blue-800'
    }
  }

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
          <button
            onClick={() => setStatusFilter('all')}
            className={`bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left ${
              statusFilter === 'all' ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Emails</div>
          </button>
          <button
            onClick={() => setStatusFilter('sent')}
            className={`bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left ${
              statusFilter === 'sent' ? 'ring-2 ring-green-500' : ''
            }`}
          >
            <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
            <div className="text-sm text-gray-600">Sent</div>
          </button>
          <button
            onClick={() => setStatusFilter('scheduled')}
            className={`bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left ${
              statusFilter === 'scheduled' ? 'ring-2 ring-yellow-500' : ''
            }`}
          >
            <div className="text-2xl font-bold text-yellow-600">{stats.scheduled}</div>
            <div className="text-sm text-gray-600">Scheduled</div>
          </button>
          <button
            onClick={() => setStatusFilter('failed')}
            className={`bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left ${
              statusFilter === 'failed' ? 'ring-2 ring-red-500' : ''
            }`}
          >
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <div className="text-sm text-gray-600">Failed</div>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'emails', label: 'All Emails', count: emails.length },
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
      {activeTab === 'emails' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">All Emails</h2>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="all">All Status</option>
              <option value="sent">Sent</option>
              <option value="scheduled">Scheduled</option>
              <option value="failed">Failed</option>
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
                    Scheduled/Sent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sender</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEmails.map((email) => (
                  <tr key={email.id} className="hover:bg-gray-50 group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {email.recipient_email}
                        </div>
                        <div className="text-sm text-gray-500">
                          {email.client_name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {email.subject}
                      </div>
                      {email.campaign_title && (
                        <div className="text-xs text-gray-500">
                          Campaign: {email.campaign_title}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(email.scheduled_at), 'MMM d, yyyy h:mm a')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(email.status)}`}>
                        {email.status}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">
                        {email.type === 'sent' ? 'Immediate' : 'Scheduled'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="text-sm text-gray-900">{email.sender_email}</div>
                      <div className="text-xs text-gray-500">
                        {email.sender_method === 'oauth_google' ? 'Gmail' : email.sender_method}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      {email.status === 'scheduled' && email.job_id && (
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                          <button
                            onClick={async () => {
                              if (!email.job_id) return
                              if (!confirm('Send this scheduled email now?')) return
                              const res = await fetch(`/api/email/jobs/${email.job_id}/send-now`, { method: 'POST' })
                              const js = await res.json()
                              if (!res.ok) {
                                alert(js?.error || 'Failed to send now')
                              }
                              refetchEmails()
                            }}
                            className="px-2 py-1 text-xs rounded bg-emerald-600 text-white hover:bg-emerald-700"
                          >Send Now</button>
                          <button
                            onClick={async () => {
                              if (!email.job_id) return
                              if (!confirm('Delete this scheduled email?')) return
                              const res = await fetch(`/api/email/jobs/${email.job_id}`, { method: 'DELETE' })
                              const js = await res.json()
                              if (!res.ok) {
                                alert(js?.error || 'Failed to delete')
                              }
                              refetchEmails()
                            }}
                            className="px-2 py-1 text-xs rounded bg-rose-600 text-white hover:bg-rose-700"
                          >Delete</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredEmails.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No emails found
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
