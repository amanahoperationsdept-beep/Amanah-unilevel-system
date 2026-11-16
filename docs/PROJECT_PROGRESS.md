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


Audit C (RLS table flags) received 2026-11-16:
- RLS is enabled on all 14 audited public tables: activation_codes, commission_rules, commissions, inventory, order_items, orders, products, profiles, stock_locations, stock_movements, stock_reservations, stock_transfers, wallets, withdrawal_requests.
- FORCE ROW LEVEL SECURITY is false on all 14 tables. This means table owners can bypass RLS unless other controls apply; service-role/BYPASSRLS behavior must also be considered separately. Do not infer policy safety from enabled flags alone.
- Audit C table flags recorded. Next inspect actual policies (Audit D) and grants (Audit E). No live database changes were made.


Audit D (live RLS policies) received 2026-11-16:
- Policies were returned for commission_rules, commissions, inventory, order_items, orders, products, profiles, stock_movements, wallets, and withdrawal_requests. No authenticated policies were returned for activation_codes, stock_locations, stock_reservations, or stock_transfers (may be intentional if service-role/RPC-only; verify grants).
- Admin ALL policies consistently use is_amanah_admin().
- commission_rules/products SELECT permits active rows or admin.
- commissions SELECT is beneficiary_id = auth.uid() or admin; admin ALL.
- inventory SELECT is holder_id = auth.uid() or admin; admin ALL. Location-held inventory may not be visible to operational users through this policy; assess after grants/application access review.
- stock_movements SELECT is holder_id = auth.uid() or admin; admin ALL. Movements with location_id and null holder_id may not be visible to operational users.
- orders SELECT allows buyer, fulfillment user, members in buyer's downline, or admin; INSERT requires buyer_id = auth.uid(); UPDATE permits admin or assigned fulfillment user. Check whether column grants/constraints prevent unauthorized field changes by fulfillment users.
- profiles SELECT allows self, downline, or admin. UPDATE permits self or admin, with WITH CHECK protecting role and sponsor_id for self-updates. However, the policy does not by itself restrict updates to safe columns such as full_name/phone; column grants and application action validation must be inspected before concluding profile fields are protected.
- CRITICAL SUSPECTED DATA EXPOSURE: order_items_select_related SELECT predicate only checks EXISTS (SELECT 1 FROM orders o WHERE o.id = order_items.order_id), with no condition linking the order to auth.uid(), downline, fulfillment user, or admin. Any authenticated user who can SELECT order_items may therefore read items for all orders. Confirm table SELECT grants and treat as urgent security finding pending confirmation.
- withdrawal_requests SELECT owner/admin; INSERT requires member_id = auth.uid(); UPDATE admin only.
- wallets SELECT owner/admin only; no authenticated write policy surfaced.
- RLS policies alone do not determine access: PostgreSQL grants, function SECURITY DEFINER, views, and role attributes must also be audited. Audit D findings recorded; no live DB changes made.


Audit E (live table grants) partial output received 2026-11-16:
- The supplied output is truncated during the orders grants; remaining tables/privileges have not yet been audited.
- For order_items, authenticated has SELECT (and also INSERT/UPDATE/DELETE grants); the RLS SELECT policy recorded in Audit D only checks that a parent order exists. Therefore the suspected exposure is CONFIRMED at the policy+grant level: authenticated users can SELECT order_items rows without an ownership/downline/fulfillment/admin predicate. This is a critical cross-member order-detail confidentiality defect. No exploit test performed and no live change made.
- For order_items, anon also has table SELECT grant, but Audit D showed no anon policy; with RLS enabled, that grant alone should not grant row access. Verify effective role/RLS behavior separately if needed.
- Similar broad table grants are present for authenticated and anon on commission_rules, commissions, inventory, orders, and other listed tables. RLS policies are the row-level gate, but column privileges and function/view paths still need review.
- service_role has broad privileges on activation_codes, as expected for server-side privileged workflows; this is highly sensitive and must remain server-only.
- Continue Audit E with a compact privilege summary for every public table to avoid truncation. No live DB changes made.


Audit E (live table grants) complete summary received 2026-11-16:
- Broad table-level privileges are granted to both anon and authenticated on commission_rules, commissions, inventory, order_items, orders, products, profiles, stock_movements, wallets, and withdrawal_requests: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE. RLS is therefore the critical row-level control for these roles; table grants are much broader than least privilege.
- service_role has the same broad privileges on all listed tables and on activation_codes, stock_locations, stock_reservations, and stock_transfers. These are privileged server-side access paths and service-role credentials must never be exposed to clients.
- anon/authenticated have no table grants shown for activation_codes, stock_locations, stock_reservations, or stock_transfers. This supports the intended service-only design for these tables.
- Critical confirmed exposure remains order_items: authenticated has SELECT grant and its SELECT RLS policy has no ownership/relationship predicate (only parent-order existence). Recommend urgent policy correction in a reviewed migration, but do not apply live without explicit approval.
- Broad anon grants do not by themselves bypass RLS; the Audit D policy listing showed no anon policies. Still verify effective role attributes, default privileges, views, RPCs and any policies applicable via PUBLIC.
- Because grants include DELETE/INSERT/UPDATE/TRUNCATE etc. broadly, review every RLS policy and all SECURITY DEFINER functions carefully. RLS ALL policies for admin may protect direct DML, but function/view paths and table-owner/service-role bypass need separate checks.
- Audit E findings recorded; no live DB changes made.


Audit F (live public enum types/values) received 2026-11-16:
- amanah_role values/order: administrator, marketing_officer, branch_operator, mobile_stockist, distributor. No separate activation/pending role value is present in this enum.
- order_status values/order: draft, submitted, approved, processing, completed, rejected, cancelled. Note: the business policy previously specified orders cannot be cancelled/refunded and replacement-only; the presence of a cancelled enum value is not itself proof cancellation is enabled, but application/RPC paths must enforce the policy.
- withdrawal_status values/order: pending, approved, rejected, released.
- Only these three public enums appeared in the supplied query output. No live schema changes made.


Audit G (live public function inventory) received 2026-11-16:
- 12 function signatures were returned (including two overloads of consume_amanah_activation_code). SECURITY DEFINER functions: admin_adjust_location_stock (search_path empty), admin_list_orders (public, pg_temp), consume_amanah_activation_code overloads (public), current_user_role (public), get_my_genealogy (public, pg_temp), handle_new_amanah_user (public), is_amanah_admin (public), is_in_my_downline (public), list_active_mobile_stockists (public, pg_temp), record_unilevel_pv_commissions (public, pg_temp), submit_member_order (public, pg_temp). set_updated_at is SECURITY INVOKER.
- All listed functions are owned by postgres. SECURITY DEFINER functions execute with owner privileges, so their EXECUTE grants and internal authorization checks must be reviewed individually; inventory alone is not enough to establish safety.
- Positive hardening signal: admin_adjust_location_stock uses an empty search_path, reducing object-shadowing risk if all object references are schema-qualified. Functions using public, pg_temp should be checked for explicit qualification and safe temporary-schema handling.
- Priority review targets: get_my_genealogy(p_root_member_id) and list_active_mobile_stockists() for data exposure; admin_list_orders() and admin_adjust_location_stock() for admin authorization; consume activation code overloads for who can redeem codes; submit_member_order() for previously noted Branch Operator validation gap; record_unilevel_pv_commissions() for trigger-only invocation and commission correctness.
- Audit G function inventory recorded; no live DB changes made.


Audit H (live public table triggers) received 2026-11-16:
- orders: AFTER UPDATE, ROW trigger orders_record_unilevel_pv_commissions executes record_unilevel_pv_commissions(); and BEFORE UPDATE, ROW trigger orders_set_updated_at executes set_updated_at().
- profiles: BEFORE UPDATE, ROW trigger profiles_set_updated_at executes set_updated_at().
- No INSERT or DELETE triggers appeared in the supplied information_schema.triggers output.
- Key risk to inspect in the trigger function: commission recording is triggered on every UPDATE event, so function logic must guard against duplicate commission creation and ensure it runs only on the intended eligible status transition (e.g. approval/completion as defined by business rules), with idempotency and correct PV/role/level calculations. No assumption made about its internal behavior until source definition is reviewed.
- Audit H recorded; no live DB changes made.


### Live database audit I — profile role/status counts
- Read-only query grouped `public.profiles` by `role` and `is_active`.
- Results: 1 active administrator and 1 active distributor; no other role/status groups returned.
- This confirms the current profile table contains two active accounts in these two roles. It does not by itself prove that all intended administrator/distributor accounts are preserved; compare with the known account roster during the dedicated account-preservation task.
- No live database changes were made.


### Live database audit J — stock_locations structure
- `public.stock_locations` columns: `id` UUID primary identifier candidate with `gen_random_uuid()` default; `location_code` text NOT NULL; `location_type` text NOT NULL; `profile_id` nullable UUID; `location_name` text NOT NULL; `is_active` boolean NOT NULL DEFAULT true; `created_at` and `updated_at` timestamptz NOT NULL DEFAULT now().
- This confirms the live table has a nullable profile association and required code/type/name fields. Constraints, allowed location types, uniqueness, and profile association semantics must be checked against constraints and application logic; column metadata alone does not establish them.
- No live database changes were made.


### Live database audit K — important business table columns
- Query returned column metadata for activation_codes, commissions, inventory, order_items, orders, products, profiles, stock_movements, stock_reservations, and stock_transfers. It did not return wallets or withdrawal_requests in this output, despite those being requested; obtain those separately if needed.
- Activation codes: hashed code, batch, creator, expiry, optional use timestamp/user; no reservation columns appeared in this returned column set. This is important to reconcile with the application's reserve/complete activation workflow.
- Commissions: optional order/source member/level; required beneficiary/type/basis/rate/amount/status; defaults numeric amounts/rate/basis to zero and status to pending.
- Inventory: optional holder and location, required product, quantity_on_hand defaults to zero.
- Order items: required order/product/quantity/unit_price; optional line_total.
- Orders: required buyer/status/subtotal/total; status defaults submitted; includes fulfillment role/user, parent order, payment fields, destination details/member, timestamps, and generated AM- order number.
- Products: required name and price fields (SRP, distributor, mobile stockist, branch operator, marketing officer, cost, point_value), all numeric defaults zero; optional SKU/description/image; active defaults true.
- Profiles: auth UUID, optional member_code/phone/sponsor/username, required full_name and role (default distributor), active defaults true, timestamps.
- Stock movements: required product/type/quantity, optional holder/order/location/performer and before/after quantities; created timestamp.
- Stock reservations: required order/location/product/quantity/status/reserved_at/expires_at; status defaults reserved; completed_at nullable.
- Stock transfers: required transfer reference, source/destination locations, product; this result is truncated/incomplete after product_id, so further columns may exist.
- Potential schema/application mismatch requiring investigation: activation_codes output lacks reservation state/user/time fields that the existing application workflow reportedly uses. Do not alter live schema until migrations and live definitions are compared.
- No live database changes were made.


### Live database audit L — selected RPC/function definitions
- The query returned definitions for four functions: `admin_adjust_location_stock`, `get_my_genealogy`, `record_unilevel_pv_commissions`, and `submit_member_order`.
- It returned no rows for `reserve_amanah_activation_code`, `complete_amanah_activation`, `release_amanah_activation_code`, or `generate_amanah_member_code`. This is a critical mismatch with the application workflow/migration expectations and must be reconciled with the repository migration files and exact live function inventory before A1.1 is closed.
- `admin_adjust_location_stock`: SECURITY DEFINER with empty search_path; requires authenticated actor and `is_amanah_admin()`, validates positive quantity/direction/reason, locks active location and inventory row, prevents negative stock, updates balance, and inserts a stock movement.
- `get_my_genealogy`: SECURITY DEFINER, defaults root to current auth user, permits another root only for admin, recursively returns downline up to depth 10 and guards against cycles. Returns member code, full name, role, active flag and joined timestamp.
- `record_unilevel_pv_commissions`: AFTER UPDATE trigger function; only acts when status transitions to completed; computes PV from order items/product point_value, walks up to 10 uplines, includes active beneficiaries, joins active commission_rules, inserts pending unilevel commission rows, and uses `ON CONFLICT DO NOTHING`. Actual duplicate protection depends on a matching unique/exclusion constraint and must be verified.
- `submit_member_order`: SECURITY DEFINER; requires authenticated active profile and currently permits only `distributor`; validates destination and cart, derives price server-side, creates submitted order and order items. Payment remains pending; this function does not deduct stock or create reservations. It does not support Branch Operator purchasing despite its internal pricing CASE branches.
- These findings are from the supplied live function definitions only. Function EXECUTE grants and all omitted function definitions still require review.
- No live database changes were made.


### A1.1 migration-to-live comparison — initial findings (not complete)
- Inspected repository migrations `0001_initial_schema.sql` through `0006_activation_code_registration.sql` on `feature/amanah-pos-pricing`.
- Migration 0001 defines a materially different legacy schema: `member_role`/`member_status`, legacy `orders.member_id`, `total_pv`, `paid_at`, closure-table `genealogy`, `rank_settings`, `monthly_volumes`, `commission_runs`, `commission_ledger`, `wallet_transactions`, and `payout_requests`.
- The live schema audit instead shows `amanah_role`, `is_active`, sponsor adjacency via `profiles.sponsor_id`, current `orders.buyer_id`/`status`/`total`, `commissions`, `wallets`, `withdrawal_requests`, inventory/stock tables, and operational RPCs. This indicates substantial divergence from migration 0001's baseline; migration history is needed to determine which migrations were actually applied and whether the baseline is obsolete or a different database lineage.
- Migration 0003 depends on legacy `member_status`, `profiles.status`, and legacy distributor signup/auth-email verification, so it does not align with the live `amanah_role`/`is_active` profile structure described by the audit.
- Migration 0004 aligns in part with current `submit_member_order` destination design, though live function body differs in Branch Operator destination handling (live function currently handles only Main Branch contact details or Mobile Stockist member destination).
- Migration 0005 defines `generate_amanah_member_code(text)` for service_role, but Audit L did not find it in the live database.
- Migration 0006 defines `activation_codes.role`, `status`, `issued_by`, `issued_at`, `expires_at`, `reserved_user_id`, `reserved_at`, `redeemed_by`, and `redeemed_at`, plus reserve/complete/release functions. The live column audit returned a different activation_codes structure (code_hash, batch_id, created_by, expires_at, used_at, used_by) and no reservation fields; Audit L also returned no matching reserve/complete/release functions (migration function name for release is `release_amanah_activation_reservation`). This is a confirmed schema/function mismatch from the supplied outputs.
- Migration 0006 expects a profile schema with `username`, `role`, `is_active`, and activation role, which is closer to the current schema, but activation_codes is not aligned.
- The selected migration directory currently contains six files (0001–0006). Exact applied migration versions, later/manual SQL, and full live table/constraint/policy/function inventory remain to be reconciled. Do not apply or replay migrations against live DB.
- No live database changes were made.


### Migration history discovery
- `information_schema.tables` search found `auth.schema_migrations`, `realtime.schema_migrations`, and `storage.migrations`; no `supabase_migrations.schema_migrations` table or `supabase_migrations` schema was found.
- The auth/realtime/storage migration tables are service-internal subsystem histories and should not be treated as the application's project migration history. Their existence does not establish which repository SQL migrations were applied to public schema.
- Project migration application history is currently unavailable through the expected Supabase CLI tracking table. Need inspect repository migration list and Supabase project tooling/history safely, or reconcile from live schema/function definitions without altering the database.
- No live database changes were made.


### Project migration schema check
- A read-only `information_schema.schemata` query for schema names containing `migration` or exactly `supabase_migrations` returned no rows.
- Together with the earlier table discovery, this confirms there is no visible `supabase_migrations` schema in the connected database. The only discovered histories belong to Auth, Realtime, and Storage.
- Therefore, this database does not expose the standard Supabase project migration ledger at the queried location. Applied project migration versions cannot be confirmed from that ledger; continue with schema/code reconciliation and available deployment/repository evidence.
- No migration table or schema was created, and no live database changes were made.


### Repository migration file verification
- User confirmed the `supabase/migrations` folder contains all six listed files: `0001_initial_schema.sql` through `0006_activation_code_registration.sql`.
- The six files were also fetched directly from branch `feature/amanah-pos-pricing` for continued source-level reconciliation.
- Presence in GitHub confirms the repository migration set, but does not prove any of the six files were applied to the connected Supabase project.
- No live database changes were made.


### Migration-to-live-schema reconciliation — source review
- Re-fetched and reviewed the exact contents of all six SQL migrations on `feature/amanah-pos-pricing`.
- `0001_initial_schema.sql` is a legacy baseline: `member_role`/`member_status`, closure-table `genealogy`, legacy order fields (`member_id`, `total_pv`, `paid_at`), rank/monthly-volume/commission-run/commission-ledger/wallet-transaction/payout-request tables. Live audit instead shows `amanah_role`, `is_active`, sponsor adjacency on `profiles`, current orders using `buyer_id`/`status`/`total`, `commissions`, `wallets`, `withdrawal_requests`, and stock/POS tables. This is a substantial lineage/schema divergence, not a safe candidate for replay.
- `0002_secure_monthly_closing.sql` hardens legacy monthly closing RPCs around the old ledger/genealogy model; those source objects are not present in the reported live schema. It cannot be assumed applicable to the current live schema.
- `0003_distributor_onboarding.sql` is built on legacy `member_status` and pending/active distributor signup/email-review structures. Live profiles use `amanah_role` and `is_active`; the migration is not aligned with current live profile model.
- `0004_secure_order_destinations.sql` uses the newer `amanah_role`/stock-location/order-destination model. Its source RPC permits only distributor callers, supports main branch/branch operator/mobile stockist destinations, and prices from role-specific product fields. Live `submit_member_order` is similar but the inspected live definition supports main branch and mobile stockist destinations only; branch-operator destination handling differs. Do not replay without targeted migration planning.
- `0005_generate_role_member_codes.sql` defines four role sequences and a service-role-only `generate_amanah_member_code(text)`. Audit L did not find this function in live. Existing member codes include AM-prefixed legacy values; sequence synchronization with existing codes is not included in the migration.
- `0006_activation_code_registration.sql` expects activation-code columns `role`, `status`, `issued_by`, `issued_at`, `reserved_user_id`, `reserved_at`, `redeemed_by`, `redeemed_at`, and RPCs `reserve_amanah_activation_code`, `complete_amanah_activation`, `release_amanah_activation_reservation`. Live Audit K instead reported `code_hash`, `batch_id`, `created_by`, `expires_at`, `used_at`, `used_by`, with no reservation columns; Audit L did not find those three RPCs. This is a confirmed structural/function mismatch based on supplied live outputs.
- Live database has current operational objects and RPCs not represented by the six-file migration set (including current inventory/stock tables, `submit_member_order`, and other audited functions). Their provenance is not established by this repository migration history.
- Conclusion: repository migrations are present, but they do not form a verified replayable history for the current live database. The live DB appears to have evolved through a different or manually modified schema lineage. A1.1 remains OPEN pending a complete inventory comparison and confirmation of all current live tables, constraints, policies, grants, functions, triggers, and indexes against repository code. No live database changes were made.


### Live public index inventory
- User supplied the complete `pg_indexes` result for the public schema. Unique keys observed: activation_codes(code_hash); commissions partial unique (order_id, beneficiary_id, level_number, commission_type) where order_id and level_number are non-null; inventory(holder_id, product_id) and partial inventory(location_id, product_id) where location_id is non-null; order_items(id); orders(order_number), orders(id); products(id), products(sku); profiles(member_code), profiles(id), unique lower(username) where username is non-null; stock_locations(location_code), partial one-main-warehouse uniqueness on location_type, stock_locations(id), stock_locations(profile_id); stock_movements(id); stock_reservations(id); stock_transfers(id), transfer_reference; wallets(member_id); withdrawal_requests(id).
- Non-unique indexes observed: stock_locations(location_type, is_active); stock_reservations(location_id, product_id, status) and (order_id); stock_transfers(destination_location_id, status) and (source_location_id, status). The output does not show indexes on several common lookup/FK columns (e.g. profiles.sponsor_id, orders.buyer_id, order_items.order_id, commissions.beneficiary_id/source_member_id, inventory.product_id/location_id); whether additional indexes are needed depends on workload and FK/index design. PostgreSQL does not automatically index referencing FK columns.
- Important commission integrity finding: the live partial unique index on (order_id, beneficiary_id, level_number, commission_type) supports duplicate prevention for rows with non-null order_id and level_number. This aligns with the inspected commission trigger's `ON CONFLICT DO NOTHING` behavior for normal order-generated commissions. Confirm exact conflict behavior and whether trigger inserts always populate those columns before considering idempotency fully verified.
- Activation code table has only unique hash and primary-key indexes in the supplied output; no status/expiry/reservation lookup index is present. Current live activation schema also lacks reservation fields per Audit K, so this reinforces the mismatch with migration 0006.
- Profile uniqueness is enforced for member_code and case-insensitive username (when non-null), which is useful for member-code/login identity integrity. Stock location uniqueness enforces one profile per location and at most one main_warehouse row regardless of active status.
- No schema/index changes were made. Index inventory recorded as evidence only; A1.1 remains open pending any remaining reconciliation gaps and review.


### Live database extension inventory
- User supplied installed extensions: `pg_stat_statements` 1.11 in schema `extensions`; `pgcrypto` 1.3 in `extensions`; `plpgsql` 1.0 in `pg_catalog`; `supabase_vault` 0.3.1 in `vault`; and `uuid-ossp` 1.1 in `extensions`.
- `pgcrypto` is already installed, satisfying the extension dependency used by migration 0001's `create extension if not exists pgcrypto` at the capability level. Its schema is `extensions`, not `public`; any function references relying on unqualified pgcrypto functions should be checked against the runtime search_path. Current observed functions use `gen_random_uuid()`, which is available in supported PostgreSQL versions without relying on pgcrypto's public schema placement.
- `uuid-ossp` is available but no conclusion is drawn that the app requires it. Supabase Vault is present; no secrets were inspected.
- No extension changes or live database changes were made.


### Live public views and materialized views
- User ran read-only queries against `pg_views` and `pg_matviews` filtered to schema `public`.
- Result: success, no rows returned for either query. Therefore no ordinary views or materialized views are currently listed in the public schema.
- This narrows the public data-exposure review to tables, policies/grants, functions/RPCs, triggers, and other object types; it does not establish that no views exist in other schemas.
- No live database changes were made.


### Live public sequence inventory
- User ran a read-only query against `pg_sequences` filtered to schema `public`.
- Result: success, no rows returned. No sequences are currently listed in the public schema.
- This confirms that the four role-code sequences declared by repository migration `0005_generate_role_member_codes.sql` are not present under the public schema. It does not rule out sequences in other schemas; a broader inventory is still needed before concluding no equivalent sequence exists anywhere.
- This is a material migration/live-schema mismatch for member-code generation. No sequences were created and no live database changes were made.


### Live sequence inventory — all schemas
- User ran a read-only query against `pg_sequences` without a schema filter.
- Only two sequences were returned: `auth.refresh_tokens_id_seq` and `realtime.subscription_id_seq`.
- No public sequences and no role-specific member-code sequences were found anywhere in the visible `pg_sequences` inventory. This confirms migration `0005_generate_role_member_codes.sql`'s four sequences are absent from the live database, subject to catalog visibility/permissions.
- No live database changes were made.


### Live public custom type inventory
- User supplied the complete public custom-type query output for enum, composite, and domain types.
- Enums present: `amanah_role` = administrator, marketing_officer, branch_operator, mobile_stockist, distributor; `order_status` = draft, submitted, approved, processing, completed, rejected, cancelled; `withdrawal_status` = pending, approved, rejected, released.
- No `member_role` or `member_status` enum appeared, consistent with the live schema diverging from migration 0001's legacy model.
- Composite row types listed correspond to current public tables (including activation_codes, commission_rules, commissions, inventory, order_items, orders, products, profiles, stock_locations, stock_movements, stock_reservations, stock_transfers, wallets, withdrawal_requests); no custom domain type appeared in this output.
- `activation_codes` appears as a composite row type, not an enum; its presence here does not indicate a standalone activation-code custom type.
- The live `order_status` includes `cancelled`; business policy says orders are replacement-only/no cancellation or refund, so application/RPC enforcement must be checked before accepting this as an operationally permitted status.
- No live database changes were made.


### Live public function EXECUTE ACL audit
- User supplied the complete `pg_proc.proacl` inventory for 13 public functions. In PostgreSQL ACL notation, `X` is EXECUTE and the empty grantee (`=`) represents PUBLIC.
- Explicitly granted to `authenticated` and `service_role`: `admin_adjust_location_stock`, `admin_list_orders`, both `consume_amanah_activation_code` overloads (service_role only; not authenticated), `get_my_genealogy`, `list_active_mobile_stockists`, `submit_member_order`. `authenticated` and `service_role` are not listed for the consume overloads; both are executable by postgres and service_role only.
- PUBLIC EXECUTE (and also explicit anon/authenticated/service_role grants) appears on SECURITY DEFINER helpers `current_user_role`, `is_amanah_admin`, `is_in_my_downline`; and on `record_unilevel_pv_commissions` (SECURITY DEFINER), plus trigger functions `handle_new_amanah_user` (SECURITY DEFINER) and `set_updated_at` (SECURITY INVOKER). PUBLIC EXECUTE means these function privileges are not restricted to authenticated callers; anon also has explicit EXECUTE in the reported ACLs.
- Highest-priority review: PUBLIC/anon EXECUTE on SECURITY DEFINER helpers exposes callable privileged execution paths and must be checked against function bodies, returned data, and trigger-only assumptions. `record_unilevel_pv_commissions` is a trigger function and its direct-call behavior should be verified; `handle_new_amanah_user` should only be invoked by its intended auth trigger. `current_user_role`, `is_amanah_admin`, and `is_in_my_downline` may disclose role/relationship information even if they do not mutate data.
- `admin_adjust_location_stock` has an internal admin check per previously inspected definition; `get_my_genealogy` checks current user and restricts arbitrary root selection to admins; `submit_member_order` checks authenticated active distributor per previously inspected definition. These internal checks do not remove the need to review every SECURITY DEFINER function and least-privilege grants.
- Do not infer that all anon calls succeed: function body checks, trigger context, and auth context may still reject them. No exploit test or live change was performed.
- Next verification should inspect effective ACLs for all overloads using `aclexplode` (the displayed ACLs are enough to flag PUBLIC), and inspect `admin_list_orders`, helper function bodies, and trigger bindings before proposing any GRANT/REVOKE changes. No live database changes were made.


### Live definitions — admin order listing and role/downline/auth trigger helpers
- User supplied live definitions for `admin_list_orders`, `current_user_role`, `handle_new_amanah_user`, `is_amanah_admin`, and `is_in_my_downline`.
- `admin_list_orders(p_limit)`: SECURITY DEFINER; checks `auth.uid()`, active profile, and administrator role before returning up to 100 recent orders with member, destination/contact/address, payment, and item details. The internal admin authorization check is present despite PUBLIC EXECUTE ACL. The result is highly sensitive and should remain admin-only at the function-body level.
- `current_user_role()`: SECURITY DEFINER, STABLE; returns the caller's own profile role using `auth.uid()`. PUBLIC EXECUTE appears to expose only the caller's role (or NULL for unauthenticated/no profile) based on this definition.
- `is_amanah_admin()`: SECURITY DEFINER, STABLE; calls `current_user_role()` and returns a boolean. PUBLIC EXECUTE exposes a boolean authorization oracle, not a direct write operation, based on the definition.
- `is_in_my_downline(target_id)`: SECURITY DEFINER, STABLE; recursively traverses profiles starting at direct children of `auth.uid()`, then returns whether target is in the recursive result. PUBLIC EXECUTE allows callers to test membership of arbitrary target UUIDs in their own downline. Recursive CTE has no explicit cycle guard or depth bound; sponsor cycles could cause runaway recursion. Null auth.uid() should yield no roots due to SQL equality semantics, but this should be verified in tests if this helper remains exposed.
- `handle_new_amanah_user()`: SECURITY DEFINER trigger function; reads sponsor_code from new auth user's metadata, finds an active profile by member_code, inserts a distributor profile with generated `AM-` code, and inserts a wallet. Unknown sponsor codes silently result in no sponsor. It does not validate activation-code redemption, role assignment, or use migration 0005's role-specific code generator in this trigger body. Direct invocation as a normal function is not possible because it is a trigger function; PUBLIC EXECUTE on trigger functions is not equivalent to an ordinary callable RPC, though least-privilege ACL cleanup should be considered carefully.
- `admin_list_orders` uses `SET search_path = public, pg_temp`; other helpers use `public`. All sensitive table references shown are schema-qualified. No definition changes, permission changes, or live database changes were made.
- Remaining function/trigger audit: verify actual trigger binding for `handle_new_amanah_user`, inspect remaining privileged RPCs and trigger function direct-call behavior, and inspect role attributes/default privileges before finalizing A1.1.


### Live Auth user registration trigger binding
- User supplied the `information_schema.triggers` result showing trigger `auth.on_auth_user_created_amanah` on `auth.users`, event INSERT, timing AFTER, executing `handle_new_amanah_user()`.
- This confirms the live Auth user creation trigger invokes the inspected SECURITY DEFINER function on every new Auth user insert. The trigger function creates a distributor profile and wallet, and may assign sponsor_id from Auth metadata; it does not itself enforce activation-code redemption or role-specific member-code allocation.
- This creates a critical registration-flow interaction to resolve: the application's activation flow also calls `complete_amanah_activation` to create a profile, while the Auth trigger may already have inserted one. Whether this causes a conflict or silent no-op depends on `complete_amanah_activation` implementation and its ON CONFLICT behavior, which must be inspected before any code/schema changes.
- The trigger's PUBLIC EXECUTE ACL is less directly callable because it is a trigger function, but function grants should be minimized where safely possible after confirming PostgreSQL trigger invocation behavior.
- No live database changes were made.


### Live activation RPC definition lookup
- User ran a read-only lookup for `complete_amanah_activation`, `reserve_amanah_activation_code`, and `release_amanah_activation_reservation` in `public`.
- Result: success, no rows returned. None of these three expected activation workflow RPCs currently exist in the live public schema under those names.
- This confirms the repository migration 0006 activation workflow is not present in the live database, consistent with the earlier activation_codes column mismatch and missing reservation fields. The active Auth INSERT trigger still creates a default distributor profile and wallet, so the current live registration path does not match the repository's activation-code reservation/completion workflow.
- Do not attempt to call these missing RPCs or apply migration 0006 to live. Before implementation, reconcile current app code, live activation_codes schema, auth trigger, profile uniqueness/constraints, and intended role assignment; then prepare a reviewed migration and test in Preview/non-production first.
- No live database changes were made.


### Live activation-related function inventory — consume RPCs
- User supplied the complete public function search result for activation/code/register names. Only two overloads of `consume_amanah_activation_code` exist; no registration, reservation, completion, or release RPC exists under the searched naming patterns.
- Both overloads are SECURITY DEFINER with `search_path = public`. Both update a matching activation_codes row only when `used_at IS NULL` and `expires_at > now()`, then return whether a row was updated.
- One overload sets only `used_at`; the other sets `used_at` and `used_by = p_user_id`. Neither function body verifies that `p_user_id` matches an authenticated user; current ACLs show only postgres and service_role can EXECUTE, not anon/authenticated. Thus these appear intended for trusted server/service-role use, but service-role caller correctness remains an application responsibility.
- These functions consume immediately; they do not reserve a code, enforce a reservation timeout, validate an activation role, create/update a profile, or create a wallet. This is not equivalent to migration 0006's reserve/complete/release workflow.
- The active Auth INSERT trigger independently creates a distributor profile and wallet, so current live registration behavior remains distinct from the repository activation workflow. No live database changes were made.


### Live database role attributes audit
- User supplied role attributes for `anon`, `authenticated`, `authenticator`, `postgres`, `service_role`, and `supabase_admin`.
- `anon` and `authenticated`: not superusers, cannot create roles/databases, cannot login directly, no replication, and `BYPASSRLS=false`. This supports that normal API roles do not bypass RLS at the role-attribute level.
- `service_role`: not superuser and cannot create roles/databases or login directly, but `BYPASSRLS=true`; it must remain server-only and its key must never be exposed to browsers or users.
- `authenticator`: login-capable gateway role, no BYPASSRLS; `INHERIT=false`.
- `postgres`: not marked superuser in this output but has create-role/create-db/replication and `BYPASSRLS=true`.
- `supabase_admin`: superuser and `BYPASSRLS=true`; platform administration role.
- This confirms that RLS is not bypassed by ordinary anon/authenticated roles through their role attributes, but broad table grants plus permissive policies remain independently important. Service-role operations bypass RLS by design and require server-side authorization.
- No role attributes or live database settings were changed.


### Live database role membership audit
- User supplied role membership results.
- `authenticator` is a member of `anon`, `authenticated`, and `service_role`, each without admin option. This is consistent with the Supabase API gateway model where the authenticator role can switch into the JWT-selected API role; it does not by itself mean ordinary anon/authenticated requests inherit service_role privileges. The earlier `authenticator.rolinherit=false` is important: membership privileges are not automatically inherited, though SET ROLE is possible for granted memberships.
- `postgres` has memberships in anon, authenticated, authenticator, service_role, pg_create_subscription, pg_monitor, pg_read_all_data, pg_signal_backend, and supabase_privileged_role. Most have admin_option=true; supabase_privileged_role does not. These are administrative memberships and do not grant those roles to ordinary users.
- No membership rows show anon, authenticated, or service_role as members of elevated roles. The role membership output therefore does not reveal an unexpected elevated-role membership for those API roles.
- This query alone does not verify effective privileges for every object or default privileges; table grants, RLS policies, function ACLs, and service-role handling still require their separate audits.
- No live database changes were made.


### Live database role membership audit
- User supplied membership rows from `pg_auth_members`.
- `authenticator` is a member of `anon`, `authenticated`, and `service_role`, all with `admin_option=false`. This is consistent with Supabase's API gateway role switching into request roles; membership alone does not mean every request inherits all three roles simultaneously. Request JWT role selection determines the active role.
- `postgres` has admin-option memberships for anon, authenticated, authenticator, service_role, and several platform roles; this is administrative membership, not an ordinary application-user grant.
- No membership rows show `anon` or `authenticated` as members of `service_role`. Thus the ordinary API roles do not gain service_role membership through the listed memberships.
- Combined with the prior role-attribute audit, ordinary anon/authenticated roles have no BYPASSRLS attribute; service_role itself does have BYPASSRLS and remains server-only.
- No role membership changes or live database changes were made.


### Live default privileges audit
- User supplied `pg_default_acl` rows for postgres, supabase_admin, supabase_auth_admin across public, storage, extensions, graphql, graphql_public, realtime, and auth schemas.
- Critical application-owned defaults: for objects created by `postgres` in `public`, default ACL grants anon, authenticated, and service_role broad table privileges (`arwdDxtm`: SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER), sequence privileges (`rwU`: SELECT/UPDATE/USAGE), and function EXECUTE (`X`). Equivalent broad defaults also appear for postgres-created objects in `storage`.
- These are DEFAULT privileges: they affect future objects created by the specified owner in the specified schema, not retroactively every existing object. Existing table grants were separately audited and also showed broad grants on many current public tables.
- Supabase-managed defaults are also present under supabase_admin in public/graphql/graphql_public and platform schemas. Do not alter platform-managed defaults without a clear supported reason.
- Security impact: a future public table/function/sequence created by postgres can automatically become accessible to anon/authenticated at the SQL privilege layer; RLS may still restrict table rows, but broad table-level grants increase the impact of permissive/missing policies and SECURITY DEFINER functions. Future SECURITY DEFINER functions also receive PUBLIC-independent explicit anon/authenticated EXECUTE grants via this default ACL.
- Recommended remediation is to prepare narrowly scoped ALTER DEFAULT PRIVILEGES for application-owned objects only, after confirming intended owners and app requirements, and to explicitly grant only required privileges. Do not execute any changes in live DB during this audit.
- No live database changes were made.


### Live schema-level privilege audit
- User supplied results for schema privileges in `public`, `storage`, and `extensions` for anon, authenticated, service_role, authenticator, and postgres.
- In `public`: anon, authenticated, authenticator, and service_role have USAGE but not CREATE; postgres has USAGE and CREATE.
- In `storage`: anon, authenticated, and service_role have USAGE but not CREATE; authenticator has neither; postgres has USAGE but no CREATE according to `has_schema_privilege` (platform-managed schema; do not change based on this audit alone).
- In `extensions`: anon, authenticated, and service_role have USAGE but not CREATE; authenticator has neither; postgres has USAGE and CREATE.
- No application API role among anon/authenticated/service_role has schema CREATE privilege in these schemas. The public schema is accessible for object resolution by API roles, while table/function/sequence privileges and RLS determine actual access. This is consistent with Supabase API access patterns; USAGE alone does not grant table data access.
- No schema grants or live database changes were made.


### Project migration-history table search — confirmation
- User searched all non-system tables for names containing migration, schema_version, or change_log.
- Only `auth.schema_migrations`, `realtime.schema_migrations`, and `storage.migrations` were returned. These are Supabase subsystem histories, not a project-level `supabase_migrations.schema_migrations` record for the six repository migrations.
- Combined with the earlier check showing no `supabase_migrations` schema, there is no visible project migration ledger in the queried database catalogs. Therefore the applied status/order of repository migrations cannot be established from a project migration-history table in this database.
- No tables were created and no live database changes were made.
