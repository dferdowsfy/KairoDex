-- Email Automation Schema for Supabase
-- Run this in the Supabase SQL Editor

-- 1. Email Templates Table (Create first to avoid circular reference)
CREATE TABLE IF NOT EXISTS email_templates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    subject text NOT NULL,
    html_content text NOT NULL,
    text_content text,
    template_variables jsonb DEFAULT '{}',
    is_active boolean DEFAULT true,
    created_by uuid NOT NULL REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Email Campaigns Table
CREATE TABLE IF NOT EXISTS email_campaigns (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    template_id uuid REFERENCES email_templates(id),
    frequency_type text NOT NULL CHECK (frequency_type IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'custom')),
    frequency_interval integer DEFAULT 1,
    start_date timestamptz NOT NULL,
    end_date timestamptz,
    is_active boolean DEFAULT true,
    created_by uuid NOT NULL REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 3. Email Schedules Table
CREATE TABLE IF NOT EXISTS email_schedules (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id uuid NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
    client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    scheduled_at timestamptz NOT NULL,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    email_subject text NOT NULL,
    email_content text NOT NULL,
    recipient_email text NOT NULL,
    sent_at timestamptz,
    error_message text,
    created_by uuid NOT NULL REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 4. Email Delivery Log Table
CREATE TABLE IF NOT EXISTS email_delivery_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    schedule_id uuid NOT NULL REFERENCES email_schedules(id) ON DELETE CASCADE,
    attempt_number integer DEFAULT 1,
    status text NOT NULL CHECK (status IN ('success', 'failed', 'bounced', 'rejected')),
    provider_response jsonb,
    attempted_at timestamptz DEFAULT now(),
    delivery_time_ms integer
);

-- 5. Email Queue Table
CREATE TABLE IF NOT EXISTS email_queue (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    schedule_id uuid NOT NULL REFERENCES email_schedules(id) ON DELETE CASCADE,
    priority integer DEFAULT 5,
    retry_count integer DEFAULT 0,
    max_retries integer DEFAULT 3,
    next_retry_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_email_campaigns_client_id ON email_campaigns(client_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_by ON email_campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_at ON email_campaigns(created_at);

CREATE INDEX IF NOT EXISTS idx_email_schedules_client_id ON email_schedules(client_id);
CREATE INDEX IF NOT EXISTS idx_email_schedules_scheduled_at ON email_schedules(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_email_schedules_status ON email_schedules(status);
CREATE INDEX IF NOT EXISTS idx_email_schedules_created_by ON email_schedules(created_by);

CREATE INDEX IF NOT EXISTS idx_email_delivery_log_status ON email_delivery_log(status);
CREATE INDEX IF NOT EXISTS idx_email_delivery_log_attempted_at ON email_delivery_log(attempted_at);

CREATE INDEX IF NOT EXISTS idx_email_templates_is_active ON email_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_email_queue_next_retry_at ON email_queue (next_retry_at);
CREATE INDEX IF NOT EXISTS idx_email_queue_schedule_id ON email_queue (schedule_id);

-- Enable Row Level Security
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_delivery_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_campaigns
CREATE POLICY "Users can view their own email campaigns" ON email_campaigns
    FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can create email campaigns" ON email_campaigns
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own email campaigns" ON email_campaigns
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own email campaigns" ON email_campaigns
    FOR DELETE USING (created_by = auth.uid());

-- RLS Policies for email_schedules
CREATE POLICY "Users can view their own email schedules" ON email_schedules
    FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can create email schedules" ON email_schedules
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own email schedules" ON email_schedules
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own email schedules" ON email_schedules
    FOR DELETE USING (created_by = auth.uid());

-- RLS Policies for email_templates
CREATE POLICY "Users can view their own email templates" ON email_templates
    FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can create email templates" ON email_templates
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own email templates" ON email_templates
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own email templates" ON email_templates
    FOR DELETE USING (created_by = auth.uid());

-- Grant permissions
GRANT ALL ON email_campaigns TO authenticated;
GRANT ALL ON email_schedules TO authenticated;
GRANT SELECT ON email_delivery_log TO authenticated;
GRANT ALL ON email_templates TO authenticated;
GRANT SELECT ON email_queue TO authenticated;
