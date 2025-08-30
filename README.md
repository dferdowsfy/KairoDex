# NestAI (PWA)

Mobile‑first AI‑native real estate CRM built with Next.js App Router, Tailwind, Supabase, TanStack Query, Zustand, and next‑pwa.

## Features
 - Live city market snapshots in Chat (when OPENROUTER_API_KEY is set) with sources
- Notes → Tiles: paste unstructured notes and get editable tiles for key dates, next steps, contacts, docs, risks. Inline edit and persist to Supabase.
- Follow-Up composer prefills from NoteItems, with include/exclude checkboxes and email scheduling.
1. Copy env and set values:

```
cp .env.local.example .env.local
```

Set:
- NEXT_PUBLIC_SUPABASE_URL=
- NEXT_PUBLIC_SUPABASE_ANON_KEY=
- OPENROUTER_API_KEY=
 - Optional: AI provider keys in `lib/ai.ts` (OPENAI_API_KEY or GEMINI_API_KEY)
 - Optional: MARKET_CACHE_TTL_MS (default 6h), MARKET_OPENROUTER_MODEL (default perplexity/sonar-reasoning-pro)

2. Dev server:

```
npm run dev
## Security and Auth

- Password policy (enforced server + client):
  - Min length 12; must include upper, lower, digit, and symbol.
  - Reject common and breached passwords (HaveIBeenPwned k-anonymity API; set HIBP_CHECK=off to skip network calls).
  - Blocks trivial variants of email/name and repeating/sequence patterns.
- Rate limiting: signup/login/reset are limited by IP+device fingerprint.
- Password reset: POST /api/auth/reset/request then follow email link to /reset-password.
- Session cookies: HttpOnly, Secure, SameSite=Strict. Idle timeout and absolute lifetime configurable via SESSION_IDLE_MIN and SESSION_ABS_HOURS.
- MFA endpoints are scaffolded under /api/auth/mfa (501 until wired to a TOTP provider).
This starts Next.js on the next available port (3000/3001).

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
 - If live market answers look generic, ensure OPENROUTER_API_KEY is present; the chatbot uses Perplexity via OpenRouter to fetch current city trends and returns citations.
- For iOS standalone PWA safe‑area spacing, keep the bottom nav enabled.

## Notes
- Replace logo.svg with your brand asset later.
- This is a functional scaffold; expand RLS, enums, and migrations as needed.
