-- REVIEW ONLY: not a migration and not applied to any hosted database.
-- Depends on db/proposals/generation-credit-ledger.sql (k4k_generation.jobs).
-- Apply after that file, inside one reviewed transaction, to a disposable database first.
begin;

-- Owner-scoped, newest-first page of a user's generation jobs.
-- service_role only: the server derives p_user from a verified session.
-- Returns full rows; the application layer maps them to a public view.
create function public.k4k_generation_list(p_user uuid,p_limit integer,p_before timestamptz)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 if current_user <> 'service_role' then raise exception 'Server only' using errcode='42501'; end if;
 if p_user is null or p_limit is null or p_limit not between 1 and 50 then raise exception 'Invalid history request'; end if;
 select coalesce(jsonb_agg(to_jsonb(j) order by j.created_at desc, j.id desc), '[]'::jsonb)
   into result
   from (
     select * from k4k_generation.jobs
      where user_id=p_user and (p_before is null or created_at < p_before)
      order by created_at desc, id desc
      limit p_limit
   ) j;
 return result;
end $$;

revoke all on function public.k4k_generation_list(uuid,integer,timestamptz) from public,anon,authenticated;
grant execute on function public.k4k_generation_list(uuid,integer,timestamptz) to service_role;
commit;
