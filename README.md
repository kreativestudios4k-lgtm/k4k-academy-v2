# K4K Academy

Production Next.js 16 membership site for KreativeStudios4K at https://kreativestudios4k.com.

## Customer journey

1. Customer purchases the £7.99/month membership via the existing Stripe payment link.
2. Stripe redirects to `/login?checkout=success`.
3. Member signs in using the checkout email (secure email link, Google or password).
4. Supabase verifies an active paid membership claim before allowing private access.
5. Active members open Workflow 01 and new workflow releases, copy prompts, and save completion progress.

**Important:** The Academy no longer offers session bookings. Do not reintroduce booking/calendar/Meet flows. Do not change K4K Heritage in this repository.

## Key routes

- `/`: public membership page and short AI video preview.
- `/login`: member authentication and account recovery guidance.
- `/academy`: private dashboard, progress, lessons and support.
- `/academy/workflows/viral-character-swap`: Workflow 01.
- `/academy/workflows/puskas-character-swap`: Workflow 02 (release-gated).
- `/prompts`: copy-ready prompt templates.
- `/mentor`: optional AI instructor and voice.
- `/admin`: restricted owner metrics.
- `/privacy`, `/terms`: public policy information.

## Services

- Vercel hosts Next.js and the AI Gateway.
- Supabase handles authentication, membership claims, access policies and progress.
- Stripe processes subscriptions and provides a hosted customer billing portal.
- Video reference assets are hosted separately.

## Deployment

Install with `npm install` and run `npm run build` before merging changes. Production deployments are connected to the main GitHub branch. Verify the latest Vercel deployment is READY and inspect runtime errors after release.

## Operational requirements

- The Supabase `stripe-academy-webhook` Edge Function needs a valid `STRIPE_WEBHOOK_SECRET` stored **only in Supabase Edge Function Secrets**. Never commit it to Git.
- The Stripe webhook endpoint must deliver checkout, invoice and subscription events successfully; failed events should be retried after fixing configuration.
- The Supabase `claim-academy-membership` function requires verified email ownership and a valid paid subscription claim.
- Vercel AI Gateway requires a verified billing method before premium AI text/voice features can operate. Core lesson access should not depend on AI Gateway.
- The welcome voice is manual/optional so unavailable AI services cannot trigger repeated automatic failures.
- The billing portal allows members to view invoices, update payment methods and cancel at the end of the current period.
- Enable Supabase leaked-password protection in Auth security settings when available.
- Review and customise the public privacy/terms pages with the business's verified legal details before relying on them as final legal notices.

## Safe maintenance

Never hardcode Stripe, Supabase or AI provider secrets. Never grant access from unverified emails or unpaid sessions. For reconciliation, validate payment status, known payment link, subscription status and price in Stripe before creating subscription claims. Preserve user data and do not touch unrelated products.
