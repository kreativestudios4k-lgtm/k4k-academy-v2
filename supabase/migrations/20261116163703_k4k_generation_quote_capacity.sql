-- Quote capacity is advisory only; existing transactional reserve remains authoritative.
create or replace function public.k4k_generation_quote_capacity(p_user uuid,p_quote_micros bigint,p_daily_budget_micros bigint,p_total_budget_micros bigint,p_max_active integer,p_free boolean)
returns text language plpgsql stable security invoker set search_path='' as $$
declare v_used bigint;v_total bigint;v_active bigint;
begin
 if current_user<>'service_role' or coalesce(auth.role(),'')<>'service_role' then raise exception 'FORBIDDEN';end if;
 if p_user is null or p_quote_micros is null or p_quote_micros not between 1 and 5000000 or p_daily_budget_micros is null or p_daily_budget_micros not between 1 and 100000000000 or p_total_budget_micros is null or p_total_budget_micros not between 1 and 100000000000 or p_max_active is null or p_max_active not between 1 and 10 or p_free is null then return 'PROVIDER_BUDGET_BLOCKED';end if;
 if p_free then
  if not exists(select 1 from public.k4k_early_free_entitlements where user_id=p_user and status='available' and attempts<2) then return 'FREE_GENERATION_UNAVAILABLE';end if;
  select coalesce(sum(quote_micros),0) into v_used from public.k4k_early_free_attempts;
  if v_used+p_quote_micros>136500000 then return 'FREE_GENERATION_BUDGET_BLOCKED';end if;
 end if;
 select count(*) into v_active from public.studio_generation_jobs where user_id=p_user and status in ('queued','processing');
 if v_active>=p_max_active then return 'ACTIVE_JOB_LIMIT';end if;
 select coalesce(sum(quote_micros),0),coalesce(sum(quote_micros) filter(where created_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC'),0) into v_total,v_used from public.k4k_generation_budget_allocations;
 if v_used+p_quote_micros>p_daily_budget_micros then return 'PROVIDER_DAILY_BUDGET_BLOCKED';end if;
 if v_total+p_quote_micros>p_total_budget_micros then return 'PROVIDER_TOTAL_BUDGET_BLOCKED';end if;
 return null;
end $$;
revoke all on function public.k4k_generation_quote_capacity(uuid,bigint,bigint,bigint,integer,boolean) from public,anon,authenticated;
grant execute on function public.k4k_generation_quote_capacity(uuid,bigint,bigint,bigint,integer,boolean) to service_role;
