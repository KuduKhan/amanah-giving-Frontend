# Amanah Giving — version 1 readiness

## Verdict

The starting application was a visual prototype, **not the blueprint's MVP**. Authentication, payments, verification and accounting were simulated in the browser. This change implements a Vercel + hosted Supabase/PostgreSQL release candidate. **It is not approved to accept real donations yet.** Hosted services must be connected and the acceptance checks below must pass.

Scope is the 22 items in section 38 of `Islamic_Charity_WebApp_Full_Blueprint.pdf`, pages 20–21. Sections 39–40 explicitly defer the larger feature set. The supplied document is a product specification, not an instruction to bypass payment or release controls.

## MVP traceability

| Blueprint requirement | Implementation | Remaining live acceptance |
|---|---|---|
| 1. Authentication | Supabase email OTP, persistent SSR session, server user validation, active-session check, logout | Connect project, SMTP, OTP template; test delivery, expiry, revocation and rate limits |
| 2. Donor profiles | Persisted name, language and independent marketing consent; private account | Exercise with two hosted accounts |
| 3. Verified organizations | Registration queue, screened encrypted evidence, independent review, public verification summary | Real registration, officer identity and recipient ownership checks |
| 4. Campaigns | Organization-owned submissions, bilingual story, deadline, goal, exact budget, review/publish/suspend | Populate and independently approve real campaigns |
| 5. Categories | Food, Water, Orphans, Mosque, Education, Emergency, Health; token search/location | Content review in English and Kiswahili |
| 6. Sadaqah | Immutable SADAQAH giving type, campaign allocation and separate fund ledger | Sandbox payments |
| 7. Zakat separation | Qualified reviewer role, append-only policy versions, campaign eligibility, immutable policy reference; separate fund accounts | Qualified Shariah review and publication of actual policy |
| 8. M-PESA | Official Daraja STK adapter, durable callback inbox, secret callback URL, amount/phone/checkout binding, server STK query | Approved Daraja sandbox/live application, shortcode and callback testing |
| 9. Cards | Stripe-hosted Checkout, request idempotency, signed webhooks, server reconciliation | Eligible Stripe merchant account and sandbox acceptance; confirm availability for the operating legal entity |
| 10. Receipts | Owner-only confirmed receipts, masked provider reference, print/save PDF and complete CSV statement | Confirm receipt wording/legal issuer with operator |
| 11. Anonymous gifts | Default private identity, no public donor payment endpoint, private dedication | Privacy review of public content |
| 12. Donor dashboard | Database-derived lifetime summary, recent records, saved causes, payment status, receipt links | Hosted read-isolation and pagination/load testing |
| 13. Campaign updates | Bilingual, organization-authored updates with independent publication review | Actual evidence review process |
| 14. Verification workflow | Organization/campaign/Zakat/update queues; no self-approval; auditable decisions | Trained independent staff and scanner integration |
| 15. Admin dashboard | Role-gated review, suspension, support, risk flags and audit screens | Bootstrap named staff roles, MFA and access review |
| 16. Restricted ledger | Integer minor units; immutable two-line double-entry journals balanced per campaign/type; receivable, bank and restricted liability | Accountant sign-off, opening-balance/statement controls and backup restore drill |
| 17. Disbursements | Settled-fund reservation, independent maker/checker/approver, external transfer reference, no double spend or duplicate release | Real bank transfer executed separately by authorized finance staff; payee verification |
| 18. Audit trail | Append-only decisions, payment events, journal and audit records; document access logging | Configure log retention, monitoring and access reviews |
| 19. Notifications | Persisted bilingual in-app payment, review, update and release notices, mark-read | Optional transactional email/SMS/push delivery is not wired; OTP email uses Supabase |
| 20. English + Kiswahili | Donor journey, forms and major navigation translated; bilingual campaign/update content required | Native-language review; internal status codes and some operational/error messages remain English |
| 21. Mobile/PWA | Responsive preserved brand, mobile navigation, manifest and offline fallback; no caching of financial/private data | Installation and device checks on deployed HTTPS origin |
| 22. Fraud/security controls | RLS on all exposed tables, no client writes or financial RPC access, service key on server only, CSRF origin checks, durable rate limits, MFA for staff, active sessions, signed callbacks, high-value flags, private encrypted/scanned documents | Independent security review, auth abuse/CAPTCHA configuration, monitoring, backup/PITR and incident response |

## Financial behavior

- No sample campaign totals or fictional receipts are seeded. The original design prototype is archived in `docs/archive/HomePrototype.tsx.txt`; the old Phase II UI components are unconnected prototypes.
- A pending payment is **not** a donation receipt. Browser redirects and button clicks cannot post ledger entries.
- Verified payment: debit provider receivable, credit the campaign/type restricted liability.
- Reconciled settlement: debit bank, credit provider receivable. The app allocates the full gift to the cause. Finance must fund processing costs from operating money and reconcile the gross amount; do not record a net settlement as gross cash. Complex fee/FX/partial settlement accounting is not implemented.
- Release: reserve only settled, unreserved funds of the same campaign/type. Three different people request/check/approve. Recording a completed external transfer debits the restricted liability and credits bank.
- High-value gifts (KSh 250,000 or more) create a risk hold on that campaign's releases until an administrator records a resolution.
- Journal records cannot be edited, deleted, extended later, or balanced across different funds. Corrections must be designed as explicit compensating entries, never SQL edits to history.
- Full refunds have a donor request, independent admin check, finance approval and externally reconciled refund reference. The amount is reserved, an immutable reversal journal is posted, the gift is marked refunded and public totals are adjusted. Stripe refund/dispute events create risk holds for investigation. Partial refunds, chargeback fees and automatic provider refund execution are not supported; establish escalation and do not clear a discrepancy until actual balances are reconciled.

## Hosted launch gates (not completed in this task)

1. DONE: created dedicated Amanah Giving Supabase project `transwxpuwnixlggnbjj` in the approved organization, Frankfurt region, at the quoted $0/month creation cost. The unrelated project was not modified. A Vercel deployment is still not configured.
2. DONE: applied both migrations and ran a hosted rollback-only organization → campaign → payment → settlement → three-person release smoke test. No fixture users, campaigns or donations were retained. Supabase security advisors report no findings. All 21 public tables have RLS; client financial RPC access is denied. Local tests execute PostgreSQL through PGlite; hosted Auth, Storage/scanning and provider end-to-end acceptance still remain.
3. Configure SMTP/OTP, secrets, private storage, the approved malware scanner, monitoring, backups and access to encryption keys. No real personal documents should be uploaded before these controls are approved.
4. Confirm the card provider is available to the operating legal entity. The Stripe adapter cannot make an ineligible merchant account usable.
5. Complete provider sandbox checks, including callbacks arriving before initiation response, repeated callbacks, cancellation, timeout, lost webhook, amount mismatch, delayed success, provider outage and statement reconciliation. Daraja callbacks do not have a Stripe-style signature; the secret URL alone is insufficient and is supplemented by STK query plus bound metadata.
6. Complete security, legal/privacy, Shariah and accounting sign-off; supply the legal issuer/support information, donor communications and retention policy. Exercise full refunds and establish dispute escalation before enabling live payments.
7. Set `PAYMENTS_ENABLED=true` only after all gates pass. The dedicated hosted database was created with explicit approval; no Vercel deployment, live charge or transfer was made.

## Verification evidence

- `pnpm test`: 13 database workflow/RLS and payment-validation tests. Tests reject mismatched callbacks, unbalanced journals, cross-fund spending, duplicate posting, direct client writes and self-approval.
- `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`: quality/build checks.
- Browser verification: phone and desktop layout, language switch, empty/error states, navigation, modal behavior and absence of framework error overlays. Screenshots are local under ignored `outputs/`. Checkout layout uses explicitly marked browser-only fixtures; it is not a real provider payment test.

## Phase II handoff

Keep Phase II behind separate feature flags and migrations. Do not switch the archived controls back on.

1. Configurable/time-stamped nisab and versioned calculator rules; private calculation history.
2. Recurring plans with actual provider mandates, cancellation and missed-payment handling (M-PESA STK alone is not an automatic debit mandate).
3. Private beneficiary applications, case assignments and field verification; child safeguarding and fine-grained document access.
4. Orphan sponsorship, food/Qur'an/water packages, mosque profiles, milestone/evidence models and verified impact aggregates.
5. Giving circles with member privacy, shared targets and allocation rules.
6. Ramadan/last-ten-night/Jumu'ah automation and scheduled notification workers.
7. Qurbani, Fidyah/Kaffarah and other immutable giving categories, each with reviewed policy/eligibility/accounting rules.
8. Arabic/RTL expansion and comprehensive translation coverage for operational error/status messages.

Before beginning these, finish all live gates above. Extend full-refund accounting to partial refunds, provider fees and complex dispute reversals as volume requires. Keep payment confirmation, accounting and notifications transactionally coupled. Add tests for each new giving type and each authorization boundary.

## Provisioned project

[Supabase dashboard](https://supabase.com/dashboard/project/transwxpuwnixlggnbjj) · project `transwxpuwnixlggnbjj` · `eu-central-1`. Public connection values are in ignored `.env.local`; the server-only service key still needs to be supplied through a secrets channel. Local document/cron/callback secrets were generated without printing them. Back up those secrets before use. Supabase performance advisors currently report only [unused indexes](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index), expected on a new empty database; no missing-index warnings remain.
