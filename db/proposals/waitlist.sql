-- Email-only launch updates, stored separately from Academy/auth/billing records.
create table if not exists public.k4k_launch_waitlist (
 email text primary key check(length(email)<=254 and email=lower(email) and position('@' in email)>1),
 locale text not null check(locale in ('en','pt','es')),
 consent_version text not null default 'launch-updates-2026-11-11',
 consent_at timestamptz not null default now(),
 created_at timestamptz not null default now()
);
create table if not exists public.k4k_waitlist_rate_limits (
 rate_key text primary key,
 window_start timestamptz not null,
 attempts integer not null
);
alter table public.k4k_launch_waitlist enable row level security;
alter table public.k4k_waitlist_rate_limits enable row level security;
revoke all on public.k4k_launch_waitlist,public.k4k_waitlist_rate_limits from public,anon,authenticated;
grant select,insert,update on public.k4k_launch_waitlist,public.k4k_waitlist_rate_limits to service_role;
create or replace function public.k4k_join_waitlist(p_email text,p_locale text,p_rate_key text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare attempts_now integer;
begin
 if p_email is null or length(p_email)>254 or p_email<>lower(p_email) or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or p_locale is null or p_locale not in ('en','pt','es') or p_rate_key is null or p_rate_key !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_INPUT';end if;
 -- Serialize per hashed IP without storing raw IPs.
 perform pg_advisory_xact_lock(hashtext('k4k-waitlist:'||p_rate_key));
 insert into public.k4k_waitlist_rate_limits(rate_key,window_start,attempts) values(p_rate_key,now(),1)
 on conflict(rate_key) do update set attempts=case when public.k4k_waitlist_rate_limits.window_start<now()-interval '1 hour' then 1 else public.k4k_waitlist_rate_limits.attempts+1 end,window_start=case when public.k4k_waitlist_rate_limits.window_start<now()-interval '1 hour' then now() else public.k4k_waitlist_rate_limits.window_start end
 returning attempts into attempts_now;
 if attempts_now>5 then raise exception 'RATE_LIMITED';end if;
 insert into public.k4k_launch_waitlist(email,locale) values(p_email,p_locale) on conflict(email) do nothing;
 -- Same response for existing and new emails: no membership enumeration.
 return jsonb_build_object('accepted',true);
end;$$;
revoke all on function public.k4k_join_waitlist(text,text,text) from public,anon,authenticated;
grant execute on function public.k4k_join_waitlist(text,text,text) to service_role;
