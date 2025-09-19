#!/usr/bin/env node

/**
 * Test and create feedback table
 */

require('dotenv').config({ path: '.env.local' })

async function checkAndCreateFeedbackTable() {
  const { createClient } = require('@supabase/supabase-js')
  
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables')
    process.exit(1)
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  try {
    console.log('🔍 Checking if feedback table exists...')
    
    // Test if feedback table exists
    const { data, error } = await supabase
      .from('feedback')
      .select('id')
      .limit(1)
    
    if (error) {
      if (error.message.includes('does not exist') || error.code === '42P01') {
        console.log('❌ Feedback table does not exist')
        console.log('📋 Please create it by running this SQL in your Supabase SQL Editor:')
        console.log('\n' + '='.repeat(60))
        
        const sql = `-- Create feedback table
CREATE TABLE public.feedback (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    user_email text NOT NULL,
    rating integer CHECK (rating >= 1 AND rating <= 10),
    liked text[] DEFAULT '{}',
    disliked text[] DEFAULT '{}',
    message text,
    feedback_id text NOT NULL UNIQUE,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    email_sent_at timestamp with time zone,
    email_error text,
    user_agent text,
    ip_address inet,
    source text DEFAULT 'feedback_widget'
);

-- Enable RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own feedback" ON public.feedback
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feedback" ON public.feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own feedback" ON public.feedback
    FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX feedback_user_id_idx ON public.feedback(user_id);
CREATE INDEX feedback_created_at_idx ON public.feedback(created_at);
CREATE INDEX feedback_status_idx ON public.feedback(status);

-- Grant permissions
GRANT ALL ON public.feedback TO authenticated;`
        
        console.log(sql)
        console.log('='.repeat(60))
        console.log('\n📍 Go to: https://supabase.com/dashboard/project/' + supabaseUrl.split('//')[1].split('.')[0] + '/sql')
        console.log('💡 After creating the table, run this script again to test it')
        
      } else {
        console.log('❌ Database error:', error.message)
      }
    } else {
      console.log('✅ Feedback table exists and is accessible!')
      console.log('📊 Current feedback count:', data?.length || 0)
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err.message)
  }
}

checkAndCreateFeedbackTable()