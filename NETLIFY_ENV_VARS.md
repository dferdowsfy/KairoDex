# Netlify environment variables checklist

Use this as a checklist when configuring site environment variables on Netlify. Mark values as "Set" when added in Site > Site settings > Build & deploy > Environment.

- [ ] NEXT_PUBLIC_SUPABASE_URL  (public) — Supabase project URL used by browser clients
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY  (public) — Supabase anon key for browser
- [ ] SUPABASE_URL  (secret) — Server-side Supabase URL (alternate to NEXT_PUBLIC_SUPABASE_URL)
- [ ] SUPABASE_ANON_KEY  (secret) — Server-side anon key fallback
- [ ] SUPABASE_SERVICE_ROLE_KEY  (secret) — Supabase service role key for server operations
- [ ] SUPABASE_SERVICE_ROLE (secret) — alternate name used in some scripts
- [ ] SUPABASE_SERVICE_KEY (secret) — alternate name used in some scripts
- [ ] NEXT_PUBLIC_SUPABASE_CLIENTS_TABLE (public) — table name override (optional)
- [ ] SUPABASE_CLIENTS_TABLE (secret) — table name override alternate

- [ ] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (public) — Stripe publishable key for browser
- [ ] STRIPE_SECRET_KEY (secret) — Stripe secret key for server
- [ ] STRIPE_WEBHOOK_SECRET (secret) — Stripe webhook signing secret

- [ ] NEXT_PUBLIC_SITE_URL (public) — canonical site URL used in redirects and email links
- [ ] NEXT_PUBLIC_BASE_URL (public) — base URL used by some cron/api callers

- [ ] NEXT_PUBLIC_USE_MOCKS (public) — set to false in production to disable mock providers
- [ ] NEXT_PUBLIC_USE_SHEET (public) — toggle Google Sheets features

- [ ] OPENROUTER_API_KEY (secret) — OpenRouter key for live market data (optional)
- [ ] OPENAI_API_KEY (secret) — OpenAI key (optional)
- [ ] GEMINI_API_KEY (secret) — Gemini key (optional)
- [ ] OPENAI_TEXT_MODEL / MARKET_OPENROUTER_MODEL / AI_MODEL (optional) — model selection envs
- [ ] AI_TEMPERATURE / MARKET_TEMPERATURE (optional) — numeric settings

- [ ] GOOGLE_SERVICE_ACCOUNT (secret) — JSON string for Google service account (optional)
- [ ] GOOGLE_CLIENT_EMAIL (secret) — client_email for Google SA
- [ ] GOOGLE_PRIVATE_KEY (secret) — private key for Google SA (use newline-escaped value)
- [ ] GOOGLE_SHEETS_ID / GOOGLE_SHEETS_SHEET_ID / GOOGLE_SHEET_ID (optional)
- [ ] GOOGLE_SHEETS_GID / GOOGLE_SHEET_GID (optional)
- [ ] GOOGLE_SHEETS_PUBLIC_CSV_URL (optional)

- [ ] DOCUSIGN_PRIVATE_KEY (secret) — Docusign private key (optional)
- [ ] DOCUSIGN_PRIVATE_KEY_BASE64 (secret) — alternative base64 private key
- [ ] DOCUSIGN_CLIENT_ID, DOCUSIGN_USER_ID, DOCUSIGN_ACCOUNT_ID, DOCUSIGN_ENV, DOCUSIGN_REDIRECT_URI (optional)

- [ ] JWT_SECRET (secret) — backend JWT signing secret (if using backend services)

- [ ] SESSION_IDLE_MIN, SESSION_ABS_HOURS (optional) — session lifetime settings
- [ ] HIBP_CHECK (optional) — set to 'off' to skip HaveIBeenPwned checks

- [ ] PORT (optional) — backend server port (defaults to 3000)
- [ ] CORS_ORIGINS (optional) — comma-separated allowed origins for API server
- [ ] RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX (optional)
- [ ] LOG_LEVEL, NO_PRETTY_LOGS (optional)

- [ ] NEXT_PUBLIC_GOOGLE_CLIENT (public) — Google OAuth client id for browser

Notes:
- Mark the keys listed as "secret" in Netlify as protected environment variables (not exposed to client). Any variable prefixed with NEXT_PUBLIC_ is intentionally public and required on the browser.
- Some variables have multiple names present in the codebase; set the canonical ones you use in production and consider adding aliases for migration.
