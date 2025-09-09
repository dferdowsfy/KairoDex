-- Email Automation System Database Schema
-- This script creates the necessary tables for scheduled email automation

-- 1. Email Campaigns table
-- Stores email campaign definitions with content and settings
CREATE TABLE IF NOT EXISTS email_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    tone VARCHAR(50) DEFAULT 'professional' CHECK (tone IN ('professional', 'friendly', 'casual')),
    instruction TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Metadata
    template_used TEXT,
    ai_generated BOOLEAN DEFAULT true
);

-- Create indexes for email_campaigns
CREATE INDEX IF NOT EXISTS idx_email_campaigns_client_id ON email_campaigns(client_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_by ON email_campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_at ON email_campaigns(created_at);

-- 2. Email Schedules table  
-- Stores individual scheduled email instances
CREATE TABLE IF NOT EXISTS email_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    
    -- Scheduling details
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    cadence_type VARCHAR(50) CHECK (cadence_type IN ('single', 'weekly', 'biweekly', 'monthly', 'every_other_month', 'quarterly', 'custom')),
    cadence_data JSONB, -- Stores cadence configuration (count, weekday, etc.)
    
    -- Email content (can override campaign defaults)
    subject VARCHAR(500),
    content TEXT,
    recipient_email VARCHAR(255),
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'sending', 'sent', 'failed', 'cancelled')),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivery_attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for email_schedules
CREATE INDEX IF NOT EXISTS idx_email_schedules_campaign_id ON email_schedules(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_schedules_client_id ON email_schedules(client_id);
CREATE INDEX IF NOT EXISTS idx_email_schedules_scheduled_at ON email_schedules(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_email_schedules_status ON email_schedules(status);
CREATE INDEX IF NOT EXISTS idx_email_schedules_created_by ON email_schedules(created_by);

-- 3. Email Delivery Log table
-- Detailed logging of email delivery attempts and results
CREATE TABLE IF NOT EXISTS email_delivery_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID REFERENCES email_schedules(id) ON DELETE CASCADE,
    
    -- Delivery details
    attempt_number INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('queued', 'sending', 'sent', 'bounced', 'failed', 'rejected')),
    provider VARCHAR(100), -- e.g., 'sendgrid', 'ses', 'smtp'
    provider_message_id VARCHAR(255),
    provider_response JSONB,
    
    -- Timestamps
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    
    -- Error details
    error_code VARCHAR(100),
    error_message TEXT,
    
    -- Tracking
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    unsubscribed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for email_delivery_log
CREATE INDEX IF NOT EXISTS idx_email_delivery_log_schedule_id ON email_delivery_log(schedule_id);
CREATE INDEX IF NOT EXISTS idx_email_delivery_log_status ON email_delivery_log(status);
CREATE INDEX IF NOT EXISTS idx_email_delivery_log_attempted_at ON email_delivery_log(attempted_at);

-- 4. Email Templates table
-- Reusable email templates for common scenarios
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- e.g., 'follow_up', 'check_in', 'milestone'
    
    -- Template content
    subject_template TEXT NOT NULL,
    content_template TEXT NOT NULL,
    variables JSONB, -- Available template variables
    
    -- Settings
    default_tone VARCHAR(50) DEFAULT 'professional',
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for email_templates
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_templates_is_active ON email_templates(is_active);

-- 5. Email Queue table
-- Processing queue for email delivery
CREATE TABLE IF NOT EXISTS email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID REFERENCES email_schedules(id) ON DELETE CASCADE,
    
    -- Queue processing
    priority INTEGER DEFAULT 5, -- 1-10, higher = more priority
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for email_queue for better performance
CREATE INDEX IF NOT EXISTS idx_email_queue_status_priority ON email_queue (status, priority DESC);
CREATE INDEX IF NOT EXISTS idx_email_queue_next_retry_at ON email_queue (next_retry_at);
CREATE INDEX IF NOT EXISTS idx_email_queue_schedule_id ON email_queue (schedule_id);

-- 6. Update triggers for timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_email_campaigns_updated_at BEFORE UPDATE ON email_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_schedules_updated_at BEFORE UPDATE ON email_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_delivery_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Policies for email_campaigns
CREATE POLICY "Users can view their own email campaigns" ON email_campaigns
    FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can create email campaigns" ON email_campaigns
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own email campaigns" ON email_campaigns
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own email campaigns" ON email_campaigns
    FOR DELETE USING (created_by = auth.uid());

-- Policies for email_schedules  
CREATE POLICY "Users can view their own email schedules" ON email_schedules
    FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can create email schedules" ON email_schedules
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own email schedules" ON email_schedules
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own email schedules" ON email_schedules
    FOR DELETE USING (created_by = auth.uid());

-- Policies for email_delivery_log (read-only for users)
CREATE POLICY "Users can view delivery logs for their schedules" ON email_delivery_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM email_schedules 
            WHERE email_schedules.id = email_delivery_log.schedule_id 
            AND email_schedules.created_by = auth.uid()
        )
    );

-- Policies for email_templates
CREATE POLICY "Users can view active email templates" ON email_templates
    FOR SELECT USING (is_active = true OR created_by = auth.uid());

CREATE POLICY "Users can create email templates" ON email_templates
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own email templates" ON email_templates
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own email templates" ON email_templates
    FOR DELETE USING (created_by = auth.uid());

-- Policies for email_queue (system access only in production)
CREATE POLICY "Users can view queue status for their schedules" ON email_queue
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM email_schedules 
            WHERE email_schedules.id = email_queue.schedule_id 
            AND email_schedules.created_by = auth.uid()
        )
    );

-- 8. Sample email templates
INSERT INTO email_templates (name, description, category, subject_template, content_template, variables, default_tone) VALUES
('Follow-up Email', 'General follow-up email for client communication', 'follow_up', 
'Following up on {{client_name}}', 
'Hi {{client_name}},

I wanted to follow up on our recent conversation regarding {{project_context}}.

{{custom_message}}

Please let me know if you have any questions or if there''s anything else I can help you with.

Best regards,
{{agent_name}}', 
'{"client_name": "Client name", "project_context": "Project or transaction context", "custom_message": "Personalized message", "agent_name": "Agent name"}',
'professional'),

('Check-in Email', 'Regular check-in with client for project updates', 'check_in',
'Quick check-in - {{client_name}}',
'Hi {{client_name}},

I hope you''re doing well! I wanted to check in on {{project_context}} and see how things are progressing on your end.

{{custom_message}}

Looking forward to hearing from you.

Best,
{{agent_name}}',
'{"client_name": "Client name", "project_context": "Project context", "custom_message": "Specific questions or updates", "agent_name": "Agent name"}',
'friendly'),

('Milestone Update', 'Update client on important milestones or deadlines', 'milestone',
'Important Update - {{milestone_name}}',
'Hi {{client_name}},

I wanted to update you on an important milestone: {{milestone_name}}.

{{milestone_details}}

{{next_steps}}

Please don''t hesitate to reach out if you have any questions.

Best regards,
{{agent_name}}',
'{"client_name": "Client name", "milestone_name": "Milestone title", "milestone_details": "Details about the milestone", "next_steps": "What happens next", "agent_name": "Agent name"}',
'professional');

-- Grant necessary permissions
GRANT ALL ON email_campaigns TO authenticated;
GRANT ALL ON email_schedules TO authenticated;
GRANT SELECT ON email_delivery_log TO authenticated;
GRANT ALL ON email_templates TO authenticated;
GRANT SELECT ON email_queue TO authenticated;

-- Comments for documentation
COMMENT ON TABLE email_campaigns IS 'Stores email campaign definitions with content and settings';
COMMENT ON TABLE email_schedules IS 'Individual scheduled email instances with delivery timing';
COMMENT ON TABLE email_delivery_log IS 'Detailed logging of email delivery attempts and results';
COMMENT ON TABLE email_templates IS 'Reusable email templates for common scenarios';
COMMENT ON TABLE email_queue IS 'Processing queue for email delivery with retry logic';
