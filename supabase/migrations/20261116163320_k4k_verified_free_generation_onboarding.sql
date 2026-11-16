create schema if not exists k4k_private;
revoke all on schema k4k_private from public,anon,authenticated;
create or replace function k4k_private.grant_verified_free_generation() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.email_confirmed_at is null or coalesce(new.is_anonymous,false) or new.email is null then return new; end if;
 if exists(select 1 from public.k4k_early_free_entitlements where user_id=new.id) then return new; end if;
 if exists(select 1 from public.k4k_admins where user_id=new.id) or exists(select 1 from public.k4k_live_credit_accounts where user_id=new.id and (balance>0 or billing_hold)) then return new;end if;
 perform pg_catalog.pg_advisory_xact_lock(724312,1042026);
 if (select count(*) from public.k4k_early_free_entitlements)>=100 or (select coalesce(sum(quote_micros),0) from public.k4k_early_free_attempts)>=136500000 then return new;end if;
 insert into public.k4k_early_free_entitlements(user_id) values(new.id) on conflict(user_id) do nothing;
 return new;
end $$;
revoke all on function k4k_private.grant_verified_free_generation() from public,anon,authenticated;
drop trigger if exists k4k_verified_free_generation on auth.users;
create trigger k4k_verified_free_generation after insert or update of email_confirmed_at on auth.users for each row execute function k4k_private.grant_verified_free_generation();
select pg_catalog.pg_advisory_xact_lock(724312,1042026);
insert into public.k4k_early_free_entitlements(user_id)
select u.id from auth.users u
left join public.k4k_early_free_entitlements e on e.user_id=u.id
left join public.k4k_admins ad on ad.user_id=u.id
left join public.k4k_live_credit_accounts a on a.user_id=u.id
where u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false) and u.email is not null and e.user_id is null and ad.user_id is null and coalesce(a.balance,0)=0 and not coalesce(a.billing_hold,false)
and (select coalesce(sum(quote_micros),0) from public.k4k_early_free_attempts)<136500000
order by u.created_at,u.id
limit greatest(100-(select count(*) from public.k4k_early_free_entitlements),0)
on conflict(user_id) do nothing;
