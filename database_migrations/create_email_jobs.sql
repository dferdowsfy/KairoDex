-- Email scheduling table
create table if not exists public.email_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  client_id text not null,
  to_recipients text[] not null,
  cc_recipients text[],
  subject text not null,
  body_html text,
  body_text text,
  noteitem_ids uuid[],
  send_at timestamptz not null,
  status text not null check (status in ('scheduled','sent','failed')) default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  error text
);

alter table public.email_jobs enable row level security;

do $$ begin
  create policy "select_own_jobs" on public.email_jobs for select using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "insert_own_jobs" on public.email_jobs for insert with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "update_own_jobs" on public.email_jobs for update using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end; $$ language plpgsql;

do $$ begin
  create trigger trg_email_jobs_updated
  before update on public.email_jobs
  for each row execute function public.set_updated_at();
exception when others then null; end $$;
