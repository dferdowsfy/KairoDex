-- Archive legacy tables if they exist
DO $$ BEGIN
  IF to_regclass('public.email_campaigns') IS NOT NULL THEN
    RAISE NOTICE 'email_campaigns left intact (business data)';
  END IF;
  -- Example of renaming old tables if needed
  IF to_regclass('public.email_queue') IS NOT NULL AND to_regclass('public.email_queue_legacy') IS NULL THEN
    ALTER TABLE email_queue RENAME TO email_queue_legacy;
  END IF;
END $$;
