-- Adds per-schedule sender context columns
ALTER TABLE email_schedules
  ADD COLUMN IF NOT EXISTS from_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS from_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS reply_to VARCHAR(255);

COMMENT ON COLUMN email_schedules.from_email IS 'Original requested From email (may be unverified external, used for display or reply-to logic)';
COMMENT ON COLUMN email_schedules.from_name IS 'Display name of sender at time of scheduling';
COMMENT ON COLUMN email_schedules.reply_to IS 'Explicit Reply-To address to direct responses to user mailbox.';