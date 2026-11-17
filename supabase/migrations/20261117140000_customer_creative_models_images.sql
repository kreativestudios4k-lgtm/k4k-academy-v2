-- Extend existing isolated multimodel ledger to support explicit Kling 4.0 customer model.
-- Preserve existing job values and the other ledger invariants.
alter table public.k4k_multimodel_jobs drop constraint if exists k4k_multimodel_jobs_model_check;
alter table public.k4k_multimodel_jobs add constraint k4k_multimodel_jobs_model_check
 check(model in ('kling-flash-t2v','kling-4-t2v','seedance-25-t2v','flux3-t2i','nano-banana-21-t2i','genjutsu-motion'));
alter table public.k4k_multimodel_jobs drop constraint if exists multimodel_kind_match;
alter table public.k4k_multimodel_jobs add constraint multimodel_kind_match check(
  (provider='higgsfield' and model='genjutsu-motion' and media_kind='video')
  or (provider='fal' and model in ('kling-flash-t2v','kling-4-t2v','seedance-25-t2v') and media_kind='video')
  or (provider='fal' and model in ('flux3-t2i','nano-banana-21-t2i') and media_kind='image')
);
insert into storage.buckets(id,name,public,allowed_mime_types)
 values('studio-customer-images','studio-customer-images',false,array['image/png','image/jpeg']::text[])
on conflict(id) do nothing;
-- Do not grant object policies. User uploads/downloads are routed through authenticated server APIs.
