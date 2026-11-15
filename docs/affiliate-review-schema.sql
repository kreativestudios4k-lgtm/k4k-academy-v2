-- Draft: apply only after the base affiliate video schema is reviewed.
create table public.k4k_partner_video_reviews (
 id uuid primary key default gen_random_uuid(),
 video_id uuid not null references public.k4k_partner_videos(id),
 admin_id uuid not null references auth.users(id),
 status text not null check(status in ('approved','rejected')),
 verified_views bigint not null check(verified_views>=0),
 bonus_brl_cents integer not null,
 created_at timestamptz not null default now()
);
alter table public.k4k_partner_video_reviews enable row level security;
revoke all on public.k4k_partner_video_reviews from public,anon,authenticated;
grant select,insert on public.k4k_partner_video_reviews to service_role;
create or replace function public.k4k_review_partner_video(p_id uuid,p_admin uuid,p_status text,p_views bigint)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v public.k4k_partner_videos%rowtype; bonus integer;
begin
 if p_status not in ('approved','rejected') or p_views is null or p_views<0 then raise exception 'INVALID_REVIEW'; end if;
 select * into v from public.k4k_partner_videos where id=p_id for update;
 if not found or v.status not in ('pending','approved','rejected') then raise exception 'VIDEO_NOT_REVIEWABLE'; end if;
 bonus:=case when p_status='rejected' then 0 when p_views>=10000000 then 20000 when p_views>=1000000 then 10000 when p_views>=500000 then 5000 when p_views>=100000 then 2000 else 0 end;
 update public.k4k_partner_videos set status=p_status,verified_views=p_views,bonus_brl_cents=bonus where id=p_id returning * into v;
 insert into public.k4k_partner_video_reviews(video_id,admin_id,status,verified_views,bonus_brl_cents) values(p_id,p_admin,p_status,p_views,bonus);
 return to_jsonb(v);
end $$;
revoke all on function public.k4k_review_partner_video(uuid,uuid,text,bigint) from public,anon,authenticated;
grant execute on function public.k4k_review_partner_video(uuid,uuid,text,bigint) to service_role;
