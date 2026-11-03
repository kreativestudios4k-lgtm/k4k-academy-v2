# Generation release gate — 2026-11-02

This adapter is preparation, not an enabled end-to-end generator. No API route imports it.

Read-only inspection of the Academy database found:
- `k4k_studio_pilot_job_start` inserts jobs with zero credits reserved.
- `k4k_studio_pilot_job_finish` is executable by authenticated users and accepts a user-supplied successful outcome and HTTPS output URL for their own processing jobs. This cannot be the source of truth for paid completion.
- Job policies allow own-row reads and draft inserts, but no authenticated UPDATE. The old pilot's direct draft completion update can therefore fail.

Before enabling a route:
1. Introduce server-authoritative job submission/completion and atomic credit reserve/settle/refund, with ownership checks and a unique per-user request key. Do not apply this to live student data without an explicitly reviewed rollout.
2. Persist the local job before submission, then persist the provider handle immediately. Reconcile ambiguous timeouts with the SAME idempotency key and payload; never automatically refund or create a new paid request on a timeout.
3. Resolve media from owned storage records or approved templates. Inspect duration server-side; passing a browser duration to motionInput is not sufficient. Approved storage origins alone do not establish ownership.
4. Enforce per-user concurrency and provider cost ceilings server-side, validate account model access, and connect UI uploads/status/history to the protected routes.
5. Copy completed outputs to owned storage for retention, and verify provider outcomes before settlement. Implement terminal failure handling and bounded polling/backoff.
6. Run authenticated integration tests including duplicate requests, concurrent reservation, cross-user job access, unknown outcomes and failed jobs before a billable smoke test.

The adapter supports documented Genjutsu motion transfer, 1–8 image references, 4–30 second inputs and fixed 720p output. Product prompt limit is 1800 characters. It sends idempotency keys and rejects off-origin status polling/redirects. It has no live credentials and unit tests use fake transport responses only.

Sources:
- https://docs.higgsfield.ai/docs/models/genjutsu/motion-transfer
- https://docs.higgsfield.ai/docs/concepts/requests
- https://docs.higgsfield.ai/docs/concepts/errors
