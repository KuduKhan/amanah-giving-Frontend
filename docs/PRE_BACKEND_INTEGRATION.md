# Amanah Giving — Pre-backend workflow integration contract

## Status
The Operations Studio in the six-role Platform Console is an **illustrative, session-only prototype**.
All campaigns, case metadata, gift entries, balances, approvals and financial movements are fictional.
It performs no network requests, payments, beneficiary identification, verification, bookkeeping,
disbursement, religious ruling or financial custody. Refreshing the page resets the data.

## UI → service → backend seam
- \`app/workflows/workflowDomain.ts\` defines \`WorkflowGateway\`, \`WorkflowCommand\` and \`WorkflowSnapshot\`.
- \`createMemoryWorkflowGateway()\` is the current replaceable, in-memory adapter.
- \`app/workflows/WorkflowStudio.tsx\` presents role-oriented forms and renders returned snapshots.
- The future **authenticated backend adapter** must implement the same service responsibilities,
  but its source of truth will be the server, not a client-supplied snapshot or user-selected role.
- Backend authorizations **must not** trust any \`role\`, \`amountKes\`, eligibility decision,
  beneficiary status, or ledger balance supplied by this frontend.

## Minimum backend domain boundaries
1. **Identity and access:** server sessions, least-privilege role assignments, tenant/organization
   boundaries, reviewer permissions, step-up confirmation for high-risk operations.
2. **Campaigns:** draft versions, registered organization owner, budget lines, evidence review,
   verification decision, eligibility policy version, expiry and publication controls.
3. **Giving:** server-owned donation intents, payment gateway callbacks and signatures,
   idempotency keys, reconciliation, refunds and chargeback state; no client-declared success.
4. **Restricted funds:** integer KSh minor currency units or fixed-decimal accounting,
   double-entry records, fund restriction and beneficiary allocation, atomic balance checks,
   approvals separated by maker/checker/releaser, immutable audit records.
5. **Assistance cases:** private encrypted records, consent, secure upload, authorized
   verifiers, redacted views, retention and deletion controls. The current prototype stores
   no personally identifying information and intentionally accepts no attachments.
6. **Zakat/Shariah:** versioned eligibility rules and independent reviewer attestation,
   never implied automatically from cause category or a frontend checkbox.
7. **Evidence:** verified uploads, immutable provenance and privacy-safe public summaries,
   distinguishing a campaign's submitted documents from independently verified outcomes.

## Endpoint responsibilities (contract sketch; NOT implemented)
- \`GET /me\`: authenticated identity, authorized roles and organization scope.
- \`GET/POST /campaigns\`: paginated discovery, creation, validation and draft lifecycle.
- \`POST /campaigns/{id}/review\`: reviewer decision, policy version and audit event.
- \`POST /campaigns/{id}/shariah-assessments\`: independent eligibility attestation.
- \`POST /giving-intents\`: idempotent transaction initiation, not a client receipt.
- \`GET /giving-intents/{id}\`: payment state from provider-confirmed records.
- \`POST /cases\`: authenticated confidential case submission.
- \`POST /cases/{id}/reviews\`: protected case management transition.
- \`POST /disbursement-requests\`: request subject to double-entry and role-separated approval.
- \`GET /funds/{fundType}/summary\`: restricted totals, reconciliation and redacted public views.
- \`GET /audit\`: tamper-evident authorized audit history.

No endpoint above exists in the current frontend; do not deploy client-facing URLs
without authentication, authorization, validation, audit, and payment-provider integration.

## Acceptance before real users or real funds
- Show **Demo** unmistakably in all preview workspaces; do not imply a simulated receipt is real.
- Validate every domain transition in backend code, even if already validated in the UI.
- Keep Sadaqah and Zakat segregated and disallow overspending and early approvals.
- Never store beneficiary names, phone numbers, identity documents or medical narratives
  in localStorage, telemetry, URL query parameters, or public rendering.
- Test guest, signed-in donor, beneficiary, organization officer, admin, finance and Shariah
  permission boundaries using independently authenticated accounts.
- Implement privacy reviews and compliance with applicable Kenya law before collecting PII.
- Verify M-PESA payment states, duplicate callbacks, reversal/retry paths and reconciliation.
- Run responsive, keyboard, assistive-technology and real-phone acceptance on each workflow.
