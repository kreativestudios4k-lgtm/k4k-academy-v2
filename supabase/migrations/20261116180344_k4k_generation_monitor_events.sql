create table if not exists public.k4k_generation_monitor_events (
 id bigint generated always as identity primary key,
 job_id uuid not null references public.studio_generation_jobs(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 previous_status text,
 status text not null,
 error_code text,
 event_at timestamptz not null default now()
);
create index if not exists k4k_generation_monitor_events_recent_idx on public.k4k_generation_monitor_events(event_at desc);
create index if not exists k4k_generation_monitor_events_job_idx on public.k4k_generation_monitor_events(job_id,event_at desc);
alter table public.k4k_generation_monitor_events enable row level security;
revoke all on public.k4k_generation_monitor_events from public, anon, authenticated;
grant select on public.k4k_generation_monitor_events to service_role;
create or replace function k4k_private.audit_generation_status() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' or old.status is distinct from new.status or old.error_message is distinct from new.error_message then
  insert into public.k4k_generation_monitor_events(job_id,user_id,previous_status,status,error_code)
  values(new.id,new.user_id,case when tg_op='INSERT' then null else old.status end,new.status,
   case when new.error_message in ('CONTENT_POLICY_BLOCKED','PROVIDER_GENERATION_FAILED') then new.error_message
   when new.error_message is null then null else 'GENERATION_ERROR' end);
 end if;
 return new;
end $$;
revoke all on function k4k_private.audit_generation_status() from public,anon,authenticated;
drop trigger if exists k4k_generation_status_monitor on public.studio_generation_jobs;
create trigger k4k_generation_status_monitor after insert or update of status,error_message on public.studio_generation_jobs
 for each row execute function k4k_private.audit_generation_status();
-- Add only one state snapshot for each existing job; don't invent historical transitions.
insert into public.k4k_generation_monitor_events(job_id,user_id,previous_status,status,error_code,event_at)
select j.id,j.user_id,null,j.status,case when j.error_message in ('CONTENT_POLICY_BLOCKED','PROVIDER_GENERATION_FAILED') then j.error_message when j.error_message is null then null else 'GENERATION_ERROR' end,j.updated_at
from public.studio_generation_jobs j where not exists(select 1 from public.k4k_generation_monitor_events e where e.job_id=j.id);
