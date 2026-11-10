-- REVIEW ONLY. Not applied to any database. Do not run without explicit approval.
--
-- Purpose: let the server tell "never sent to the provider" apart from
-- "sent, outcome unknown", and replay an unknown submission safely.
--
-- Today (no schema change) a job whose provider call timed out stays 'queued'
-- with credits reserved until a person reviews it. Higgsfield documents that
-- resending the SAME body with the SAME Idempotency-Key returns the original
-- request without a second charge, but the body must be byte-for-byte the
-- same, and the signed media links in it are different every time they are
-- created. Storing the exact body makes that replay possible.
--
-- This migration is additive only: three nullable columns and one index.
-- It changes no existing row, balance, subscription, policy or function.
begin;

alter table public.studio_generation_jobs
  add column if not exists resolution text
    check (resolution is null or resolution in ('480p','720p','1080p')),
  add column if not exists submission_started_at timestamptz,
  add column if not exists provider_payload jsonb
    check (provider_payload is null or jsonb_typeof(provider_payload) = 'object');

comment on column public.studio_generation_jobs.provider_payload is
  'Exact request body sent to the provider. Server-only: contains signed links. Never select it from browser code.';

-- Speeds up the per-customer active-job check and the history page.
create index if not exists studio_generation_jobs_user_status_created_idx
  on public.studio_generation_jobs (user_id, status, created_at desc);

-- provider_payload holds signed links, so customers must not read it.
-- The existing policy studio_users_read_own_jobs exposes whole rows. Before
-- this column is populated, move it behind a column-level revoke:
revoke select (provider_payload) on public.studio_generation_jobs from authenticated, anon;

commit;

-- Read-only check to run after applying (expect three rows, all nullable):
-- select column_name, is_nullable from information_schema.columns
--  where table_schema='public' and table_name='studio_generation_jobs'
--    and column_name in ('resolution','submission_started_at','provider_payload');
