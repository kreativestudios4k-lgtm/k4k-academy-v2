# K4K APP video pipeline

Target: Next.js interface -> authenticated API -> Supabase PostgreSQL jobs -> background worker -> AI provider -> optional FFmpeg/Remotion worker -> private Supabase Storage -> customer downloads.

Use Supabase Storage initially; Cloudflare R2 or AWS S3 can be added later. Video assembly must run outside the web request.

## Implementation order

1. Audit existing database tables, RLS, media buckets, routes and open pull requests.
2. Build owner-checked job status and history endpoints.
3. Implement atomic credit reservation, job creation and idempotency.
4. Add worker leases, bounded retries and a mock AI provider.
5. Integrate provider behind a disabled paid-generation gate.
6. Add private output storage, signed downloads and optional video assembly.
7. Validate Stripe test-mode billing and existing subscriber continuity.
8. Run concurrency, access-control, worker recovery, mobile and end-to-end preview tests.

## Safety requirements

Never trust browser-provided user IDs, credit amounts or media ownership. Validate access server-side. Do not automatically repeat an AI provider request if its submission outcome is unknown. Track job states and reconcile ambiguous outcomes. Use a global generation kill switch and server-side spending limits. Preserve existing student access and live billing. Keep all work in preview until verified.

This document is a design plan, not evidence of a working integration.
