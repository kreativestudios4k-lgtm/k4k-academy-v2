# K4K APP generation launch gates (Preview only)

Generation is disabled by default. Do not enable real provider submissions or live billing until every gate is independently verified.

## Verified in code / read-only database checks
- Preview branch build is READY at commit 1ea942a2.
- The database settlement function enforces `p_user/p_job.mp4` exact output paths.
- Anonymous and authenticated roles cannot directly execute the settlement RPC.
- Simulated reserve, submit, private MP4 verification, settlement, and one-time refund tests exist.
- Signed internal event bridge rejects tampering and replay when supplied with a working persistent nonce claim implementation.
- Authenticated download endpoint requires job ownership and returns a short-lived private signed URL.

## Blocking / not yet verified
- Provider-originated Higgsfield callback signature contract or authenticated polling integration. Internal HMAC is NOT provider authentication.
- A durable atomic nonce-claim store shared by all server instances; in-memory replay tracking is test-only.
- Real provider-status adapter and secure provider output ingestion into the private bucket.
- An actual private MP4 upload and download in a disposable test job.
- Rollback-only transactional settlement and refund tests against isolated synthetic database records.
- Customer signup → quote → reservation → generation → delivery in Preview with real browser/mobile checks.
- Final provider cost and customer credit pricing approval.

## Rules
- No live Stripe changes, no merge to main, no production deployment.
- No billable provider requests without explicit approval.
- Never alter existing subscriber, credit, or Academy data for testing.
- Never expose service-role credentials or provider secrets in browser code.
- Keep the generation feature off until all gates pass.
