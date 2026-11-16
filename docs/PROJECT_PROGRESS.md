# AMANAH Unilevel System — Project Progress & Handoff

Last updated: 2026-11-16
Repository: amanahoperationsdept-beep/Amanah-unilevel-system
Working branch: feature/amanah-pos-pricing
PR: #1 (open, draft, unmerged)
Production URL: https://amanah-unilevel-system.vercel.app
Supabase project ref: bqgxvnrgjmngezknqhsl

## Source-of-truth and backup policy

- GitHub is the source of truth for application code, SQL migrations, audit scripts, technical decisions, and project progress notes.
- Supabase stores live application data and the deployed database schema/functions/policies. It is not a backup for frontend/backend source code.
- Every reviewed code change should be committed and pushed to the existing working branch. Keep migrations and read-only SQL audit scripts in the repository.
- Never put passwords, API keys, service-role keys, access tokens, private member data, or other secrets in GitHub, SQL scripts, issues, or this document.
- Do not apply a migration or change live Supabase data/schema without explicit user approval and a reviewed migration.
- Do not merge PR #1, deploy production, or modify production without explicit user approval.
- Use Preview deployments for verification.

## Project status

The system is under development and is not yet ready for final system-wide testing or production use. The current work queue is Member Management, beginning with A1.1 live database verification.

### Current work queue

#### A — Member Management

Urgent:
- [ ] A1.1 Verify live Supabase schema against repository migrations (IN PROGRESS)
- [ ] A1.2 Fix activation-code reservation and expiration handling
- [ ] A1.3 Complete activation-code registration
- [ ] A1.4 Secure automatic member-code generation
- [ ] A1.5 Complete automatic role assignment
- [ ] A1.6 Complete username/password login
- [ ] A1.7 Implement secure account recovery without email
- [ ] A1.8 Preserve and verify existing administrator/distributor accounts

Priority:
- [ ] A2.1 Implement sponsor assignment
- [ ] A2.2 Validate sponsor relationships
- [ ] A2.3 Build downline tree management
- [ ] A2.4 Build member profile viewing
- [ ] A2.5 Build member profile editing
- [ ] A2.6 Build account activation/deactivation
- [ ] A2.7 Build member search/filtering
- [ ] A2.8 Build member account history
- [ ] A2.9 Complete role and permission controls

Work sequentially. For each individual task: implement, inspect/review, build Preview, verify, then report DONE only when genuinely verified. Ask the user to approve proceeding to the next task. Complete all A tasks before moving to category B. Do not start final system-wide testing or landing-page redesign until the user directs it.

## Business rules

### Member registration and login
- An activation code is printed on the receipt and is used only during registration.
- During registration, the member enters the activation code and creates their own username and password.
- The server validates the activation code and derives the role from its stored assignment; the registrant must not choose their role.
- Member code is allocated by the server after activation:
  - DS0001 Distributor
  - MS0001 Mobile Stockist
  - BO0001 Branch Operator
  - MO0001 Marketing Officer
  - ADMIN Administrator (single-admin convention)
- Login uses username and password only.
- Existing administrator and distributor accounts with legacy AM-... member codes must be preserved.
- Recovery must work for accounts that do not have deliverable email addresses; design a secure approved recovery process rather than relying on synthetic .invalid email addresses.

### Unilevel compensation
- 10 levels.
- Levels 1–5: 12.5% of eligible order PV per level.
- Levels 6–10: 7.5% of eligible order PV per level.
- JMO bonus: +1.3% eligible order PV for each qualifying beneficiary at each level.
- SMO bonus: +1.3% similarly; JMO and SMO bonuses stack up to +2.6%.
- JMO qualification: 5,000 personal PV and 50,000 group PV.
- SMO qualification: 50,000 personal PV and 250,000 group PV.
- Both thresholds are required. Qualification activates when both are met; no retroactive bonuses.
- Annual personal anniversary cycle begins on registration date; reset counters annually; Asia/Manila timezone.
- Group PV includes purchases by all downlines at levels 1–10, including active and inactive downlines. Branch Operator and Mobile Stockist operations/inventory/replenishment are excluded.
- Clarify unresolved personal-PV rules for operational roles before implementation.

### Replacement policy
- No order cancellation/refund; product replacement only.
- Higher price/PV replacement: member pays price difference; order PV changes to replacement product PV.
- Lower price/PV replacement: no refund/change; order PV changes to replacement product PV.
- Same price: no extra payment; PV follows replacement product.
- Replacement request must be within 48 hours using server time.
- Original store handles request; responsibility depends on fulfillment/department.
- Staff manually inspect packaging; no automated packaging check/rejection.

## Technical findings and known issues

### Live database audit
Read-only audit script:
- Repository file: docs/amanah-live-database-audit.sql
- Branch: feature/amanah-pos-pricing
- The script produces result sets A–L. Do not consider the audit complete until results are reviewed and compared with repository migrations.

Audit A (table/column structures) was supplied by the user on 2026-11-16:
- public.profiles includes member_code, username, role, sponsor_id, is_active.
- public.activation_codes exists with hashed code, expiration, and redemption/reservation fields.
- Profile role uses enum amanah_role.
- public.products includes srp, distributor_price, mobile_stockist_price, branch_operator_price, marketing_officer_price.
- public.orders includes destination and fulfillment fields.
- public.inventory, public.stock_locations, and public.stock_movements exist.
- Source result was shared in the project conversation; re-run the audit if exact column details are needed.

Audit L (important RPC definition) was supplied earlier:
- public.submit_member_order(jsonb,text,uuid,text,text,text) exists and is SECURITY DEFINER with search_path public, pg_temp.
- Uses auth.uid(); only active distributors may submit.
- Validates destination category among main_branch, branch_operator, mobile_stockist.
- Mobile Stockist destination requires a destination member ID and validates an active mobile_stockist profile.
- Branch Operator destination currently does not validate an active Branch Operator profile; instead it requires contact person, contact number, and address. This is a known business-logic defect to fix in a later task after schema audit.
- Main Branch also uses contact person/number/address.
- Validates cart JSON, product IDs, and quantities; uses server-side role pricing.
- Inserts submitted order and order items with payment marked pending/no payment collected.
- This function does not reserve/deduct stock and does not directly calculate PV/commissions.

Next audit step: obtain Audit B (constraints and foreign-key relationships), then continue remaining A–K result sets as needed. Do not ask the user to resend Audit L.

### Known implementation concerns to re-check
- Activation code reservations expire after 15 minutes; the reserve function may not reclaim stale reservations automatically.
- Registration flow depends on migrations 0005/0006 and Supabase service-role access.
- Auth accounts use synthetic addresses of the form username@accounts.amanah.invalid; standard email password recovery cannot deliver to these.
- Member-code sequences may not be synchronized with existing legacy member codes; inspect before changing.
- Historical repository migrations may not match live schema. Earlier code used different product/order-item price column names than the live database. Never blindly apply old migrations.
- Earlier function inventory suggested some app-called RPCs may be absent; verify against current live function audit rather than assuming.

### Earlier Preview/build work
- Previous fix changed the homepage footer year from dynamic new Date().getFullYear() to static 2026 to avoid a possible hydration mismatch.
- Commit: a8fd95916ea30f475b7620d687112c07e80a36ec
- Previous Preview deployment was reported Ready: https://amanah-unilevel-system-ci626tq6k-amanah15.vercel.app
- This deployment status is historical and must be rechecked before relying on it.
- No production deployment or live database write was made as part of that fix.

## Working discipline

1. Inspect the current branch and existing files before editing.
2. Preserve existing accounts and data; avoid destructive changes.
3. Make one scoped task change at a time.
4. Review the diff and relevant security/business rules.
5. Commit and push to feature/amanah-pos-pricing.
6. Verify Vercel Preview build and behavior before marking the task complete.
7. Record each completed task, commit SHA, Preview URL, tests, and any remaining risks in this document.
8. Keep database migrations in supabase/migrations and audit scripts in docs; never store secrets or production data dumps in GitHub.


Audit B (constraints and relationships) received 2026-11-16 from the user's SQL output:
- Primary keys observed for activation_codes, commission_rules, commissions, inventory, order_items, orders, products, and profiles.
- activation_codes has a unique constraint on code_hash. created_by and used_by foreign keys point outside the public schema (likely auth.users based on the application architecture); the supplied query output did not show the referenced table/column, so confirm with a corrected FK query.
- commissions has foreign keys to profiles (beneficiary_id, source_member_id) and orders (order_id); status has a CHECK constraint.
- inventory references profiles via holder_id, stock_locations via location_id, and products via product_id. It has a holder-or-location-required CHECK and nonnegative quantity check. Unique constraint covers holder_id + product_id, though the pasted information_schema join repeats rows for this multi-column constraint.
- order_items references orders (ON DELETE CASCADE) and products; quantity and unit_price have CHECK constraints.
- orders references profiles for buyer_id, destination_member_id, fulfillment_user_id, and itself for parent_order_id; order_number is unique; destination_category, subtotal, and total have CHECK constraints.
- products has unique SKU and CHECK constraints for prices, cost, and point_value.
- profiles.id references a user record with ON DELETE CASCADE; supplied output does not identify the referenced schema/table.
- The pasted result appears incomplete for a complete schema-wide FK inventory, and the SQL joins produce ambiguous/repeated rows for composite constraints. Do not treat Audit B as fully reconciled yet. Re-run a corrected FK-only query that includes referenced table schema and pairs columns by ordinal position; inspect pg_constraint/pg_class/pg_namespace or information_schema with explicit constraint_catalog/schema and ordinal_position joins.
- No database changes were made.


Audit B corrected FK-only query received 2026-11-16:
- Confirmed activation_codes.created_by and used_by reference auth.users(id), with ON DELETE NO ACTION.
- commissions.beneficiary_id and source_member_id reference public.profiles(id); commissions.order_id references public.orders(id); all ON DELETE NO ACTION.
- inventory.holder_id references profiles(id), location_id references stock_locations(id), product_id references products(id); all ON DELETE NO ACTION.
- order_items.order_id references orders(id) with ON DELETE CASCADE; product_id references products(id) with ON DELETE NO ACTION.
- orders.buyer_id, destination_member_id, fulfillment_user_id reference profiles(id); parent_order_id self-references orders(id); all ON DELETE NO ACTION.
- profiles.id references auth.users(id) with ON DELETE CASCADE. profiles.sponsor_id self-references profiles(id) with ON DELETE SET NULL.
- stock_locations.profile_id references profiles(id); stock_movements references profiles, stock_locations, orders, and products; stock_reservations references stock_locations, orders, and products; stock_transfers references profiles and stock_locations; all listed stock-operation FKs use ON DELETE NO ACTION.
- wallets.member_id references profiles(id) with ON DELETE CASCADE; withdrawal_requests.member_id references profiles(id) with ON DELETE NO ACTION.
- Audit B relationship inventory is now confirmed for the supplied live schema output. This remains a read-only audit; no live DB changes were made.
- Notable relationship safeguards: deleting an auth user cascades to profiles; sponsor deletion sets sponsor_id to NULL; order deletion cascades to order_items but not commissions/stock movement/reservations; member deletion may be blocked by dependent rows on NO ACTION FKs. Validate desired retention policy before any future schema change.
