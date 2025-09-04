-- Enable pgcrypto extension used for gen_random_uuid etc.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

-- Helper function: is_member
CREATE OR REPLACE FUNCTION public.is_member(p_org uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
SELECT EXISTS(
  SELECT 1 FROM org_memberships m
  JOIN profiles p ON p.id = m.profile_id
  WHERE m.org_id = p_org AND p.user_id = auth.uid()
);
$$;

-- Enable RLS on relevant tables

-- Only enable RLS and create policies if the target table and org_id column exist.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'org_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY';
    EXECUTE $policy$
      CREATE POLICY clients_org_policy ON public.clients
      USING (is_member(org_id)) WITH CHECK (is_member(org_id));
    $policy$;
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'client_notes' AND column_name = 'org_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY';

    -- Select: member of org
    EXECUTE $policy$
      CREATE POLICY client_notes_select_policy ON public.client_notes FOR SELECT USING (is_member(org_id));
    $policy$;

    -- Insert: must be member (org_id must be provided by client and is_member will validate)
    EXECUTE $policy$
      CREATE POLICY client_notes_insert_policy ON public.client_notes FOR INSERT WITH CHECK (is_member(org_id));
    $policy$;

    -- Update: agents can update their own notes; admin/owner can update any
    EXECUTE $policy$
      CREATE POLICY client_notes_update_policy ON public.client_notes FOR UPDATE USING (
        is_member(org_id) AND (
          EXISTS (
            SELECT 1 FROM org_memberships m JOIN profiles p ON p.id = m.profile_id
            WHERE m.org_id = public.client_notes.org_id AND p.user_id = auth.uid() AND m.role IN ('owner','admin')
          )
          OR public.client_notes.author_user_id = auth.uid()
        )
      );
    $policy$;

    -- Delete: only owner/admin
    EXECUTE $policy$
      CREATE POLICY client_notes_delete_policy ON public.client_notes FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM org_memberships m JOIN profiles p ON p.id = m.profile_id
          WHERE m.org_id = public.client_notes.org_id AND p.user_id = auth.uid() AND m.role IN ('owner','admin')
        )
      );
    $policy$;
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'email_jobs' AND column_name = 'org_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.email_jobs ENABLE ROW LEVEL SECURITY';
    EXECUTE $policy$
      CREATE POLICY email_jobs_select_policy ON public.email_jobs FOR SELECT USING (is_member(org_id));
      CREATE POLICY email_jobs_insert_policy ON public.email_jobs FOR INSERT WITH CHECK (is_member(org_id));
      CREATE POLICY email_jobs_update_policy ON public.email_jobs FOR UPDATE USING (
        is_member(org_id) AND (
          EXISTS (
            SELECT 1 FROM org_memberships m JOIN profiles p ON p.id = m.profile_id
            WHERE m.org_id = public.email_jobs.org_id AND p.user_id = auth.uid() AND m.role IN ('owner','admin')
          )
        )
      );
    $policy$;
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audit_log' AND column_name = 'org_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY';
    EXECUTE $policy$
      CREATE POLICY audit_log_select_policy ON public.audit_log FOR SELECT USING (is_member(org_id));
      CREATE POLICY audit_log_insert_policy ON public.audit_log FOR INSERT WITH CHECK (auth.role() = 'service_role' OR is_member(org_id));
    $policy$;
  END IF;
END$$;

COMMIT;
