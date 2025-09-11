-- Create senders table to store From addresses and OAuth tokens
create table if not exists public.senders (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid not null references auth.users(id),
  email text not null,
  method text not null check (method in ('resend','oauth_google','oauth_office','smtp')) default 'resend',
  verified boolean default false,
  meta jsonb default '{}'::jsonb,
  oauth_refresh_token text,
  verification_token text,
  verification_sent_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create unique index if not exists senders_owner_email_idx on public.senders(owner_id, lower(email));
