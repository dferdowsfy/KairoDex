-- Storage policies for Supabase storage buckets
-- Assumes bucket 'uploads'

-- Note: Supabase storage policies use its own auth.uid() inside policies

-- Example policy: allow read/write if user is member of org matching path
-- path format: orgs/{org_id}/clients/{client_id}/...

-- This demonstrates a policy expression; apply via Supabase SQL editor for storage policies
-- Pseudo-SQL (Supabase dashboard supports policy creation UI):
-- CREATE POLICY "org_member_access" ON storage.objects FOR ALL USING (
--   (
--     regexp_matches(name, '^orgs/([0-9a-fA-F-]{36})/')[1] IS NOT NULL
--     AND public.is_member((regexp_matches(name, '^orgs/([0-9a-fA-F-]{36})/')[1])::uuid)
--   )
-- );

-- For simplicity, include a helper view to extract org_id from path
CREATE OR REPLACE FUNCTION public.extract_org_from_path(path text) RETURNS uuid LANGUAGE sql IMMUTABLE AS $$
  SELECT (regexp_matches(path, '^orgs/([0-9a-fA-F-]{36})/'))[1]::uuid;
$$;

-- Note: actual storage policy must be created in Supabase Storage policy UI using the extract above or inline regex.
