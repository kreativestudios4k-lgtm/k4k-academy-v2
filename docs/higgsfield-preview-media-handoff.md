# Higgsfield private media preview — 17 November 2026

The owner preview at `/k4k-app/higgsfield-preview` now offers **Upload and verify privately**. It saves the selected MP4 and 1–8 reference images into the existing private Studio buckets using the signed-in user's storage permissions. Completed uploads are reused when retrying verification or changing output resolution within the same selection.

`POST /api/higgsfield/customer-preview-media` first checks preview environment, same-origin requests and the authenticated owner. A preflight request allows the UI to check access before uploading. Verification uses the user's JWT and public Supabase key, preserving storage RLS; it never uses service-role privileges. It accepts only owned storage paths and resolution, never browser duration, prices, credit amounts or arbitrary URLs.

The existing media verifier checks file signatures, byte limits, image dimensions and MP4 movie-header duration. This is container metadata verification, not a complete video decode or proof of provider compatibility. The response gives an informational provider cost estimate using that duration. It does not issue a signed quote, persist a customer job, debit credits or dispatch a provider request. Production returns 404.

Read-only inspection confirmed both buckets are private, with 10 MiB image and 50 MiB MP4 limits, and authenticated insert/select policies restricted to the user's folder. No policies, balances or database records were changed.

Regression coverage includes cross-user paths, duplicate images, arbitrary URLs, client billing fields, malformed/out-of-range MP4s, environment/origin/auth restrictions, read-only preflight and propagation of the user JWT for RLS. Browser upload and real authenticated storage verification still require an owner session; automated tests use storage fixtures.

## Remaining activation gates

- Bind verified content to immutable provider-accessible inputs and the durable draft before signing a customer quote. This endpoint's response must never be accepted as client-provided verification evidence.
- Finish the customer-facing quote/reservation/dispatch/status flow using the staged ledger adapters.
- Verify approved pricing and an actual provider charge, then run the bounded authenticated customer journey through completion/refund and download.
- Keep paid customer Higgsfield dispatch disabled and PR #125 draft until these checks pass. Existing subscriptions and prices are unchanged.
