-- REVIEW ONLY. DO NOT RUN against production without explicit approval.
-- Replace the existing public.k4k_generation_finish function with its full
-- reviewed definition, changing ONLY the completed-output validation from
-- the permissive UUID-shaped filename regex to this exact job-owned path:
--
-- IF p_output_path IS DISTINCT FROM
--    (p_user::text || '/' || p_job::text || '.mp4') THEN
--   RAISE EXCEPTION 'INVALID_OUTPUT';
-- END IF;
--
-- The existing function uses a SECURITY DEFINER role guard, reservation row
-- locking and credit updates. Preserve all of those transaction semantics.
-- Never deploy a partial CREATE OR REPLACE FUNCTION body.
--
-- Preflight read-only check (expected to report NOT_BOUND until patched):
SELECT
  p.proname,
  pg_get_functiondef(p.oid) LIKE '%p_job::text%' AS contains_job_path_binding,
  has_function_privilege('anon',p.oid,'EXECUTE') AS anon_can_execute,
  has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_can_execute,
  has_function_privilege('service_role',p.oid,'EXECUTE') AS service_role_can_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname='k4k_generation_finish';
--
-- Follow-up after explicit approval: apply full function in a transaction,
-- verify pg_get_functiondef and privileges, and run rollback-only settlement
-- tests against synthetic isolated rows. No customer credits are to be changed.
