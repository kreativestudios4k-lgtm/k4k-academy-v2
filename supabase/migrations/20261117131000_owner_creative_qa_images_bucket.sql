-- Private owner-only QA image outputs, distinct from video/mp4 customer generations.
insert into storage.buckets(id,name,public,allowed_mime_types)
values ('studio-qa-images','studio-qa-images',false,array['image/png','image/jpeg']::text[])
on conflict(id) do nothing;
-- No storage.objects policies are granted: only the server service role may save/serve signed owner results.
