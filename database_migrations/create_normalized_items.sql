-- Create normalized_items table for NoteItem shape
create table if not exists public.normalized_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  client_id text not null,
  kind text not null check (kind in ('next_step','deadline','contact','property','financing','inspection','appraisal','emd','document','risk','general_note','email')),
  title text not null,
  body text,
  party text check (party in ('buyer','listing_agent','lender','title','coordinator','inspector','appraiser','client','other')),
  status text check (status in ('todo','scheduled','done','blocked')),
  date timestamptz,
  amount numeric,
  tags text[],
  source text not null check (source in ('user_note','scraper','import','ai_parse')),
  extra jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.normalized_items enable row level security;

-- RLS Policies
do $$ begin
  create policy "select_own_items" on public.normalized_items
    for select using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "insert_own_items" on public.normalized_items
    for insert with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "update_own_items" on public.normalized_items
    for update using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "delete_own_items" on public.normalized_items
    for delete using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

-- Updated at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end; $$ language plpgsql;

do $$ begin
  create trigger trg_normalized_items_updated
  before update on public.normalized_items
  for each row execute function public.set_updated_at();
exception when others then null; end $$;
