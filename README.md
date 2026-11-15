# Amanah Giving - Deployable Web App

This is the deployable Amanah Giving application built from the product blueprint.

## Run locally

```bash
pnpm install
pnpm dev
```

## Production build

```bash
pnpm build
```

The app includes campaign discovery, saved causes, donation checkout, Zakat calculation, receipts, impact tracking, bilingual copy, and mobile navigation. Its full Platform Console covers the six coordinated products in the blueprint: donor, beneficiary, organization, admin, finance, and Shariah governance. It also demonstrates recurring giving, sponsorship, packages, giving circles, corporate giving, private assistance, verification levels, anti-fraud controls, restricted-fund accounting, notifications, privacy, and policy governance.

The Kenya giving pilot at `/pilot` connects sample M-PESA payment attempts, restricted funds, receipt downloads, staff decisions and reviewed evidence. Start a gift, then use Donor to confirm it, Finance to demonstrate duplicate reconciliation, Admin to approve the release, Finance to record the release, Organization to submit evidence and Admin to publish the update. Admin and Finance use the displayed sample code. The separate `/pilot/transparency` page reads aggregate totals from the same browser. Amanah Hajj keeps its sponsorship records separate.

Pilot records and the role check are browser simulations. A production pilot requires authorized partner records, a server-side ledger and receipt store, authenticated staff roles, and approved provider credentials. Use the [Safaricom Daraja sandbox](https://developer.safaricom.co.ke/) to verify real provider requests and status handling before connecting live payments. Use fictional information in the current demo.

The premium interaction pass adds Arabic/RTL groundwork, accessible keyboard shortcuts, a notification center, seasonal and scheduled giving, dedication and on-behalf gifts, bank transfer states, optional platform-tip transparency, richer campaign disbursement evidence, an expanded donor statement, and reduced-motion support.
