alter table public.k4k_early_free_attempts drop constraint k4k_early_free_attempts_quote_micros_check;
alter table public.k4k_early_free_attempts add constraint k4k_early_free_attempts_quote_micros_check check(quote_micros between 1 and 2100000);
create or replace function public.k4k_reserve_early_free_generation(
 p_user uuid,p_job uuid,p_key uuid,p_credits integer,p_enabled boolean,p_provider text,
 p_quote_micros bigint,p_daily_budget_micros bigint,p_max_active integer,p_total_budget_micros bigint,p_source_millis integer
) returns jsonb language plpgsql set search_path='' as $function$
declare
 v_ent public.k4k_early_free_entitlements%rowtype;
 v_existing public.k4k_generation_reservations%rowtype;
 v_result jsonb;
 v_total bigint;
begin
 if current_user<>'service_role' or coalesce(auth.role(),'')<>'service_role' then raise exception 'FORBIDDEN';end if;
 if p_enabled is distinct from true then raise exception 'GENERATION_DISABLED';end if;
 if p_user is null or p_job is null or p_key is null or p_provider is distinct from 'fal'
  or p_quote_micros is null or p_quote_micros not between 1 and 2100000
  or p_source_millis is null or p_source_millis not between 2000 and 15000
  or p_credits is null or p_credits not between 1 and 10000 then raise exception 'FREE_GENERATION_LIMIT';end if;
 perform pg_catalog.pg_advisory_xact_lock(724312,1042026);
 select * into v_existing from public.k4k_generation_reservations where user_id=p_user and (request_key=p_key or job_id=p_job) limit 1;
 if found then
  if v_existing.job_id<>p_job or v_existing.credits<>p_credits or v_existing.credit_mode<>'live'
   or not exists(select 1 from public.k4k_early_free_attempts where job_id=p_job and user_id=p_user) then raise exception 'IDEMPOTENCY_CONFLICT';end if;
  return jsonb_build_object('job_id',p_job,'status',v_existing.status,'credits',v_existing.credits,'newly_reserved',false);
 end if;
 select * into v_ent from public.k4k_early_free_entitlements where user_id=p_user for update;
 if not found or v_ent.status<>'available' or v_ent.attempts>=2 then raise exception 'FREE_GENERATION_UNAVAILABLE';end if;
 select coalesce(sum(quote_micros),0) into v_total from public.k4k_early_free_attempts;
 if v_total+p_quote_micros>136500000 then raise exception 'FREE_GENERATION_BUDGET_BLOCKED';end if;
 insert into public.k4k_live_credit_accounts(user_id,balance) values(p_user,0) on conflict(user_id) do nothing;
 update public.k4k_live_credit_accounts set balance=balance+p_credits,updated_at=now() where user_id=p_user and not billing_hold;
 if not found then raise exception 'BILLING_REVIEW_REQUIRED';end if;
 v_result:=public.k4k_generation_reserve_live_budgeted(p_user,p_job,p_key,p_credits,p_enabled,p_provider,p_quote_micros,p_daily_budget_micros,p_max_active,p_total_budget_micros);
 if coalesce((v_result->>'newly_reserved')::boolean,false) is not true then raise exception 'IDEMPOTENCY_CONFLICT';end if;
 insert into public.k4k_early_free_attempts(job_id,user_id,credits,quote_micros) values(p_job,p_user,p_credits,p_quote_micros);
 update public.k4k_early_free_entitlements set status='reserved',attempts=attempts+1,job_id=p_job,updated_at=now() where user_id=p_user;
 -- The reservation records its internal funding; the customer-facing job cost is zero.
 update public.studio_generation_jobs set credits_reserved=0 where id=p_job and user_id=p_user;
 return v_result;
end;
$function$;
revoke all on function public.k4k_reserve_early_free_generation(uuid,uuid,uuid,integer,boolean,text,bigint,bigint,integer,bigint,integer) from public,anon,authenticated;
grant execute on function public.k4k_reserve_early_free_generation(uuid,uuid,uuid,integer,boolean,text,bigint,bigint,integer,bigint,integer) to service_role;
