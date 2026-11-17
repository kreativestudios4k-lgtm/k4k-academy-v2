-- New multimodel draft storage only. This migration does NOT charge credits,
-- dispatch provider calls, or change any existing generation/billing records.
-- Kept separate from studio_generation_jobs until a transactional integration
-- has been implemented, audited, and verified.
create table if not exists public.k4k_multimodel_jobs (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 provider text not null default 'fal' check (provider='fal'),
 model text not null check(model in ('kling-flash-t2v','seedance-25-t2v','flux3-t2i','nano-banana-21-t2i')),
 media_kind text not null check(media_kind in ('video','image')),
 status text not null default 'draft' check(status in ('draft','queued','processing','completed','failed','cancelled')),
 prompt text not null check(length(btrim(prompt)) between 1 and 6000),
 normalized_input jsonb not null check(jsonb_typeof(normalized_input)='object'),
 input_fingerprint text not null check(input_fingerprint ~ '^[0-9a-f]{64}$'),
 quoted_usd_micros bigint check(quoted_usd_micros between 1 and 5000000),
 credits_quoted integer check(credits_quoted between 1 and 10000),
 quote_expires_at timestamptz,
 provider_request_id text check(length(provider_request_id) between 1 and 256),
 output_mime text check(output_mime in ('video/mp4','image/png','image/jpeg')),
 output_path text,
 error_code text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint multimodel_kind_match check (
  (model in ('kling-flash-t2v','seedance-25-t2v') and media_kind='video')
  or (model in ('flux3-t2i','nano-banana-21-t2i') and media_kind='image')
 ),
 constraint multimodel_quote_complete check (
  (quoted_usd_micros is null and credits_quoted is null and quote_expires_at is null)
  or (quoted_usd_micros is not null and credits_quoted is not null and quote_expires_at is not null)
 ),
 constraint multimodel_output_kind check (
  output_mime is null or
  (media_kind='video' and output_mime='video/mp4') or
  (media_kind='image' and output_mime in ('image/png','image/jpeg'))
 ),
 constraint multimodel_output_pair check ((output_mime is null)=(output_path is null)),
 constraint multimodel_draft_not_dispatched check (
  status<>'draft' or (provider_request_id is null and output_path is null)
 )
);
create unique index if not exists k4k_multimodel_provider_request_uidx on public.k4k_multimodel_jobs(provider,provider_request_id) where provider_request_id is not null;
create index if not exists k4k_multimodel_jobs_owner_created on public.k4k_multimodel_jobs(user_id,created_at desc);
alter table public.k4k_multimodel_jobs enable row level security;
-- Default deny for anon/authenticated. The browser cannot create, update, or
-- forge billable job state. All writes require a future verified server RPC.
revoke all on public.k4k_multimodel_jobs from public,anon,authenticated;
grant select,insert,update,delete on public.k4k_multimodel_jobs to service_role;
-- service_role is a privileged server role; do not expose its key to clients.
