-- Harden all existing School Control RPCs against anonymous EXECUTE.
-- Supabase default grants can include anon despite an earlier REVOKE FROM PUBLIC.
DO $$
DECLARE f record;
BEGIN
 FOR f IN
  SELECT p.oid::regprocedure::text AS signature,p.proname
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname LIKE 'sc\_%' ESCAPE '\'
 LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon',f.signature);
  IF f.proname='sc_confirm_payment' THEN
   EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated',f.signature);
   EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);
  ELSE
   EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',f.signature);
  END IF;
 END LOOP;
END $$;
-- New functions created by the migration owner must not become anonymous APIs.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon;
