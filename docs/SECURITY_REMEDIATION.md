# AMANAH Security Remediation Tracker

Updated: 2026-11-19
Repository: `amanahoperationsdept-beep/Amanah-unilevel-system`
Working branch: `feature/amanah-pos-pricing`

## Scope and safety

This tracker is for findings from the existing live-schema audit. Migrations are review drafts until the owner explicitly approves execution against Supabase. Never replay the legacy migrations 0001–0006 against the live database. No production changes are authorized by this document.

## Critical — order item confidentiality

- [x] Confirmed from the supplied live audit: authenticated has SELECT on `public.order_items`.
- [x] Confirmed the previous SELECT policy `order_items_select_related` only required an existing parent order; it did not check the caller's relationship to the order.
- [x] Drafted forward migration `supabase/migrations/0008_restrict_order_items_select.sql`.
- [x] Added migration preflight/postconditions and read-only verification SQL.
- [x] Disposable PostgreSQL 17 CI passed in run 44384060262 (PR #28): tests covered buyer, fulfillment, downline, unrelated member, administrator, empty authenticated identity, anon SELECT grant denial, and fail-closed migration/rollback behavior.
- [ ] Obtain a fresh live read-only schema/policy snapshot before any migration review.
- [ ] Obtain explicit approval for the live migration.
- [ ] Apply the approved migration to the intended Supabase project and verify policy/grants.
- [ ] Perform a controlled read-only access test; record evidence without exposing member/order details.

The draft policy preserves the audited order visibility categories: buyer, assigned fulfillment user, buyer's downline, and administrator. It scopes order item access through the parent order. CI tests ran only against a synthetic disposable PostgreSQL fixture; they do not establish live Supabase policy state or integration behavior. The migration remains unapplied and approval-gated.

## High — activation registration/schema mismatch

- [ ] Refresh live activation-code table columns, constraints, policies, and Auth trigger definition.
- [ ] Reconcile the current application registration/issuance actions against the live contract.
- [ ] Verify the Auth trigger's profile and wallet behavior and make activation completion idempotent.
- [ ] Test role assignment, code expiry, reservation leases, unique usernames/member codes, duplicate-code rejection, and ambiguous network outcomes in a disposable database.
- [ ] Preserve existing administrator and distributor Auth UUIDs, profiles, roles, active state, and history.
- [ ] Approve and apply a reviewed migration only after disposable testing.

## High — account recovery and legacy account usernames

- [ ] Design owner-verified username assignment for the two existing active accounts; no identity recreation or credential reset.
- [ ] Establish secure recovery for accounts using non-deliverable `.invalid` email aliases.
- [ ] Confirm a tested recovery channel and operational support procedure before activation registration is enabled.

## High — least privilege and financial safeguards

- [ ] Review broad anon/authenticated table grants against every RLS policy and required app operation.
- [ ] Review postgres-owned default privileges on public tables/functions/sequences.
- [ ] Review SECURITY DEFINER function ACLs, trigger-only functions, and admin RPC authorization.
- [ ] Review profile update grants/policy to ensure self-service cannot modify privileged fields.
- [ ] Verify order and commission status transitions, trigger idempotency, and payment-verification boundaries.
- [ ] Implement immutable wallet ledger, withdrawal approval/release workflow, and reversal safeguards before payout use.

## Safe code changes already made (2026-11-19)

- Commit `19436ba499bc5756d21f2ea2f572ca2c1269b3e2`: exact normalized username lookup replaces SQL pattern matching in sign-in.
- Commit `401c8cb229a751dfaf24e8ba0d4d85052ef85991`: removes unused landing-page import/variable.
- Commit `d078bc20817f6fd06f549e9b476f498bc899517b`: removes ESLint config export warning.
- Commit `8c4d0c01060d0cc7e0d60382829b912a92822133`: adds the order-item SELECT policy remediation draft. It does not modify the live database.
- Commit `218a828a6e81a0835f750f031261c6fefca12ac5` plus fix `ef2173e4c8fd6a5291e0fbfbc3225b04d7fec696`: adds guarded workspace shells for Marketing Officer, Branch Operator, and Mobile Stockist roles, so those login routes no longer land on missing pages. The shells explicitly state that operational modules are not enabled; no transaction features were added.

## Validation record

- [x] `npm run lint` — passed, 0 errors; one existing `<img>` optimization warning in `src/components/ProductCatalog.tsx`.
- [x] `npm run typecheck` — passed.
- [x] `npm run build` — passed on commit `d078bc20817f6fd06f549e9b476f498bc899517b`.
- [x] Preview deployment for commit `ef2173e4c8fd6a5291e0fbfbc3225b04d7fec696` — READY (https://amanah-unilevel-system-l5ivrdqvd-amanah15.vercel.app). This deployment includes the guarded workspace shells and earlier security draft. The subsequent workflow documentation-only commit has a separate Preview pending.
- [ ] Disposable PostgreSQL migration validation — not available in the current sandbox.
- [ ] Live database migration or functional registration test — not authorized; not performed.


### Order-item policy review update (2026-11-19)
- Commit `01f6fe4877ccec304be58962db3ffbfab1cb7aa5`: adds fail-closed migration preflight and postcondition checks to migration 0008.
- Commit `384b3ce53bead709f2a63fdf0b1a9ddf55b39bb4`: adds read-only verification queries for the parent/child RLS policies, grants, helper functions, and expected predicates.
- The policy was checked against the recorded audit, not a fresh live snapshot. It remains a draft and has not been run in PostgreSQL or Supabase. Live migration remains approval-gated.
