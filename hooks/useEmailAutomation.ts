"use client"
import { useState, useEffect } from 'react'
import useSWR from 'swr'

// Types
export interface EmailCampaign {
  id: string
  client_id: string
  title: string
  content: string
  tone: 'professional' | 'friendly' | 'casual'
  instruction?: string
  created_at: string
  updated_at: string
  created_by: string
  template_used?: string
  ai_generated: boolean
  clients?: {
    id: string
    name: string
    email: string
  }
  email_schedules?: EmailSchedule[]
}

export interface EmailSchedule {
  id: string
  campaign_id: string
  client_id: string
  scheduled_at: string
  cadence_type: 'single' | 'weekly' | 'biweekly' | 'monthly' | 'every_other_month' | 'quarterly' | 'custom'
  cadence_data?: any
  subject: string
  content: string
  recipient_email: string
  status: 'pending' | 'queued' | 'sending' | 'sent' | 'failed' | 'cancelled'
  sent_at?: string
  delivery_attempts: number
  last_attempt_at?: string
  error_message?: string
  created_at: string
  updated_at: string
  created_by: string
}

// API client functions
const fetcher = (url: string) => fetch(url).then(res => res.json())

export function useEmailCampaigns(clientId?: string) {
  const url = clientId 
    ? `/api/email/campaigns?client_id=${clientId}`
    : '/api/email/campaigns'
  
  const { data, error, mutate } = useSWR(url, fetcher)
  
  return {
    campaigns: data?.campaigns || [],
    isLoading: !error && !data,
    isError: error,
    mutate
  }
}

export function useEmailSchedules(campaignId?: string, clientId?: string) {
  const params = new URLSearchParams()
  if (campaignId) params.append('campaign_id', campaignId)
  if (clientId) params.append('client_id', clientId)
  
  const url = `/api/email/schedules?${params.toString()}`
  const { data, error, mutate } = useSWR(url, fetcher)
  
  return {
    schedules: data?.schedules || [],
    isLoading: !error && !data,
    isError: error,
    mutate
  }
}

export function useEmailActions() {
  const [isCreating, setIsCreating] = useState(false)
  const [isScheduling, setIsScheduling] = useState(false)
  
  const createCampaign = async (campaignData: Partial<EmailCampaign>) => {
    setIsCreating(true)
    try {
      const response = await fetch('/api/email/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignData)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create campaign')
      }
      
      return await response.json()
    } finally {
      setIsCreating(false)
    }
  }
  
  const scheduleEmails = async (scheduleData: {
    campaign_id: string
    client_id: string
    scheduled_at: string
    cadence_type?: string
    cadence_data?: any
    subject?: string
    content?: string
    count?: number
  }) => {
    setIsScheduling(true)
    try {
      const response = await fetch('/api/email/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleData)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to schedule emails')
      }
      
      return await response.json()
    } finally {
      setIsScheduling(false)
    }
  }
  
  const updateSchedule = async (scheduleId: string, updates: Partial<EmailSchedule>) => {
    const response = await fetch(`/api/email/schedules/${scheduleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update schedule')
    }
    
    return await response.json()
  }
  
  const processEmails = async (dryRun = false) => {
    const response = await fetch(`/api/email/worker/process?dry_run=${dryRun}`, {
      method: 'POST',
      headers: { 'X-Cron-Secret': process.env.NEXT_PUBLIC_CRON_SECRET || 'dev-secret' }
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to process emails')
    }
    
    return await response.json()
  }
  
  return {
    createCampaign,
    scheduleEmails,
    updateSchedule,
    processEmails,
    isCreating,
    isScheduling
  }
}

// Helper function to integrate with existing cadence scheduler
export function formatCadenceForScheduling(cadenceDates: Date[], cadenceType: string) {
  if (!cadenceDates.length) return null
  
  const firstDate = cadenceDates[0]
  const count = cadenceDates.length
  
  return {
    scheduled_at: firstDate.toISOString(),
    cadence_type: cadenceType === 'single' ? 'single' : cadenceType,
    cadence_data: {
      count,
      dates: cadenceDates.map(d => d.toISOString())
    },
    count: cadenceType === 'single' ? 1 : count
  }
}

// Integration hook for the email modal
export function useEmailModalIntegration() {
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [emailContent, setEmailContent] = useState({
    subject: '',
    content: '',
    tone: 'professional' as const
  })
  const [schedulingData, setSchedulingData] = useState<any>(null)
  
  const { createCampaign, scheduleEmails, isCreating, isScheduling } = useEmailActions()
  
  const createAndScheduleEmail = async (cadenceDates: Date[], cadenceType: string) => {
    if (!selectedClient || !emailContent.content) {
      throw new Error('Missing required email data')
    }
    
    // Create campaign
    const campaignResult = await createCampaign({
      client_id: selectedClient,
      title: emailContent.subject || 'Follow-up Email',
      content: emailContent.content,
      tone: emailContent.tone,
      ai_generated: true
    })
    
    // Format scheduling data
    const scheduleData = formatCadenceForScheduling(cadenceDates, cadenceType)
    if (!scheduleData) {
      throw new Error('Invalid cadence configuration')
    }
    
    // Schedule emails
    const scheduleResult = await scheduleEmails({
      campaign_id: campaignResult.campaign.id,
      client_id: selectedClient,
      ...scheduleData,
      subject: emailContent.subject,
      content: emailContent.content
    })
    
    return {
      campaign: campaignResult.campaign,
      schedules: scheduleResult.schedules,
      message: scheduleResult.message
    }
  }
  
  return {
    selectedClient,
    setSelectedClient,
    emailContent,
    setEmailContent,
    schedulingData,
    setSchedulingData,
    createAndScheduleEmail,
    isProcessing: isCreating || isScheduling
  }
}
