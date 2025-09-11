-- Adds cadence column to emails table for recurring scheduling
-- Allowed values: none, biweekly, monthly
alter table if exists public.emails
  add column if not exists cadence text check (cadence in ('none','biweekly','monthly')) default 'none';

-- Backfill any nulls to 'none'
update public.emails set cadence = 'none' where cadence is null;