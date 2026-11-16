alter table public.studio_generation_jobs add column if not exists deleted_at timestamptz;
create index if not exists studio_generation_jobs_visible_idx on public.studio_generation_jobs(user_id,created_at desc) where deleted_at is null;
comment on column public.studio_generation_jobs.deleted_at is 'Customer library deletion tombstone. Keep job, settlement, and audit records; remove output MP4 separately. Only terminal completed videos can be deleted via authenticated service route.';
