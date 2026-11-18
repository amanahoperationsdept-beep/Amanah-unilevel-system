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
- [ ] Review the draft against the current live policy and helper functions.
- [ ] Execute in a disposable/test database and verify behavior for buyer, fulfillment user, downline, unrelated member, administrator, and anonymous role.
- [ ] Obtain explicit approval for the live migration.
- [ ] Apply the approved migration to the intended Supabase project and verify the policy/grants.
- [ ] Perform a controlled read-only access test; record evidence without exposing member/order details.

Draft policy preserves the previously audited order visibility categories: buyer, assigned fulfillment user, buyer's downline, and administrator. It scopes order item access through the parent order. It is intentionally not applied.

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

## Validation record

- [x] `npm run lint` — passed, 0 errors; one existing `<img>` optimization warning in `src/components/ProductCatalog.tsx`.
- [x] `npm run typecheck` — passed.
- [x] `npm run build` — passed on commit `d078bc20817f6fd06f549e9b476f498bc899517b`.
- [ ] Preview deployment for the latest commit (migration draft) — pending.
- [ ] Disposable PostgreSQL migration validation — not available in the current sandbox.
- [ ] Live database migration or functional registration test — not authorized; not performed.
