-- Server-only reference receipt. Existing RLS/ACL deny customer mutation.
alter table public.k4k_multimodel_jobs add column if not exists verified_media jsonb;
alter table public.k4k_multimodel_jobs add constraint k4k_verified_media_object
 check(verified_media is null or jsonb_typeof(verified_media)='object');
