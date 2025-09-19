# kairodex (PWA)

Mobile‑first AI‑native real estate CRM built with Next.js App Router, Tailwind, Supabase, TanStack Query, Zustand, and next‑pwa.

## Features
 - Live city market snapshots in Chat (when OPENROUTER_API_KEY is set) with sources
- Notes → Tiles: paste unstructured notes and get editable tiles for key dates, next steps, contacts, docs, risks. Inline edit and persist to Supabase.
- Follow-Up composer prefills from NoteItems, with include/exclude checkboxes and email scheduling.
 - Global Feedback widget (bottom-right) lets authenticated users send structured feedback (liked, disliked, rating, free text) via Resend to the owner email.
1. Copy env and set values:

```
cp .env.local.example .env.local
```

Set:
- NEXT_PUBLIC_SUPABASE_URL=
- NEXT_PUBLIC_SUPABASE_ANON_KEY=
 - NEXT_PUBLIC_SITE_URL= (root deployed origin, e.g. https://kairodex.com)
 - NEXT_PUBLIC_AUTH_BROWSER_ORIGIN= (origin to force auth email links to open in normal browser; dev fallback http://localhost:3000, prod fallback https://www.kairodex.com)
- OPENROUTER_API_KEY=
 - RESEND_API_KEY= (required for feedback emails; create at https://resend.com and scope to sending domain)
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
This starts Next.js on port 3002 (configured) or the next available if 3002 is busy.

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

## Netlify troubleshooting (short)

If you deploy to Netlify and hit build problems, try these quick steps in order:

- Clear the build cache and re-deploy: Site → Deploys → Trigger deploy → Clear cache and deploy site. This often fixes stale artifact or dependency issues.
- Check plugin conflicts: ensure only the official `@netlify/plugin-nextjs` is enabled for this site (netlify.toml already references it). Temporarily disable other Netlify plugins and re-run to isolate conflicts.
- Verify required environment variables are set in Site settings → Build & deploy → Environment. Missing server-side secrets (for example SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, JWT_SECRET) commonly cause build-time or runtime failures.
- Match Node version: Netlify should use Node 20.x for this project. `netlify.toml` sets NODE_VERSION=20; double-check Site environment or the Netlify UI runtime settings if builds report incompatible Node versions.
- If the build fails with memory errors, try building locally with increased memory: set `NODE_OPTIONS=--max_old_space_size=4096` and run `npm run build` to confirm.

If these steps don't help, paste the first failing error from the Netlify build log into an issue or support ticket — the first error is usually the root cause.

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

### Netlify build & deployment tips

- Clearing the Netlify build cache often fixes strange build failures. In Netlify, go to Deploys → Trigger deploy → Clear cache and deploy site.
- Plugin conflicts: ensure `@netlify/plugin-nextjs` is installed in your Netlify site plugins (netlify.toml includes it). If you previously added other Next plugins, try disabling them temporarily.
- Missing env vars: build-time errors usually mean a required server env is missing (e.g. SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY). Add required secrets in Site settings → Build & deploy → Environment.
- Node version: Netlify Node runtime should match Next.js requirements. This repo sets NODE_VERSION=20 in `netlify.toml`; in Netlify ensure the environment uses Node 20.x.

If a build fails, check the full build log for the first error, then:
1. Confirm required environment variables are set in Netlify (see NETLIFY_ENV_VARS.md).
2. Try clearing the build cache and re-deploy.
3. Temporarily disable non-official Netlify plugins and re-run.
4. Run `npm run build` locally with NODE_OPTIONS=--max_old_space_size=4096 if memory issues occur.


## Notes
- Replace logo.svg with your brand asset later.
- This is a functional scaffold; expand RLS, enums, and migrations as needed.
 - Feedback emails are sent From: `Feedback <feedback@agenthub.dev>` (adjust domain or from address in `app/api/feedback/route.ts`).
 - You can customize feedback option lists in `components/FeedbackWidget.tsx` (LIKE_OPTIONS / DISLIKE_OPTIONS arrays).

### Password Reset Flow (Supabase)

1. User clicks `Forgot password?` link (at `/forgot-password`).
2. They submit their email; we call `supabase.auth.resetPasswordForEmail(email, { redirectTo: SITE_URL + '/reset-password' })` and store the email locally in `localStorage` under `pw-reset-email`.
3. Supabase sends recovery email. Link opens `https://kairodex.com/reset-password` with either `?token=...&type=recovery` or a URL hash containing `#access_token=...&type=recovery`.
4. The `/reset-password` page parses query + hash, retrieves stored email, and calls `supabase.auth.verifyOtp({ type: 'recovery', token, email })` unless a session is already present (Supabase may auto-establish session from hash tokens).
5. On success, user sets a new password (validated client-side) via `supabase.auth.updateUser({ password })`.
6. Page clears the stored email and redirects to `/login` after confirmation.

Edge cases handled:
- Missing/expired/invalid token → instructs user to request a new link.
- Missing stored email → user can manually input email to retry verification.
- Already authenticated session (from hash) → skip verify step and show password form immediately.

Implementation files:
- `app/(routes)/forgot-password/page.tsx`
- `app/reset-password/page.tsx`
- `app/(routes)/login/page.tsx` & `app/(routes)/signup/page.tsx` include helpful links.

#### Forcing Links to Open in a Regular Browser (Not the Installed PWA)

If you install the PWA at the root origin (e.g. `https://kairodex.com`), OSes will route in-scope links to the standalone window. To force auth email links (confirm, reset) to open in a regular browser tab:

1. Set `NEXT_PUBLIC_AUTH_BROWSER_ORIGIN` (e.g. `https://www.kairodex.com` or better: `https://auth.kairodex.com`).
2. Signup + forgot-password flows use that origin for Supabase `emailRedirectTo` / `redirectTo`.
3. `/reset-password` auto-detects PWA standalone and opens the browser-origin URL if different.

Fallback behavior if unset:
- Dev: `http://localhost:3000`
- Prod: `https://www.kairodex.com`


