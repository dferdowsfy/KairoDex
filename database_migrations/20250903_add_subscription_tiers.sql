-- Add subscription tier to AgentHub_DB table with Stripe integration
BEGIN;

-- Create subscription_tier enum
DO $$ BEGIN
    CREATE TYPE subscription_tier AS ENUM ('free', 'professional', 'enterprise');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add subscription_tier column to AgentHub_DB table
ALTER TABLE "AgentHub_DB" 
ADD COLUMN IF NOT EXISTS subscription_tier subscription_tier NOT NULL DEFAULT 'free';

-- Add subscription metadata columns to AgentHub_DB
ALTER TABLE "AgentHub_DB" 
ADD COLUMN IF NOT EXISTS subscription_start_date timestamptz,
ADD COLUMN IF NOT EXISTS subscription_end_date timestamptz,
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'expired', 'trial', 'pending')),
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
ADD COLUMN IF NOT EXISTS stripe_price_id text,
ADD COLUMN IF NOT EXISTS billing_cycle text CHECK (billing_cycle IN ('monthly', 'yearly')) DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS trial_end_date timestamptz,
ADD COLUMN IF NOT EXISTS payment_method_id text,
ADD COLUMN IF NOT EXISTS last_payment_date timestamptz,
ADD COLUMN IF NOT EXISTS next_billing_date timestamptz;

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS agenthub_db_subscription_tier_idx ON "AgentHub_DB"(subscription_tier);
CREATE INDEX IF NOT EXISTS agenthub_db_subscription_status_idx ON "AgentHub_DB"(subscription_status);
CREATE INDEX IF NOT EXISTS agenthub_db_agent_owner_subscription_idx ON "AgentHub_DB"(agent_owner_user_id, subscription_tier);
CREATE INDEX IF NOT EXISTS agenthub_db_stripe_customer_idx ON "AgentHub_DB"(stripe_customer_id);
CREATE INDEX IF NOT EXISTS agenthub_db_billing_cycle_idx ON "AgentHub_DB"(billing_cycle);

-- Add comments for documentation
COMMENT ON COLUMN "AgentHub_DB".subscription_tier IS 'Subscription tier for the agent who owns this client: free, professional, or enterprise';
COMMENT ON COLUMN "AgentHub_DB".subscription_start_date IS 'When the agent''s current subscription started';
COMMENT ON COLUMN "AgentHub_DB".subscription_end_date IS 'When the agent''s current subscription expires (null for lifetime/free)';
COMMENT ON COLUMN "AgentHub_DB".subscription_status IS 'Status of the agent''s subscription: active, cancelled, expired, trial, or pending';
COMMENT ON COLUMN "AgentHub_DB".stripe_customer_id IS 'Stripe customer ID for payment processing';
COMMENT ON COLUMN "AgentHub_DB".stripe_subscription_id IS 'Stripe subscription ID for recurring billing';
COMMENT ON COLUMN "AgentHub_DB".stripe_price_id IS 'Stripe price ID for the current plan';
COMMENT ON COLUMN "AgentHub_DB".billing_cycle IS 'Billing frequency: monthly or yearly';
COMMENT ON COLUMN "AgentHub_DB".trial_end_date IS 'When the trial period ends (if applicable)';
COMMENT ON COLUMN "AgentHub_DB".payment_method_id IS 'Stripe payment method ID';
COMMENT ON COLUMN "AgentHub_DB".last_payment_date IS 'Date of last successful payment';
COMMENT ON COLUMN "AgentHub_DB".next_billing_date IS 'Date of next billing cycle';

-- Update existing records to have default subscription tier based on agent
-- This sets all existing clients to 'free' tier initially
UPDATE "AgentHub_DB" 
SET subscription_tier = 'free', 
    subscription_status = 'active',
    subscription_start_date = NOW()
WHERE subscription_tier IS NULL;

COMMIT;
