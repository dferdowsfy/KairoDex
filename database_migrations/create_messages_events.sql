-- Create messages and events tables used by Follow Up and activity logging
-- Run this in your Supabase SQL Editor

-- Messages table stores outbound/inbound communications
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  agent_id UUID,
  direction TEXT NOT NULL CHECK (direction IN ('in','out')),
  channel TEXT NOT NULL CHECK (channel IN ('email','sms','call','note')),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Events table stores a unified activity feed
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  agent_id UUID,
  type TEXT NOT NULL,
  ref_id UUID,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_messages_client ON public.messages(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_channel ON public.messages(channel);
CREATE INDEX IF NOT EXISTS idx_events_client ON public.events(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_type ON public.events(type);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Development policies (permissive). Harden for production later.
DROP POLICY IF EXISTS "messages_dev_all" ON public.messages;
CREATE POLICY "messages_dev_all" ON public.messages FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "events_dev_all" ON public.events;
CREATE POLICY "events_dev_all" ON public.events FOR ALL USING (true) WITH CHECK (true);

-- Verification queries
-- SELECT * FROM public.messages ORDER BY created_at DESC LIMIT 5;
-- SELECT * FROM public.events ORDER BY created_at DESC LIMIT 5;
