-- Create feedback table for storing user feedback submissions
-- This provides a dedicated table for feedback data separate from emails

CREATE TABLE IF NOT EXISTS public.feedback (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- User information
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    user_email text NOT NULL,
    
    -- Feedback content
    rating integer CHECK (rating >= 1 AND rating <= 10),
    liked text[] DEFAULT '{}',
    disliked text[] DEFAULT '{}',
    message text,
    
    -- System tracking
    feedback_id text NOT NULL UNIQUE, -- UUID for tracking
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    email_sent_at timestamp with time zone,
    email_error text,
    
    -- Additional metadata
    user_agent text,
    ip_address inet,
    source text DEFAULT 'feedback_widget'
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_feedback_updated_at 
    BEFORE UPDATE ON public.feedback 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Users can only see their own feedback
CREATE POLICY "Users can view own feedback" ON public.feedback
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback" ON public.feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own feedback (for status updates)
CREATE POLICY "Users can update own feedback" ON public.feedback
    FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS feedback_user_id_idx ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS feedback_created_at_idx ON public.feedback(created_at);
CREATE INDEX IF NOT EXISTS feedback_status_idx ON public.feedback(status);
CREATE INDEX IF NOT EXISTS feedback_feedback_id_idx ON public.feedback(feedback_id);

-- Grant permissions
GRANT ALL ON public.feedback TO authenticated;
GRANT SELECT ON public.feedback TO anon;

COMMENT ON TABLE public.feedback IS 'User feedback submissions with email delivery tracking';
COMMENT ON COLUMN public.feedback.rating IS 'User rating from 1-10';
COMMENT ON COLUMN public.feedback.liked IS 'Array of things user liked';
COMMENT ON COLUMN public.feedback.disliked IS 'Array of things user disliked';
COMMENT ON COLUMN public.feedback.message IS 'Free-form feedback message';
COMMENT ON COLUMN public.feedback.feedback_id IS 'Unique identifier for tracking purposes';
COMMENT ON COLUMN public.feedback.status IS 'Email delivery status: pending, sent, failed';