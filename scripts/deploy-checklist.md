# Deploy checklist for Netlify

This file lists the environment variables and quick tests to run after deployment.

## Required Netlify environment variables (set these in Site → Site settings → Build & deploy → Environment)

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_URL (optional fallback)
- SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE / SUPABASE_SERVICE_KEY)
- NEXT_PUBLIC_SITE_URL (set to https://kairodex.com)
- NEXT_PUBLIC_SUPABASE_CLIENTS_TABLE (optional)
- SUPABASE_CLIENTS_TABLE (optional)
- OPENAI_API_KEY or OPENROUTER_API_KEY or GEMINI_API_KEY
- NEXT_PUBLIC_BASE_URL (optional; set to https://kairodex.com)
- STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (if payments used)
- JWT_SECRET (if backend JWT is required)

## Quick smoke tests (curl)

1) Test AI chat endpoint (requires authenticated session cookie normally). For a quick smoke test, POST without auth to see if endpoint returns 401 or a controlled error, not HTML 404:

```bash
curl -i -X POST https://kairodex.com/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"clientId":null,"message":"Hello"}'
```

Expected: 401/400 JSON error or structured JSON; Not an HTML 404 page.

2) Test bulk upload API (requires auth):

```bash
curl -i -X POST https://kairodex.com/api/clients/bulk-upload \
  -H "Content-Type: application/json" \
  --data '[{"name":"Test Client","email":"test@example.com"}]'
```

Expected: 401 if not authenticated, or 200 JSON response with inserted rows.

3) If you use Supabase storage, test listing buckets or uploading via the admin helper (server-side code). Prefer checking server logs for runtime errors.

## If builds fail
- Clear build cache on Netlify and redeploy.
- Confirm Node version is set to 20 (netlify.toml already sets NODE_VERSION=20).
- Check deploy logs for first failing error and add missing envs.

## Notes
- Do NOT store secrets in the repository. Add them in the Netlify UI as protected environment variables.
- This checklist is safe to commit to the repo and contains no secrets.
