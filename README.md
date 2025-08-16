# NestAI (PWA)

Mobile‑first AI‑native real estate CRM built with Next.js App Router, Tailwind, Supabase, TanStack Query, Zustand, and next‑pwa.

## Features
- Mobile‑first UI with fixed bottom navigation and safe‑area handling
- Theme presets plus full custom color editor (Profile page)
- Tasks with iOS‑style wheel date/time picker and reminder text
- Dashboard with Latest Notes (full width) and side‑by‑side Email Generator + Contracts
- Right‑side chat drawer with slide animations and dark theme bubbles
- Mock/live data toggle (Supabase or in‑memory mocks)
- PWA with offline caching and background sync for API

## Getting started

1. Copy env and set values:

```
cp .env.local.example .env.local
```

Set:
- NEXT_PUBLIC_SUPABASE_URL=
- NEXT_PUBLIC_SUPABASE_ANON_KEY=
- OPENROUTER_API_KEY=

2. Dev server:

```
npm run dev
This starts Next.js on the next available port (3000/3001).

3. Typecheck, build, and test:

```
npm run typecheck
npm run build
npm run test
```

## Run via VS Code Tasks

Use the provided tasks (Terminal > Run Task...):
- Dev Server (background)
- Build
- Test
```

## PWA
- next-pwa configured with Workbox runtime cache and background sync for /api.
- `public/manifest.json` is set. Use the Install hint or browser menu to install.
 - In development, PWA is disabled; build for production to enable service worker.

## Supabase schema (seed)

Run in Supabase SQL editor:

```sql
-- minimal tables for demo
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid,
  name text not null,
  email text,
  phone text,
  stage text not null default 'new',
  preferences jsonb,
  created_at timestamptz default now()
);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  agent_id uuid,
  body text not null,
  created_at timestamptz default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete set null,
  agent_id uuid,
  title text not null,
  due_at timestamptz,
  status text not null default 'open',
  created_at timestamptz default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  agent_id uuid,
  type text not null,
  ref_id uuid,
  meta jsonb,
  created_at timestamptz default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  agent_id uuid,
  title text not null,
  status text not null default 'draft',
  content text,
  created_at timestamptz default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  agent_id uuid,
  direction text not null,
  channel text not null,
  body text not null,
  created_at timestamptz default now()
);
```

RLS example (adjust for your auth):

```sql
alter table clients enable row level security;
create policy "agent can read own" on clients for select using (auth.uid() = agent_id);
-- Repeat for other tables.
```

## Tests

```
npm run test
```

## Tech stack
- Next.js 14 App Router (TypeScript)
- Tailwind CSS + CSS variables theming
- Supabase (optional) + mock DB
- TanStack Query v5 with persistence
- Zustand for UI + theme state
- Framer Motion for animations
- next‑pwa for offline support

## Troubleshooting
- If images don’t appear, ensure `public/img/` exists with `avatar.svg` and `property.svg`.
- If Supabase isn’t configured, the app falls back to mock data.
- For iOS standalone PWA safe‑area spacing, keep the bottom nav enabled.

## Notes
- Replace logo.svg with your brand asset later.
- This is a functional scaffold; expand RLS, enums, and migrations as needed.
