# Vercel + Supabase setup

This repository is a release candidate; see `MVP_READINESS.md` before enabling money movement.

## Environment

Use Node 24 and pnpm 10.28.0. In Vercel set Root Directory to `Frontend`, framework Next.js, install `pnpm install --frozen-lockfile`, build `pnpm build`. Do not put the database on Vercel's temporary filesystem. Separate Preview and Production projects/secrets/provider credentials.

Copy `.env.example` to `.env.local` for local work and add the equivalent keys in Vercel. Use `APP_URL` as the exact HTTPS origin in a deployed environment. `NEXT_PUBLIC_SUPABASE_*` keys are intentionally public; `SUPABASE_SERVICE_ROLE_KEY`, document encryption/scanning credentials and payment secrets must remain server-only.

Both migrations in `supabase/migrations` were created with the Supabase CLI and have been applied to dedicated project `transwxpuwnixlggnbjj`. On a separate environment, apply them in filename order after review, using the SQL Editor or your normal migration deployment pipeline. It assumes Supabase's `auth.users`, `auth.sessions` and `storage.buckets`; it does not run against an unconfigured vanilla database. Do not apply blindly over unrelated application tables.

The public-schema write functions are `SECURITY DEFINER` **only for the server's service role**, with explicit EXECUTE revocations from PUBLIC/anon/authenticated. The server verifies identity, live session and MFA before supplying the actor. Public reads use the publishable client and RLS. Role membership comes from the database, never user-editable metadata. Keep the private schema out of the Data API's exposed schemas. Do not grant write access to authenticated/anon roles or broaden function execution grants.

## Authentication and staff

- Enable email auth, email confirmation and TOTP MFA. Configure a production SMTP sender with verified DNS and appropriate email/auth rate limits. The UI uses `signInWithOtp` and `verifyOtp(type: 'email')`.
- Customize the Magic Link email template to show the six-digit `{{ .Token }}` code. This app uses code entry, not a magic-link callback. Test new and existing users. Confirm the OTP length/expiry settings match the UI and your hosted plan's template customization rules.
- Register named staff by email through the app first. Bootstrap roles in the protected SQL Editor using the actual user IDs, for example:

```sql
insert into public.user_roles(user_id, role)
select id, 'verifier' from auth.users where email = 'REPLACE_WITH_VERIFIER_EMAIL';
```

Use separate humans/accounts for organization owner (maker), verifier (checker) and finance approver. Assign `shariah`, `admin`, `auditor` or `support` only when necessary. No UI permits self-promotion. Staff must enroll/verify TOTP before accessing records. Define recovery/offboarding procedures with Supabase account administrators; do not bypass MFA in code.

## Verification documents

The migration creates a **private** `amanah-evidence` bucket without client storage policies. Uploads go through `/api/documents`, are limited to 2 MB and PDF/PNG/JPEG signatures, scanned, then encrypted using AES-256-GCM. Downloads check ownership/reviewer RLS, log the access, decrypt server-side and force an attachment download.

Generate and store a 32-byte random key as 64 hex characters in `DOCUMENT_ENCRYPTION_KEY`. Back it up separately in your secrets system. Losing it means losing the ability to read evidence. Key rotation needs an explicit re-encryption/version migration; do not just replace this key.

`DOCUMENT_SCAN_URL` must be your approved HTTPS malware-screening service. The app POSTs binary content with `Authorization: Bearer DOCUMENT_SCAN_TOKEN`; the contract is a 2xx JSON response `{"clean":true}` only after scanning. An outage, missing configuration or any other response rejects upload. Choose the service and data-residency/processing agreement before uploading real documents. A fake always-clean scanner is not acceptable.

## Payments and reconciliation

Leave `PAYMENTS_ENABLED=false` during provisioning.

**M-PESA:** configure the Daraja consumer key/secret, shortcode and passkey. `MPESA_ENV=sandbox` uses Safaricom sandbox; `production` uses live. The current adapter is PayBill `CustomerPayBillOnline`; validate the transaction type/shortcode contract with your actual Daraja account before use. The HTTPS callback is `/api/webhooks/mpesa?token=MPESA_CALLBACK_SECRET`. Use a long randomly generated URL-safe secret; redact the full callback query in logs. Callbacks are durably stored without the raw phone, then matched to the recorded amount/phone hash/checkout and independently queried with Daraja. Keep a controlled process for lost STK initiation responses: the app will not send another prompt automatically. Escalate unresolved records using the official provider statement/query tools.

**Cards:** configure an eligible Stripe account. Register `/api/webhooks/stripe` for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded` and `charge.dispute.created`. Refund/dispute events place a risk hold for investigation; they do not assume a bank movement. Use the endpoint's signing secret. Card details never enter Amanah's forms. Webhook signatures use the raw payload and a five-minute replay window; donation/provider/event uniqueness prevents duplicate accounting. Checkout redirect is not confirmation. Delayed or expired sessions can be rechecked server-side.

`/api/reconcile` is available as an authenticated POST to MFA-verified finance users and as a cron GET with `Authorization: Bearer CRON_SECRET`. `vercel.json` schedules a daily pass compatible with the basic scheduling model. Set a more frequent schedule supported by your hosting plan after verifying current Vercel limits. Each pass is bounded to the 50 newest pending records; monitor and work the unresolved/older queue. Scale this into a durable paginated worker before larger volume.

Settlement recording is manual against the actual provider **and bank** statement. Reference values are unique, but the app cannot independently prove that an entered bank reference represents a real transfer. Finance sign-off is essential. Provider charges must be covered by operating funds before recording gross gifts as bank-settled. The release workflow records independently approved **external** transfers; it does not invoke bank or M-PESA B2C payouts.

## Hosted acceptance sequence

1. Apply migration in staging. Run Supabase security/performance advisors. Inspect grants and all RLS policies, especially public function execution and storage access.
2. Register donor A, donor B, organization owner, verifier, finance approver and Shariah reviewer. Confirm separate account data, MFA and revoked-session rejection.
3. Submit organization and screened evidence; reject/approve independently. Submit bilingual campaign with budget; reject mismatched budget and self-review. Publish it.
4. Confirm noneligible Zakat is rejected. Publish an actual reviewed policy and approve an eligible campaign.
5. Make sandbox M-PESA and card payments. Exercise replay, mismatch, cancellation, delayed success, lost callback and reconciliation. A pending payment must never produce a receipt or increase the public total.
6. Download a receipt/statement as the owner and reject access as another user. Confirm private fields never appear in anonymous/public responses.
7. Reconcile actual sandbox statements, request release, attempt self/cross-type/overdraw approvals, and complete a valid three-person release. Every journal must balance, and public totals must agree with confirmed donations.
8. Verify updates, notifications, risk holds, evidence download audit and complaint handling. Test phone widths, bilingual pages, offline fallback and installability over HTTPS.
9. Test full backup/restore including Auth, database, private Storage objects and separately held encryption keys. Configure alerts for callback failures, unresolved payments, denied privileged operations and abnormal activity. Establish retention and incident response.
10. Verify full-refund accounting and establish partial-refund/chargeback escalation policies, legal issuer information, support escalation, and independent security/Shariah/accounting approvals before enabling live donations.

## Source references

- [Supabase server-side auth](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [MFA](https://supabase.com/docs/guides/auth/auth-mfa), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
- [Stripe Checkout fulfillment](https://docs.stripe.com/checkout/fulfillment), [webhook verification](https://docs.stripe.com/webhooks), [merchant availability](https://stripe.com/global).
- [Safaricom Daraja](https://developer.safaricom.co.ke/apis).

No provider sandbox/live end-to-end run has been claimed without the appropriate project and credentials.

## Full refunds

A donor requests a full refund in Support. An administrator checks it, a different finance officer approves it, then finance performs the refund through the official provider outside the app. Only after matching the actual provider/bank statement does that approver record the unique refund reference. Funds are reserved from further disbursement while the request is pending. The app posts an immutable compensating entry, updates the receipt state and adjusts confirmed fundraising totals. This is manually reconciled; it does not execute a provider refund. Do not clear dispute flags without reconciliation.

## Current handoff

Project: https://supabase.com/dashboard/project/transwxpuwnixlggnbjj (Frankfurt). The public URL/key are already in the ignored local environment file. The connected tools do not expose the server-only service key: add it to `SUPABASE_SERVICE_ROLE_KEY` through the project API settings and Vercel/local secrets. Never paste it into a public client, commit or issue. The server remains unavailable for accounts until this is done; payments remain disabled. Hosted smoke tests ran inside a rollback transaction and left zero campaign/donation records.
