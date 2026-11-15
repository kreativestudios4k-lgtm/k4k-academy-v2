-- Review and apply via approved migration before enabling video submissions.
create table public.k4k_partner_videos (
 id uuid primary key default gen_random_uuid(),
 partner_id uuid not null references auth.users(id),
 platform text not null check (platform in ('instagram','tiktok')),
 video_key text not null unique,
 url text not null,
 status text not null default 'pending' check (status in ('pending','approved','rejected','paid')),
 verified_views bigint check (verified_views >= 0),
 bonus_brl_cents integer check (bonus_brl_cents in (0,2000,5000,10000,20000)),
 created_at timestamptz not null default now()
);
create index k4k_partner_videos_owner_idx on public.k4k_partner_videos(partner_id,created_at desc);
alter table public.k4k_partner_videos enable row level security;
revoke all on public.k4k_partner_videos from public,anon,authenticated;
grant select,insert,update on public.k4k_partner_videos to service_role;
-- No browser access: authenticated server routes enforce approved partner ownership.
-- Approval, verified views and payout transitions require a separate admin-only audited workflow.
