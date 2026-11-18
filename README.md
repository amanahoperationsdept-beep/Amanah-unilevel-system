# AMANAH DMC — Unilevel Network Management

AMANAH is an existing Next.js network-management application under active development. This repository is the source of truth for the application code and reviewed SQL drafts.

## Current application experience

- Public AMANAH landing page and responsive product catalog.
- Supabase email/password sign-in, accepting an email address or username.
- Server-guarded Administrator and Distributor workspaces.
- Server-guarded workspace shells for Marketing Officer, Branch Operator, and Mobile Stockist roles.
- Admin-only activation-code issuance UI.
- Activation-code registration UI for full name, phone (optional), username, and password; the role/member code are intended to be assigned server-side.
- Password recovery routes that currently depend on deliverable email.
- Clearly labelled sample dashboard preview; figures are illustrative, not live records.
- Next.js App Router, TypeScript, Tailwind CSS, Supabase SSR.

> **Important:** Source-level registration and activation code workflows are not yet compatible/verified against the audited live Supabase schema. Live activation RPCs/migration contract require reconciliation and disposable database testing. The operational role workspace shells are access-guarded but do not provide live stock, payment, sales, commission, or payout operations. Do not use sample figures or these shells for business decisions.

## Development

1. Install Node.js 20 or later.
2. Install dependencies: `npm install`.
3. Copy `.env.example` to `.env.local` and add the Supabase project URL and anon key.
4. Start the app: `npm run dev`.
5. Open `http://localhost:3000`.

Validation scripts:

- `npm run lint`
- `npm run typecheck`
- `npm run build`

## Environment variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL` — canonical application origin used for email-confirmation and recovery redirects.
- `SUPABASE_SERVICE_ROLE_KEY` — server-only credential for trusted operations; never expose it to browser code.
- `RESEND_API_KEY` and `RESEND_FROM_EMAIL` — server-only email delivery settings.

See [authentication setup](docs/AUTHENTICATION_SETUP.md), [activation/member-code workflow](docs/AMANAH_MEMBER_CODE_ACTIVATION.md), and [security remediation tracker](docs/SECURITY_REMEDIATION.md).

## Planned system modules

- Member directory, profile maintenance, sponsor genealogy, account activation/deactivation, and role/permission controls.
- Product catalog administration and server-calculated role pricing.
- POS checkout, destination validation, payment verification, and immutable order/PV snapshots.
- Digital stock locations, reservations, transfers, receipt confirmation, and scoped finance approval.
- Qualification/PV rules and unilevel commission computation.
- Commission approval, immutable wallet ledger, withdrawal/payout safeguards, reversals, and audit logs.
- Operational dashboards and verified reports.

## Compensation model — draft

The current planning model uses 1 PV = ₱1, up to 10 upline generations, and differential commissions based on qualified rank rates. Rank thresholds and rates remain draft settings and must be reviewed for financial sustainability and Philippine direct-selling compliance before launch.

Commissions must be tied to verified eligible product sales, not recruitment fees. Replacement policy and any reversals must be reflected in PV and commission accounting according to the approved business rules.

## Database and deployment status

The live Supabase database has been audited and documented as the operational baseline, but the repository migrations 0001–0006 are not a verified replayable history for that live schema. Migration 0007 is a forward-only activation-code lifecycle draft; migration 0008 is a forward-only order-item SELECT policy remediation draft. Neither has been applied to Supabase. Do not replay migrations 0001–0006 or apply drafts to the live database without an approved review, backup, and disposable-database validation.

GitHub Actions is the project's automated validation system. CI runs lint, type-check, build, and disposable PostgreSQL tests; it does not deploy. Hosting and deployment are not part of routine validation and require separate explicit approval.

## Security principles

- Authentication and role checks run server-side; a selected portal is never treated as proof of authorization.
- Supabase Row Level Security protects member and financial records, but every policy/grant/function must be audited.
- Never expose the Supabase service-role key in client-side code.
- Require audit trails, idempotent posting, and approval controls for financial actions.
- Preserve existing Auth identities, profiles, relationships, and operational history.
- No real payouts, production data changes, live schema migrations, PR merge, or production deployment without explicit authorization and testing.
