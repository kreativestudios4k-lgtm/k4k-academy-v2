# K4K APP — Release and Production Safety Playbook

## Customer product (real billing only)
- K4K Motion accepts **4–30-second MP4 source clips** and uses the Higgsfield Genjutsu Motion Transfer API.
- Ten rights-cleared K4K Originals are available through **Recreate**. Customer media is private and verified server-side before any signed quote.
- K4K displays an immediate **estimated credit cost**, followed by the exact, signed **Confirm & Generate** price. Never debit credits on upload or quote.
- The production budget deliberately allows 30-second **480p** submissions (at current published rates, USD 4.62, approximately 47 credits) only when `K4K_GENERATION_MAX_USD >= 4.62` and no other safeguards block the job. The maximum must remain at most USD 5 until a new pricing/risk review.
- 720p stays capped at 13 seconds with its current USD 4.50 quality limit; 1080p stays restricted by the USD 2.10 limit. The UI reports quality-specific limits, instead of displaying a nonfunctional option.
- Long videos are not automatically shortened. Provider cost may exceed the customer's balance and remains subject to global daily/total budgets.
- **Never** disable provider moderation, per-user active-job limits, idempotent reserve, signed quote verification, private output storage or refund-on-confirmed-failure safeguards to enable a longer clip.
- Do not use customer subscriptions/credits for owner QA. Never submit a live provider generation as a build or health check.

## The coding/deployment ecosystem
1. Work on a **feature branch**, not directly on main.
2. Run `npm ci`, `npm run doctor` and `npm run check` while coding. `npm run doctor` prints specific causes for source/catalogue/credit policy drift.
3. Open a pull request. **K4K Quality Gate** executes doctor, full regression tests, release safety checks and a Next.js build using Node 24 and placeholder-only (non-production) credentials.
4. Create a **Vercel preview deployment** of that exact head SHA and confirm status is **READY**. A green GitHub check alone is not a visual browser test: inspect desktop/mobile layout, login flow and Recreate/Generate/Library navigation.
5. Only after both checks pass, squash-merge to `main`. The production deployment must also be **READY** before announcing a release.
6. Run `npm run smoke:live` or the scheduled **K4K Production Route Watch** to check the main public routes. This uses GET requests only; it does not trigger a generation or access private accounts.
7. If a build fails: read the failing GitHub Actions step and Vercel build log, fix it on the feature branch, and rebuild. **Do not merge** a failing preview or force a production promotion.
8. If an incident occurs after deploy: the last ready deployment should remain the active route until the new one is ready; if necessary perform a reviewed Vercel rollback, then reconcile billing and in-flight jobs before any retry. Do not blindly retry a timed-out provider submission.
9. The production smoke workflow runs every six hours, creates only one open GitHub issue for an outage, and closes it once checks recover. Existing database monitoring continues independently.

## One-time repository admin protection
In GitHub **Settings → Branches / Rulesets**, protect `main`, require pull requests and mark the **Doctor / Regression tests / Next build** check as **required**. This administrative setting is necessary to _enforce_ the workflow at merge time; a checked-in workflow alone does not prevent someone with direct main-write access from skipping it.

## Environment and operational guards
- Vercel production uses `K4K_GENERATION_MAX_USD=5` for 30-second 480p eligibility. Preview/test flags do not enable production routes.
- Keep `K4K_PROVIDER_TOTAL_BUDGET_USD`, daily cap, signed quote secrets and rate-card approvals unchanged except through a separately reviewed financial decision.
- Confirm each new model's official endpoint, rate and actual output-delivery path before enabling customer checkout. Never use fake quote numbers to unlock models.
- CI and production smoke checks may prevent known regressions and report failures; they **cannot guarantee zero Vercel failures** or automatically fix every runtime/provider issue. Automatic paid retries remain disabled.

## Diagnose locally
```bash
npm ci
npm run doctor
npm run check
npm run build
npm run smoke:live
```
