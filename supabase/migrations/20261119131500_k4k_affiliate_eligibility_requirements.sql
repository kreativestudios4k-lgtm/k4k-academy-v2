-- Additive, backwards-compatible creator eligibility fields.
-- Historical applications remain intact; only future applicants supply these.
alter table public.k4k_affiliate_applications
  add column if not exists followers_count integer,
  add column if not exists content_niche text,
  add column if not exists application_motivation text,
  add column if not exists eligibility_confirmed_at timestamptz;

alter table public.k4k_affiliate_applications
  add constraint k4k_affiliate_followers_count_positive
  check (followers_count is null or (followers_count between 1000 and 200000000));
alter table public.k4k_affiliate_applications
  add constraint k4k_affiliate_content_niche_length
  check (content_niche is null or char_length(content_niche) between 2 and 60);
alter table public.k4k_affiliate_applications
  add constraint k4k_affiliate_motivation_length
  check (application_motivation is null or char_length(application_motivation) between 30 and 600);

comment on column public.k4k_affiliate_applications.followers_count is 'Self-reported Instagram followers; admin must independently verify before approval.';
comment on column public.k4k_affiliate_applications.content_niche is 'Creator content category supplied in application.';
comment on column public.k4k_affiliate_applications.application_motivation is 'Reason for joining the K4K creator affiliate programme.';
comment on column public.k4k_affiliate_applications.eligibility_confirmed_at is 'Applicant confirmed 18+, public account, original recent activity and no fake engagement; self-declaration subject to review.';
