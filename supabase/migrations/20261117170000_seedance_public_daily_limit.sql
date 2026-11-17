-- Public Seedance 2.5 safety limiter: max one dispatched paid job per user per UTC day.
-- Draft quotes remain free. The existing atomic reservation RPC transitions a job
-- into queued, and this index makes a concurrent second reservation fail atomically.
-- Never alter customer wallets directly.
create unique index if not exists k4k_seedance_daily_paid_once
 on public.k4k_multimodel_jobs(user_id,(date_trunc('day',created_at at time zone 'UTC')))
 where model='seedance-25-t2v'
 and status in ('queued','processing','completed','failed');
