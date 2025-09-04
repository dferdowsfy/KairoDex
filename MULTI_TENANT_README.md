This patch adds multi-tenant support for AgentHub (KairoDex) using Supabase + Next.js.

What changed
- New SQL migrations in `database_migrations/` to create `orgs`, `profiles`, `org_memberships`, add `org_id` columns, RLS policies, audit logging, and storage helper.
- `edge_functions/process_email_jobs/index.ts` Deno function to process `email_jobs` (idempotent via `dedupe_key`).
- Frontend: `hooks/useOrg.tsx`, `hooks/useClientsAndNotes.tsx`, `lib/realtime.ts` and an example server API `app/api/clients/route.ts`.

Quick deploy steps
1. Run SQL migrations on your Supabase DB (in order):
   - `20250902_add_orgs_profiles_memberships.sql`
   - `20250902_multi_tenant_business_tables.sql`
   - `20250902_rls_and_policies.sql`
   - `20250902_audit_triggers.sql`
   - `20250902_storage_policies.sql` (note: storage policies must be created in dashboard)

2. Deploy Edge Function `process_email_jobs` and set env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`.

3. Frontend: wrap app with `OrgProvider` and ensure sign-in sets an `org_id` httpOnly cookie. Use hooks in components.

Notes & Next Steps
- You must wire sign-in flow to create `profiles` rows and `org_memberships`. On first sign-in, create profile and optionally a default org.
- Storage policy creation must be completed in Supabase dashboard; the SQL provides a helper to extract org_id from path.
- Tests, types, and more granular policies (e.g., for files) can be added next.
