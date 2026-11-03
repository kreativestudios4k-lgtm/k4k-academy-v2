-- PREVIEW PROPOSAL ONLY: do not execute against live Supabase without review.
-- Authenticated creator owns feedback; no public read/write and no client update/delete.
create table if not exists public.k4k_creator_beta_feedback (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 category text not null check (category in ('bug','quality','workflow','suggestion')),
 message text not null check (char_length(message) between 10 and 2000),
 job_id uuid null,
 created_at timestamptz not null default now()
);
create index if not exists k4k_creator_beta_feedback_user_created
 on public.k4k_creator_beta_feedback(user_id,created_at desc);
alter table public.k4k_creator_beta_feedback enable row level security;
revoke all on public.k4k_creator_beta_feedback from anon,authenticated;
grant insert,select on public.k4k_creator_beta_feedback to authenticated;
drop policy if exists k4k_creator_beta_feedback_insert_own on public.k4k_creator_beta_feedback;
create policy k4k_creator_beta_feedback_insert_own on public.k4k_creator_beta_feedback
 for insert to authenticated with check ((select auth.uid())=user_id and job_id is null);
drop policy if exists k4k_creator_beta_feedback_select_own on public.k4k_creator_beta_feedback;
create policy k4k_creator_beta_feedback_select_own on public.k4k_creator_beta_feedback
 for select to authenticated using ((select auth.uid())=user_id);
-- Non-null job references intentionally blocked until server-side ownership verification exists.
-- Rate-limit feedback at the API gateway before enabling this route.
