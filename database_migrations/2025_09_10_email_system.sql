-- New streamlined email system tables
create extension if not exists pgcrypto;

create table if not exists email_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  title text not null,
  subject text not null,
  body_md text not null,
  created_at timestamptz default now()
);

create table if not exists emails (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  client_id uuid not null,
  to_emails text[] not null,
  subject text not null,
  body_md text not null,
  body_html text not null,
  status text check (status in ('draft','queued','sent','failed')) default 'draft',
  sent_at timestamptz,
  created_at timestamptz default now(),
  error_text text
);

create table if not exists email_jobs (
  id uuid primary key default gen_random_uuid(),
  email_id uuid not null references emails(id) on delete cascade,
  send_at timestamptz not null,
  attempts int default 0,
  last_attempt_at timestamptz,
  locked_by text,
  locked_at timestamptz,
  created_at timestamptz default now(),
  constraint send_at_future check (send_at > now() - interval '1 minute')
);

create index if not exists email_jobs_send_at_idx on email_jobs (send_at);

-- Ensure required owner_id columns exist even if legacy tables pre-existed without them
DO $$
DECLARE
  col_exists boolean;
  has_created_by boolean;
  has_user_id boolean;
BEGIN
  -- email_templates.owner_id
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='email_templates' AND column_name='owner_id'
  ) INTO col_exists;
  IF NOT col_exists AND to_regclass('public.email_templates') IS NOT NULL THEN
    ALTER TABLE email_templates ADD COLUMN owner_id uuid;
    -- Try to backfill from created_by if present
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema='public' AND table_name='email_templates' AND column_name='created_by'
    ) INTO has_created_by;
    IF has_created_by THEN
      EXECUTE 'UPDATE email_templates SET owner_id = created_by WHERE owner_id IS NULL';
    END IF;
  END IF;

  -- emails.owner_id
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='emails' AND column_name='owner_id'
  ) INTO col_exists;
  IF NOT col_exists AND to_regclass('public.emails') IS NOT NULL THEN
    ALTER TABLE emails ADD COLUMN owner_id uuid;
    -- Possible legacy columns to map from
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema='public' AND table_name='emails' AND column_name='created_by'
    ) INTO has_created_by;
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema='public' AND table_name='emails' AND column_name='user_id'
    ) INTO has_user_id;
    IF has_created_by THEN
      EXECUTE 'UPDATE emails SET owner_id = created_by WHERE owner_id IS NULL';
    ELSIF has_user_id THEN
      EXECUTE 'UPDATE emails SET owner_id = user_id WHERE owner_id IS NULL';
    END IF;
  END IF;

  -- Only enforce NOT NULL if all rows have value to avoid migration failure
  BEGIN
    IF to_regclass('public.email_templates') IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM email_templates WHERE owner_id IS NULL) THEN
        ALTER TABLE email_templates ALTER COLUMN owner_id SET NOT NULL;
      END IF;
    END IF;
  EXCEPTION WHEN undefined_column THEN NULL; END;

  BEGIN
    IF to_regclass('public.emails') IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM emails WHERE owner_id IS NULL) THEN
        ALTER TABLE emails ALTER COLUMN owner_id SET NOT NULL;
      END IF;
    END IF;
  EXCEPTION WHEN undefined_column THEN NULL; END;
END $$;

alter table email_templates enable row level security;
alter table emails enable row level security;
alter table email_jobs enable row level security;

-- Drop existing conflicting policies (if any)
DO $$
DECLARE r record; BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname='public' AND tablename in ('email_templates','emails','email_jobs') LOOP
    EXECUTE format('drop policy if exists %I on %I', r.policyname, r.tablename);
  END LOOP; END $$;

create policy own_templates on email_templates for all using (owner_id = auth.uid());
create policy own_emails on emails for all using (owner_id = auth.uid());
create policy no_direct_jobs on email_jobs for select using (false);
