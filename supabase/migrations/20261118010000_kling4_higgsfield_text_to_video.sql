-- Add a separate, explicitly gated Higgsfield Kling 4.0 text-to-video model.
-- Existing fal Kling jobs, credit balances and subscriptions are unchanged.
alter table public.k4k_multimodel_jobs drop constraint if exists k4k_multimodel_jobs_model_check;
alter table public.k4k_multimodel_jobs add constraint k4k_multimodel_jobs_model_check
 check(model in ('kling-flash-t2v','kling-4-t2v','kling-4-hf-t2v','seedance-25-t2v','flux3-t2i','nano-banana-21-t2i','genjutsu-motion'));
alter table public.k4k_multimodel_jobs drop constraint if exists multimodel_kind_match;
alter table public.k4k_multimodel_jobs add constraint multimodel_kind_match check(
 (provider='higgsfield' and model in ('genjutsu-motion','kling-4-hf-t2v') and media_kind='video')
 or (provider='fal' and model in ('kling-flash-t2v','kling-4-t2v','seedance-25-t2v') and media_kind='video')
 or (provider='fal' and model in ('flux3-t2i','nano-banana-21-t2i') and media_kind='image')
);
