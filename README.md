# Amanah Giving

Vercel + Supabase/PostgreSQL implementation of the blueprint's first-version scope. The original visual prototype is archived under `docs/archive`.

**Status: release candidate, not activated for real donations.** Accounts, bilingual donor/organization workflows, independently reviewed campaigns, private encrypted evidence, server payment adapters, receipts, restricted double-entry accounting, settlement/disbursement/refund controls, notifications and PWA support are implemented. Hosted configuration and acceptance testing are still required.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Without configuration, the site presents an empty catalog and disables accounts/payments. It does not invent campaigns, donations or receipts. Copy `.env.example` to `.env.local` and follow [deployment setup](docs/DEPLOYMENT.md).

```sh
pnpm test
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

- [MVP requirement matrix and launch gates](docs/MVP_READINESS.md)
- [Vercel/Supabase setup and hosted acceptance](docs/DEPLOYMENT.md)
- [Database migration](supabase/migrations/20260912212940_amanah_mvp.sql)

`PAYMENTS_ENABLED` defaults to false. Hosted card/M-PESA sandbox tests, verified operating records, independent security/accounting/Shariah review and deployment configuration must precede activation. The app records externally reconciled bank transfers and full refunds; it does not initiate bank payouts. Advanced Phase II features remain deferred.
