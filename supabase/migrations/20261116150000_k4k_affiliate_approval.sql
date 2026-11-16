-- Atomic service-only approval; legacy partner agreements remain unchanged.
create or replace function public.k4k_approve_affiliate(p_user uuid,p_code text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare a public.k4k_affiliate_applications%rowtype;
begin
 if current_user<>'service_role' or coalesce(auth.role(),'')<>'service_role' then raise exception 'FORBIDDEN';end if;
 if p_code is null or p_code !~ '^[a-z0-9][a-z0-9-]{1,37}10$' or p_code='matheus10' then raise exception 'INVALID_CODE';end if;
 select * into a from public.k4k_affiliate_applications where user_id=p_user for update;
 if not found or a.status<>'pending_review' then raise exception 'APPLICATION_NOT_PENDING';end if;
 insert into public.k4k_app_partners(user_id,code,display_name,commission_bps,active) values(p_user,p_code,left(a.full_name,100),2500,true);
 update public.k4k_affiliate_applications set status='approved' where user_id=p_user;
 return jsonb_build_object('code',p_code,'commissionBps',2500,'active',true);
end $$;
revoke all on function public.k4k_approve_affiliate(uuid,text) from public,anon,authenticated;
grant execute on function public.k4k_approve_affiliate(uuid,text) to service_role;
