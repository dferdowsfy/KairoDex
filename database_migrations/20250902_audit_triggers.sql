BEGIN;

CREATE OR REPLACE FUNCTION public.log_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log(actor_user_id, org_id, action, entity, entity_id, diff)
    VALUES(auth.uid()::uuid, NEW.org_id, 'INSERT', TG_TABLE_NAME, COALESCE(NEW.id, NULL), row_to_json(NEW)::jsonb);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log(actor_user_id, org_id, action, entity, entity_id, diff)
    VALUES(auth.uid()::uuid, NEW.org_id, 'UPDATE', TG_TABLE_NAME, COALESCE(NEW.id, NULL), jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW)));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log(actor_user_id, org_id, action, entity, entity_id, diff)
    VALUES(auth.uid()::uuid, OLD.org_id, 'DELETE', TG_TABLE_NAME, COALESCE(OLD.id, NULL), row_to_json(OLD)::jsonb);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Attach triggers to clients and client_notes
CREATE TRIGGER clients_audit_tr AFTER INSERT OR UPDATE OR DELETE ON clients FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER client_notes_audit_tr AFTER INSERT OR UPDATE OR DELETE ON client_notes FOR EACH ROW EXECUTE FUNCTION public.log_audit();

COMMIT;
