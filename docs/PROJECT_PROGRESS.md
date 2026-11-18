# AMANAH Unilevel System — Project Progress & Handoff

Last updated: 2026-11-19
Repository: amanahoperationsdept-beep/Amanah-unilevel-system
Working branch: feature/amanah-pos-pricing
PR: #1 (open, draft, unmerged)
Supabase project ref: bqgxvnrgjmngezknqhsl

## Source-of-truth and backup policy

- GitHub is the source of truth for application code, SQL migrations, audit scripts, technical decisions, and project progress notes.
- Supabase stores live application data and the deployed database schema/functions/policies. It is not a backup for frontend/backend source code.
- Every reviewed code change should be committed and pushed to the existing working branch. Keep migrations and read-only SQL audit scripts in the repository.
- Never put passwords, API keys, service-role keys, access tokens, private member data, or other secrets in GitHub, SQL scripts, issues, or this document.
- Do not apply a migration or change live Supabase data/schema without explicit user approval and a reviewed migration.
- Do not merge PR #1, deploy production, or modify production without explicit user approval.
- Use GitHub Actions for lint, type-check, build, and disposable PostgreSQL validation; deployment is a separate, explicitly approved activity.

## Deployment and validation policy

- Do not use Vercel or any Vercel deployment integration for this project.
- The repository workflow `.github/workflows/ci.yml` is GitHub Actions only and runs install, lint, type-check, and build; it does not deploy.
- Use GitHub Actions and the disposable PostgreSQL test workflow for automated validation. Any hosting/deployment choice must be handled separately and only with explicit approval.

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

Work sequentially. For each task: inspect, implement safe/reversible changes, review, run lint/typecheck/build and review the resulting evidence before marking DONE; do not deploy as part of routine validation. Continue safe development autonomously without asking approval between ordinary tasks. Ask approval only for sensitive, destructive, irreversible, paid, or production-level actions (including live Supabase migrations/data changes, production deployment, PR merge, account/credential changes, or changes that could materially alter business/financial rules). When a genuine technical/access limitation blocks a task, record it and proceed with other safe work. Do not claim live behavior is verified from a build alone.

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
- This deployment status is historical and must be rechecked before relying on it.
- No production deployment or live database write was made as part of that fix.

## Working discipline

1. Inspect the current branch and existing files before editing.
2. Preserve existing accounts and data; avoid destructive changes.
3. Make one scoped task change at a time.
4. Review the diff and relevant security/business rules.
5. Commit and push to feature/amanah-pos-pricing.
7. Record each completed task, commit SHA, GitHub Actions results, and remaining risks in this document. Do not record or create deployment URLs unless deployment is separately approved.
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


### Completed missing live business-table column audit
- User supplied complete live column/default/nullability output for `wallets`, `withdrawal_requests`, and `stock_transfers`.
- `wallets`: one row per member keyed by non-null `member_id`; `available_balance` and `lifetime_earned` numeric NOT NULL DEFAULT 0; `updated_at` timestamptz NOT NULL DEFAULT now(). No wallet transaction/ledger columns are present in this table; financial history is not represented here.
- `withdrawal_requests`: UUID PK default gen_random_uuid; member_id, amount, payment_method required; optional payment account name/number; status uses `withdrawal_status` default pending; optional admin_note; requested_at defaults now; processed_at nullable.
- `stock_transfers`: UUID PK default gen_random_uuid; required transfer_reference, source/destination location IDs, product_id, quantity; status text NOT NULL DEFAULT 'requested'; requested_by/approved_by/received_by nullable UUIDs; requested_at defaults now; approved_at/received_at/notes nullable.
- This closes the previously missing column-level audit for these three tables. Need still verify exact constraints, grants/policies, and business RPC coverage for transfer and wallet/withdrawal flows; no live database changes were made.


### Wallet / withdrawal / payout RPC inventory
- User ran a read-only public-function search for names containing wallet, withdraw, or payout.
- Result: no rows returned. No public RPC/function with those name patterns is currently exposed in the live database.
- Combined with the live `wallets` table having only member_id, available_balance, lifetime_earned, updated_at and no ledger table identified in the audited public table inventory, there is no evident database RPC/ledger workflow for wallet credit/debit or withdrawal processing.
- This is a finding about named public functions and inspected schema only; it does not rule out application-side direct table operations, differently named functions, or external processing. Those require source-code review.
- No live database changes were made.


### Application source review — wallet, commissions, and withdrawals
- Reviewed current feature-branch source files: `src/app/admin/page.tsx`, `src/app/distributor/page.tsx`, `src/app/distributor/product-catalog.tsx`, `src/app/actions/members.ts`, `src/app/actions/activation.ts`, `src/app/actions/auth.ts`, and `docs/amanah-commission-engine-spec.md`.
- Admin workspace explicitly states commission calculation, wallet posting, and payout approval are not available. It currently offers activation-code issuance, a test-email action, and a read-only active-distributor list.
- Distributor workspace reads active products and shows a browser-only cart. Its page explicitly states checkout, payment, stock deduction, and order submission are not enabled. Cart state is React local state and is not persisted/submitted.
- No wallet or withdrawal action/component/page exists in the repository tree inspected on this branch. GitHub code search for wallet/withdrawal terms returned no matches; this is corroborated by the inspected application routes/actions, but does not prove absence from every possible external integration.
- The live wallet table has only balance/lifetime totals and updated_at; no wallet ledger table was found in the audited public-table inventory. No public functions named for wallet, withdrawal, or payout were returned by the live DB search.
- The commission spec documents the live commission trigger as inserting pending commission rows on eligible order completion, with ON CONFLICT DO NOTHING. It explicitly says the trigger does not itself verify payment/refunds or JMO/SMO qualification, and that payout/settlement implementation is gated on further schema/rank verification. No application-side commission approval or wallet-posting workflow was found in the inspected source.
- Withdrawal schema exists, and the live RLS/grants audit found owner/admin read and owner insert policies plus admin update policy; however, there is no identified application workflow or named database RPC to process/approve/release withdrawals. Database policy existence alone does not implement a safe payout process.
- Important parallel A1.1 source/schema mismatch: current app's activation actions call `reserve_amanah_activation_code`, `complete_amanah_activation`, and `release_amanah_activation_reservation`, and issue codes with `role` and `issued_by`; the audited live activation table and RPC inventory do not match those expectations. Do not treat activation as operationally verified.
- No code changes, migrations, database writes, deployments, or production changes were made during this source review.


### A1.1 source review — member registration and activation
- Reviewed current branch files `src/app/actions/activation.ts`, `src/app/register/page.tsx`, `src/app/actions/members.ts`, `docs/AMANAH_MEMBER_CODE_ACTIVATION.md`, migrations 0005/0006, and compared with the live schema/functions/triggers already audited.
- Current intended registration form collects activation code, full name, optional phone, username, password, confirmation. Browser does not select role; role is stored against activation code. Admin issuance creates random AMN code, hashes it with SHA-256, and inserts `code_hash, role, issued_by` into activation_codes.
- Critical live incompatibility: audited live `activation_codes` columns are `code_hash, batch_id, created_by, expires_at, used_at, used_by`; no `role`, `status`, `issued_by`, reservation or redemption fields. Therefore current issuance insert and 0006 RPCs cannot work against the observed live table as-is.
- Current registration action calls `reserve_amanah_activation_code`, creates a Supabase Auth user with synthetic non-deliverable `<username>@accounts.amanah.invalid`, then calls `complete_amanah_activation`; on failure it deletes the Auth user and tries to release the reservation. Those reserve/complete/release functions were not found in live public function inventory.
- Critical trigger collision risk confirmed from live function/trigger audit: live `auth.on_auth_user_created_amanah` fires AFTER INSERT on auth.users and calls SECURITY DEFINER `handle_new_amanah_user()`, which automatically inserts a distributor profile (and wallet) for each new auth user, using an AM-prefixed code and ON CONFLICT(id) DO NOTHING. Migration 0006 `complete_amanah_activation` then explicitly checks whether a profile with p_user_id already exists and raises 'Account or username already exists' before inserting role-specific profile. If this live auth trigger remains active and unchanged, the current registration flow will create the profile before completion and the completion RPC will reject it; registration is therefore not compatible as currently wired.
- The live auth trigger also means role-specific activation must deliberately coordinate with auth user creation; blindly applying migration 0006 is unsafe and may not resolve the collision without reviewing/replacing the trigger behavior.
- Member-code migration 0005 defines DS/MS/BO/MO sequences and a service-role-only generator, but live audit found no public sequences and no generator function. It also does not synchronize sequences to existing member codes. Existing live profiles include AM-prefixed member codes, so code-format migration requires a non-destructive mapping/sequence plan.
- Legacy `registerDistributorAction` in `src/app/actions/members.ts` uses email-based Supabase signup and calls `is_active_distributor_sponsor`; this RPC belongs to legacy migration 0003 and was not present in the audited live function inventory. Its review path calls `review_member_application`, also not verified live. This is a second, older registration path inconsistent with the activation-code-first project flow.
- Current login in `src/app/actions/auth.ts` resolves username to profile then fetches the auth email and signs in with password. Synthetic .invalid email identities can support password sign-in internally, but cannot receive email-based password recovery. Existing live accounts without usernames also cannot use username login until safely migrated/assigned.
- Current registration code ignores the assigned_role value returned by reserve RPC, although completion reads role from the activation row server-side; this is not itself a browser role-escalation flaw, but returned role is unused and should be cleaned up when flow is rebuilt.
- Migration 0006 reservation logic only reserves status='issued'; it does not reclaim stale reservations. Completion rejects reservations older than 15 minutes. A failed/crashed registration can leave a code stuck reserved unless a cleanup/release process runs.
- No code changes, migration applications, live DB writes, or deployments were made during this source review.


### A1.1 source review — existing account preservation, login, and recovery
- Reviewed current branch `src/app/actions/auth.ts`, `src/app/forgot-password/page.tsx`, `src/app/reset-password/page.tsx`, `src/app/auth/callback/route.ts`, `src/lib/auth/require-role.ts`, and `src/app/admin/page.tsx`.
- Login accepts username/password, uses a server-only service-role client to find an active profile by case-insensitive username, fetches its Auth email by profile UUID, then signs in through the session client and routes by the database role. Role access is subsequently checked against live `profiles.is_active` and `profiles.role`.
- Live profile count audit found one active administrator and one active distributor, and prior source/schema audit found neither had a username. Current login cannot locate either account by username while username is null; assigning usernames requires an explicit, account-preserving migration/admin process and must not recreate or delete these users.
- Admin page uses session/RLS reads of active distributor profiles and shows the current admin member code. It does not expose an account migration or username assignment tool.
- Password recovery is email-only: user enters email, Supabase sends reset link, callback exchanges auth code, reset page updates password. This is viable only if the Auth account has a deliverable/accessible email and Supabase email delivery/redirect settings are configured.
- New activation registration creates Auth users with `<username>@accounts.amanah.invalid`, a non-deliverable alias. Those accounts cannot receive the current email-based reset link. Thus the implemented username/password login and email-based recovery are incompatible for newly activated accounts unless a separate verified recovery channel/process is designed.
- Existing Auth emails and confirmation state were not inspected in this source-only pass; do not assume the two existing accounts have deliverable email or that recovery works. This needs a carefully scoped read-only Auth account audit that does not expose full email addresses in the project log.
- `requireRole` checks authenticated user, matching profile ID, `is_active=true`, and role mapping. This is a useful server-side gate for protected pages. It does not solve null usernames or password recovery.
- `auth/callback` uses a safe relative-path check for the next route and signs out after ordinary email confirmation. Recovery callback leaves session active for password update.
- Preservation requirements: retain existing Auth user UUIDs, existing profiles, sponsor relationships, roles, activation state, and financial/operational history. Do not create replacement accounts or reset credentials during the schema repair. Add usernames only after a verified account-owner/admin-controlled process; maintain uniqueness.
- A1.1 still requires a final cross-check of all live public objects and current branch source, and a safe documented baseline. No code changes, migrations, live DB writes, deployments, or production changes were made.


### A1.1 read-only live Auth account verification — administrator and distributor
- User ran the supplied SELECT joining `public.profiles` to `auth.users` for administrator/distributor roles and supplied the results.
- Both existing profiles have matching Auth users; both profiles are active; both Auth users have a non-null email and non-null `email_confirmed_at`; neither is SSO-only nor currently banned (`banned_until` null).
- Both accounts have a recorded successful sign-in timestamp (latest observed on 2026-11-14 UTC). This supports that both are existing, used accounts and must be preserved.
- Email addresses were intentionally not selected or recorded. A non-null confirmed email does not by itself prove current mailbox access or successful delivery; the email reset flow still needs a controlled test by the account holder before being relied upon.
- Neither account currently has a username according to the earlier live profile audit, so the present username lookup login cannot find them until a safe, unique username assignment process is implemented. Do not replace Auth identities or recreate either profile.
- Safe direction: preserve both UUIDs/profiles/roles/active flags and all related records; assign usernames through an authorized account-verification flow; keep the confirmed existing email identity intact unless the account owner explicitly updates it through a verified process. Test recovery only with the account holder's consent and without exposing email addresses or reset links in project logs.
- No code, database, or production changes were made. A1.1 remains open pending final full live-schema-to-repository reconciliation and a documented non-destructive baseline.


### A1.1 final reconciliation — live schema vs repository migration lineage (2026-11-16)
- Rechecked the exact migration directory on `feature/amanah-pos-pricing`. It contains six SQL files: `0001_initial_schema.sql` (8444ec6bf89a90318741cc813ef33e5a5b2aefdc), `0002_secure_monthly_closing.sql` (344976be5d50965eec928319562d73c67ac9d41f), `0003_distributor_onboarding.sql` (19809d4b4d801db3b3de4e08ccfd6c6588de9c31), `0004_secure_order_destinations.sql` (7a7c8773e240e166f4ee9717651350e8ab84a310), `0005_generate_role_member_codes.sql` (c14e473047527ce9c3290f2078d18cd44369490f), and `0006_activation_code_registration.sql` (2e637eb2b741acbf16ff8e8bc87205715ea8b0ee). Corrected filenames are recorded here; no migration file was modified.
- Repository migration lineage is NOT a safe replayable representation of the live database. Migration 0001 establishes a materially different legacy schema (member_role/member_status, closure genealogy, legacy order/commission/wallet/payout structures). Migrations 0002–0004 continue/extend that legacy model. The live database instead uses `amanah_role`, `is_active`, sponsor adjacency, current order/stock/POS structures, commissions, wallets and withdrawal_requests. The live database also contains stock/POS tables not represented in the migration set.
- Migrations 0005 and 0006 are also not live-aligned: the four role-code sequences and `generate_amanah_member_code(text)` were not found live; the live activation_codes table has a different column contract from migration 0006; its reserve/complete/release RPCs were not found live. Registration additionally conflicts with the existing auth-user trigger that pre-creates a Distributor profile and wallet, while migration 0006 completion rejects an already-existing profile.
- The live schema inventory reviewed includes all 14 public tables, columns, primary/unique/check/foreign-key constraints, FK delete actions, enum values, indexes, RLS flags/policies, table grants, schema/default privileges, function definitions/ACLs, and triggers. Key security issue: authenticated has SELECT on order_items while its SELECT policy only checks that a parent order exists, not that the caller is entitled to that order. Treat as critical cross-member order-item exposure; fix only through a reviewed migration after explicit approval.
- Other material live findings: broad anon/authenticated table grants rely heavily on RLS; all 14 tables have RLS enabled but FORCE RLS is false; default privileges grant broad access to future postgres-owned public objects; recursive `is_in_my_downline` has no cycle/depth guard; profile self-update policy/grants need column-level review; stock location/reservation/transfer access appears service/RPC-only; wallets are aggregate balances without a transaction ledger; withdrawal_requests has no implemented approval/release workflow in the inspected app.
- Existing Auth account preservation was confirmed by the user-supplied read-only join: both the active administrator and distributor have matching Auth users, confirmed email identities, prior sign-ins, and no active ban. Neither has a username in the previously audited live profile data. Preserve both Auth UUIDs, profiles, role/active state, relationships, and history; do not recreate accounts. Confirmed email does not prove present mailbox access.
- Migration ledger limitation: no AMANAH project migration-history ledger was found in the reviewed database catalogs; only Supabase subsystem migration tables were visible. Therefore the exact set/order of migrations actually applied to the live database cannot be established from the current evidence.
- Safe baseline decision: do NOT replay migrations 0001–0006 against live. Treat the live database as the operational baseline; create a fresh, reviewed, non-destructive baseline/snapshot and forward-only corrective migrations based on verified live definitions. Before any write, obtain a complete current read-only schema export (including all policies, grants, functions, triggers, indexes and extension dependencies), reconcile it with source, then review a migration diff and obtain explicit approval. Do not infer or synthesize missing migration history.
- A1.1 reconciliation is substantially complete but remains OPEN: the exact live migration lineage is unknowable without a project migration ledger, and a reproducible baseline has not yet been created/verified. No live database changes, schema writes, application code changes, or deployments were made during this reconciliation.


### Read-only baseline preparation (2026-11-16)
- Added `docs/amanah-live-schema-baseline.sql`, a SELECT-only catalog audit covering database identity, schemas, public relations/columns/constraints/indexes, RLS flags/policies, relation and function ACLs, schema privileges, default privileges, complete public function definitions, triggers, enums, sequences/dependencies, views/materialized views, extensions, relevant role attributes, migration-like catalog tables, and aggregate counts for core tables.
- Added `docs/AMANAH_LIVE_SCHEMA_BASELINE.md` with target-project confirmation, execution/export steps, safety rules, known query limitations, and acceptance checklist.
- Script privilege check uses PostgreSQL `has_schema_privilege` against catalog namespaces and known Supabase roles. Script is intended to run read-only in SQL Editor for project `bqgxvnrgjmngezknqhsl`.
- Commits: baseline SQL `822fdb24c79e68865000cf62212e723c263d4560`, portability correction `2824b56dff5279e792e0cc66289867d3d0aeaee6`, procedure `5fbe98fc9af8e8c072be4c52c7f6a083dc53fb9d`.
- This is preparation only. The script has not been executed against Supabase in this step, so no database baseline has yet been captured or verified. A1.1 remains OPEN until all result sets are supplied and reviewed. No live database changes or deployments were made.


### A1.1 closure — live schema reconciliation and migration-history exception (2026-11-16)
- Closed A1.1 as a verified **current-state schema reconciliation**, not as proof of historical migration execution. The earlier read-only audits supplied the live table/column inventory, constraints and FK delete actions, indexes, RLS flags/policies, grants/schema/default privileges, function definitions/ACLs, triggers, enum values, sequences, views, extensions, relevant role attributes, migration-like catalog tables, and existing-account verification. These findings were compared with all six exact migration files on this branch.
- The later reproducible baseline-script run supplied only section 18 aggregate counts: activation_codes 0, commissions 0, order_items 1, orders 1, products 8, profiles 2, wallets 2, withdrawal_requests 0. The user confirmed no other result sets are available. These counts are supplementary and are **not** represented as a complete export of sections 00–17.
- Verified reconciliation outcome: the live schema is materially divergent from repository migrations 0001–0006. Migration 0001–0003 describe an older schema; 0004 is only partially aligned; 0005 role-code sequences/function are absent live; 0006 activation-code schema/RPC contract is incompatible with live activation_codes and conflicts with the live auth-user trigger. Live stock/POS objects are not represented by this migration chain. Do not replay any of migrations 0001–0006 against the live database.
- Historical limitation: no AMANAH project migration ledger was found in the reviewed catalogs. Exact applied migration set/order cannot be established. This is an unknowable historical fact from the available evidence, not a reason to invent or backfill migration records.
- Baseline decision: use the previously audited live schema as the documented operational baseline; the aggregate-count-only script output is retained as supplementary evidence, not a full reproducible metadata export. Future schema work must be forward-only, based on a new complete read-only export/backup where feasible, reviewed against live definitions, and explicitly approved before any write.
- Security and compatibility issues remain recorded for subsequent tasks: order_items SELECT policy permits existence-only parent-order access; broad grants/default privileges need tightening; recursive downline helper lacks cycle/depth protection; profile self-update/column grants need review; activation registration contract conflicts with live trigger/schema; no wallet ledger or withdrawal processing workflow was found in the inspected app.
- Existing administrator and distributor Auth identities/profiles remain preservation-critical. Both have matching active profiles, confirmed Auth emails, prior sign-ins, and no active ban; neither had a username in the audited profile data. No account recreation or credential reset is authorized.
- **A1.1 status: CLOSED — schema reconciliation completed with explicit migration-history exception.** This closure means the current live schema has been reconciled against source and unsafe migrations identified; it does not mean migration history is known, the database has been changed, or all security findings have been fixed.
- No live database changes, application code changes, or deployments were made as part of A1.1 closure.


### A1.2 source inspection — activation-code reservation and expiry (2026-11-16)
- Inspected current branch files: `src/app/actions/activation.ts`, `src/app/admin/activation-code-panel.tsx`, `src/app/register/page.tsx`, `supabase/migrations/0006_activation_code_registration.sql`, and `docs/AMANAH_MEMBER_CODE_ACTIVATION.md`.
- Current issuance action creates a random AMN code, stores SHA-256 hash, role and issuer, but does not set an expiry. Its insert contract (`role`, `issued_by`) is incompatible with the previously audited live `activation_codes` columns (`code_hash`, `batch_id`, `created_by`, `expires_at`, `used_at`, `used_by`). Live table has no `status`, reservation owner/timestamp, or role columns.
- Current registration calls reserve, complete, and release RPCs. Migration 0006 defines these against a different activation_codes contract and is not installed/aligned live; do not apply it as-is.
- Defects in migration 0006 reservation logic: reserve only accepts status='issued', so a process crash leaves status='reserved' indefinitely and later attempts cannot reclaim it; complete checks the 15-minute reservation age but reserve does not reclaim stale reservations; complete does not re-check code expiry at redemption time; release always resets a matching reservation to 'issued' even if the code has since expired. There is no scheduled stale-reservation cleanup or bounded expiry policy in the UI/issuance action.
- Registration action attempts release on Auth create failure and cleanup on completion failure, but best-effort cleanup cannot handle process termination, network interruption, or ambiguous Auth/RPC outcomes. Correctness must be enforced atomically in PostgreSQL, not only by app cleanup.
- Proposed acceptance rules for A1.2: (1) reservation is atomic and single-owner; (2) stale reservations are reclaimable after a fixed short lease; (3) expired codes can never be reserved or redeemed, including if expiry passes during a reservation; (4) release returns a still-valid code to issued, but permanently expires one whose expiry has passed; (5) a redeemed/used code can never be reissued; (6) failed/ambiguous requests do not expose raw codes or leave an indefinitely locked reservation; (7) expiry duration is explicit and consistently applied at issuance and server-side validation.
- Critical dependency: because the live table lacks role/status/reservation fields and current repo migration 0006 is structurally incompatible, a safe A1.2 implementation needs a new forward-only migration designed against the audited live table, plus coordinated RPC/action changes. This must be reviewed as a draft only; no live SQL execution is authorized.
- No source code, migration, database, or deployment changes were made during this inspection.
- A1.2 remains OPEN pending approval of the proposed schema/RPC contract and implementation.


### A1.2 implementation draft — reservation lease and expiry (2026-11-16)
- Added forward-only draft migration `supabase/migrations/0007_activation_code_reservation_expiry.sql`. It targets the audited live activation_codes contract (`code_hash`, `created_by`, `expires_at`, `used_at`, `used_by`) and adds role/status/reservation fields plus atomic service-role-only reserve/release RPCs.
- Migration has fail-closed preconditions: verifies the existing table/columns and `amanah_role`; aborts if activation_codes contains any rows, because assigning roles to existing codes without an approved reconciliation would be unsafe. It is not migration 0006 and must not be run automatically.
- Reservation uses a row lock; one active owner; a 15-minute lease; stale reservations are reclaimable only when the code remains valid; expired codes are marked expired; release returns only a still-valid code to issued and otherwise expires it. Raw activation codes are never stored.
- Updated issuance action to use the live `created_by` column, store `expires_at` 30 days after issuance, and reference the reviewed A1.2 migration in its setup error. Updated admin panel copy to state the 30-day validity.
- Updated `docs/AMANAH_MEMBER_CODE_ACTIVATION.md` with the reservation/expiry contract and safety requirements.
- Important boundary: the live registration-completion RPC is absent/incompatible. A1.2 draft alone does not make registration operational; the later registration integration must validate reservation owner, lease age, `expires_at > now()`, and unused status atomically at redemption. Existing auth-trigger/profile collision remains a separate registration blocker. Do not claim activation registration is fixed.
- Changes are on `feature/amanah-pos-pricing` only. No migration was applied to Supabase; no production deployment or account/data change was made.
- A1.2 remains OPEN pending SQL/code review and successful GitHub Actions application validation; then obtain approval before any live migration execution.


### A1.2 GitHub Actions build check (2026-11-16)
- Build log confirmed Next.js compilation succeeded and lint/type validation proceeded without errors; existing unrelated lint warnings remain in `src/app/page.tsx` and `src/components/ProductCatalog.tsx`.
- This is a build verification only. Protected Preview UI was not interactively tested in this pass; SQL migration was not executed or validated against a live database. The migration's fail-closed precondition also means live execution requires a fresh read-only check that activation_codes remains empty and a reviewed backup/diff.
- A1.2 remains OPEN: A1.3 registration completion must perform the final atomic expiry/lease/used-state check at redemption, and the live auth-trigger/profile collision must be resolved before registration can be considered operational. No live DB change, merge, or production deployment occurred.


## 2026-11-16 — Existing-account email login and A1.2 continuation

- User confirmed the existing-account login issue is resolved after the Preview login update.
- Updated `src/app/actions/auth.ts` to accept either a registered Supabase Auth email or an AMANAH username. Email authentication no longer requires a pre-populated `profiles.username`; after authentication the action verifies the linked profile is active and routes only recognized AMANAH roles. Username authentication continues to resolve the existing profile and linked Auth identity.
- Updated the login UI copy and field to accept email address or username.
- A1.2 review reconfirmed migration `0007_activation_code_reservation_expiry.sql` is a forward-only draft targeting the audited live activation-code columns. It introduces role/status/reservation fields, a 15-minute reservation lease, stale-lease reclaim, expiry marking, and owner-bound release. It deliberately aborts if activation_codes contains rows.
- A1.2 remains OPEN. The live `batch_id` nullability/default was not captured in the available schema evidence, so activation-code issuance insert compatibility is not yet proven. The live database has not been queried again and the migration has not been executed or tested against PostgreSQL. Do not apply it until this precondition is verified and the SQL is reviewed.
- Atomic expiry/reservation validation during redemption belongs to registration completion integration (A1.3) and must be enforced in the same transaction as redemption. Do not represent A1.2 reservation-only functions as completing the entire registration flow.
- No Supabase schema/data changes, production deployment, PR merge, or account/password changes were performed.


### A1.2 live activation_codes insert-contract check — batch_id blocker (2026-11-16)
- User supplied a fresh read-only information_schema result for all columns in public.activation_codes.
- Confirmed exact column contract: id UUID NOT NULL DEFAULT gen_random_uuid(); code_hash TEXT NOT NULL; batch_id NOT NULL with no default; created_by NOT NULL; expires_at NOT NULL; used_at and used_by nullable; created_at NOT NULL DEFAULT now().
- The current A1.2 issuance action correctly supplies code_hash, role, created_by, and expires_at, but omits batch_id. Therefore issuance will fail against the current live table unless a valid batch_id is supplied. Do not claim issuance compatibility or close A1.2.
- The semantic contract for batch_id (including whether it references a batch table and what row must exist) is not established by the column metadata alone. Do not generate an arbitrary UUID or change the schema until the FK/constraint definition and intended batch lifecycle are verified.
- Next read-only check: inspect constraints involving public.activation_codes.batch_id and the referenced relation/column, if any. No live database write, migration execution, deployment, merge, or account/data change occurred.


### A1.2 follow-up — required activation batch identifier (2026-11-16)
- User supplied live metadata confirming `activation_codes.batch_id` is UUID NOT NULL with no default.
- User's constraint query returned no constraints involving `batch_id`; repository search and existing issuance UI show no documented batch-management workflow.
- Updated `src/app/actions/activation.ts` to generate a fresh UUID for each single-code issuance and include `batch_id` in the insert. This models each current one-code issuance as a singleton batch; if multi-code batch creation is later added, all codes in that operation should share one batch UUID.
- Commit: `0b68148e13808b7b239a93da7472c123c318dded` on `feature/amanah-pos-pricing`.
- This is a feature-branch code change only. No live SQL, data write, merge, or production deployment was performed. It is not yet verified against a live issuance because the A1.2 migration/RPC contract remains uninstalled and unresolved; GitHub Actions validation and functional verification remain required.

### A1.2/A1.3 continuation — completion RPC aligned to live Auth trigger (2026-11-16)
- Added complete_amanah_activation(uuid, uuid, text, text, text) to the forward-only draft migration 0007_activation_code_reservation_expiry.sql.
- The live Auth trigger creates a profile (and wallet) immediately when the Auth user is created. The previous repository migration 0006 completion function attempted a second profile INSERT and therefore conflicted with that trigger. The new draft completion RPC updates the trigger-created profile instead, preserving its existing generated member_code and trigger-created wallet.
- Completion locks the activation row and atomically rechecks reservation status/owner, the 15-minute lease, non-null future expiry, and unused state. It serializes same-username completion attempts with a transaction-scoped advisory lock, checks for an existing case-insensitive username, updates profile identity/role fields, then redeems the code by setting used_at/used_by and clearing reservation fields in the same transaction.
- Function is SECURITY DEFINER with an empty search_path, explicitly checks auth.role()='service_role', and revokes execution from PUBLIC/anon/authenticated while granting service_role only.
- Static source review confirms all required checks and that the function updates rather than inserts into profiles. This is not a PostgreSQL execution test. Remaining schema assumptions (profiles.full_name, phone, username, member_code, role, is_active; activation_codes.role enum compatibility; exact trigger behavior) must be rechecked against a fresh read-only schema/function export before any live migration approval.
- The auth-trigger/profile collision is addressed in the draft RPC design, not yet tested end-to-end. No live SQL was run, no account or database rows were changed, and no production deployment or PR merge occurred.
- A1.2/A1.3 remain OPEN pending independent SQL review, PostgreSQL test execution, GitHub Actions application validation for this commit, and an approved controlled live migration/functional test plan.
### A1.3 continuation — role-specific code allocation and ambiguous-outcome safety (2026-11-16)
- Extended the forward-only 0007 draft with four role-specific sequences and a service_role-only generator for DS/MS/BO/MO codes. It checks existing profile member_code values before returning a candidate, advancing the sequence past collisions; existing member codes are not rewritten by this generator.
- Registration completion now allocates the role-specific code from the activation record and updates the Auth-trigger-created profile in the same transaction that redeems the activation code. The existing trigger-created wallet is retained.
- Hardened the registration action against ambiguous completion outcomes: after Auth user creation, it no longer automatically deletes the Auth user or releases the activation reservation when the completion RPC returns an error or transport failure. PostgreSQL may have committed even if the client did not receive confirmation; preserving the account avoids deleting a successfully registered member. The user receives a support/reconciliation message instead.
- Static source checks passed for SQL delimiter balance, all four sequences, role-code assignment, reservation lease/expiry checks, atomic redemption, profile update rather than duplicate insert, and absence of Auth-user deletion in the registration action.
- GitHub Actions build for commit 3a01a22a446c8b051aa4319d62f1c4a464053e2e was queued at the time of this note. Earlier commit 63d9c49996cd08b6d26a7bd713348f4fd6a11212 had a separate GitHub Actions build in progress.
- Critical unresolved verification: live profile column names and role enum labels, trigger behavior, and actual existing member_code formats still require fresh read-only confirmation. The migration has not been executed or run through PostgreSQL tests. A code collision check is not a substitute for validating the live uniqueness constraint and sequence permissions.
- No live Supabase schema/data changes, production deployment, PR merge, or existing-account modification occurred. A1.2/A1.3 remain OPEN.

### A1.2/A1.3 SQL review correction — member-code allocator quoting (2026-11-16)
- A follow-up source review found that the newly added `generate_amanah_member_code(text)` function in migration 0007 had a malformed dollar-quote delimiter (`as $` / `$;`) that would prevent PostgreSQL from parsing the migration.
- Corrected the function to use matching `$$` delimiters and corrected the adjacent comment to reflect that completion assigns the role-specific member code to the Auth-trigger-created profile.
- Static delimiter-pattern validation passed after the correction. This is a source-level correction only; the migration has not been parsed/executed by PostgreSQL or tested against a disposable database.
- Fix commit: `6c62633b9df01e5851f5e1167687fd5fe1a627df` on `feature/amanah-pos-pricing`.
- Live audit evidence already records `profiles.full_name`, `phone`, `username`, `member_code`, `role`, and `is_active`, and the exact `amanah_role` labels. Remaining verification includes fresh live schema/trigger recheck, a disposable PostgreSQL migration test, confirmation of the live member-code uniqueness behavior under concurrent allocation, and end-to-end activation registration. GitHub Actions build status alone cannot verify SQL.
- No live Supabase schema/data changes, production deployment, PR merge, or existing-account modification occurred. A1.2/A1.3 remain OPEN.


### A1.2/A1.3 continuation — ambiguous Auth creation safeguard (2026-11-16)
- A further control-flow review found that a thrown transport error from `supabase.auth.admin.createUser()` could occur after Auth had already created the user. The prior catch path could then release the activation reservation because it only tracked confirmed Auth creation, leaving a possible Auth user/profile without a redeemed activation code.
- Updated `src/app/actions/activation.ts` to set an `authCreationAttempted` flag before awaiting the Auth request. If the request throws after it was sent, the action now preserves the reservation and returns a reconciliation message rather than releasing the code. A definitive returned Auth error still follows the explicit release path. This is deliberately conservative to avoid freeing a code that may already have been consumed.
- Commit: `a69b9f5f63cb5e382f5fe1b860aa4e9a657f6aaa` on `feature/amanah-pos-pricing`.
- Static review only: no PostgreSQL executable/disposable database is available in the current tool environment, so migration 0007 has not been parsed or executed by PostgreSQL. No live Supabase SQL, data, account, production, or PR changes were made.
- A1.2/A1.3 remain OPEN pending GitHub Actions application validation, PostgreSQL migration testing, fresh live schema/trigger contract verification, and controlled end-to-end registration validation after explicit live-change approval.


### Autonomous development workflow (2026-11-19)
- User authorized autonomous continuation on the existing project, preserving the repository, architecture, accounts, records, authentication, integrations, and working features.
- Ordinary safe code, documentation, lint/build/debugging, and Preview improvements may proceed without approval between tasks.
- Pause before sensitive, destructive, irreversible, paid, or production-level actions; do not run live database migrations, alter live data/accounts/credentials, merge the PR, or deploy Production without explicit approval.
- Inspect current source/schema first, prefer scoped forward-only changes, validate through GitHub Actions and disposable tests, and document the verification boundary. CI success does not prove live database functionality.


### Registration schema verification aid (2026-11-19)
- Added `docs/verify-registration-schema.sql`, a read-only SQL audit to inventory registration-related columns, activation/application tables, RLS flags, policies, function signatures/security modes, role/status enum labels, and table grants.
- The script deliberately does not select member rows, activation-code hashes, or other personal data, and performs no schema/data writes.
- Direct link: https://github.com/amanahoperationsdept-beep/Amanah-unilevel-system/blob/feature/amanah-pos-pricing/docs/verify-registration-schema.sql
- Commit: 0c178defe7354b34777060344ac911d92bfb6a90.
- Next manual step: run this script in the existing Supabase SQL Editor and share all six result sets. Do not run migration 0007 or any other migration yet. Compare the fresh output with the current draft migration and app actions before deciding whether code or SQL needs adjustment.
- No live database change, account change, PR merge, or production deployment was made.


### Fresh live registration schema audit results (2026-11-19)

- User supplied the complete single-grid result from `docs/verify-registration-schema.sql`; all six audit sections were returned.
- Confirmed live `public.profiles` columns relevant to registration: `id` UUID, `member_code` text nullable, `full_name` text NOT NULL default empty string, `phone` nullable text, `role` `amanah_role` NOT NULL default distributor, `sponsor_id` nullable UUID, `is_active` boolean NOT NULL default true, `created_at`, `updated_at`, and `username` nullable text.
- Confirmed live `public.activation_codes` columns: `id` UUID, `code_hash` text NOT NULL, `batch_id` UUID NOT NULL without default, `created_by` UUID NOT NULL, `expires_at` timestamptz NOT NULL, `used_at` nullable timestamptz, `used_by` nullable UUID, `created_at` timestamptz NOT NULL default now().
- Confirmed live `amanah_role` labels: administrator, marketing_officer, branch_operator, mobile_stockist, distributor. The role values used by current registration issuance/allocation are present.
- RLS is enabled and not forced on both `profiles` and `activation_codes`.
- `profiles` policies returned: SELECT for self/downline/admin; UPDATE for self/admin with role and sponsor immutability checks for self-updates. No INSERT or DELETE policy was returned. Although table grants list broad privileges for anon/authenticated, RLS still applies; the returned policy set does not grant anon row access, and authenticated INSERT/DELETE have no matching policy. Do not infer an exploit from grants alone; verify effective behavior with role-scoped tests before changing grants.
- `activation_codes` has no policy rows and no anon/authenticated table grants in this result. service_role and postgres have table privileges. RLS therefore remains deny-by-default for ordinary API roles; service_role bypasses RLS by design.
- Two live SECURITY DEFINER overloads named `consume_amanah_activation_code` exist: (p_code_hash text) and (p_code_hash text, p_user_id uuid), both volatile and returning boolean. The audit did not export function bodies, EXECUTE ACLs, or triggers. Current application code instead calls `reserve_amanah_activation_code(text, uuid)`, `release_amanah_activation_reservation(uuid, uuid)`, and `complete_amanah_activation(uuid, uuid, text, text, text)`; these functions were not present in the audit's name filter result. This strongly indicates the A1.2/A1.3 draft migration has not yet been installed, but must be verified with exact routine/trigger inventory before any live action.
- Current branch source inspection: `src/app/actions/activation.ts` writes `batch_id`, `created_by`, and `expires_at` on issuance, and invokes the reserve/release/complete RPCs. Draft migration `0007_activation_code_reservation_expiry.sql` adds role/status/reservation fields and the three RPCs, with an empty-table precondition. It also adds four member-code sequences and a service-role-only allocator.
- Critical remaining preconditions before the migration can be considered safe: determine whether activation_codes currently contains rows (migration aborts unless empty); inspect constraints/indexes/triggers and full function definitions/ACLs; verify auth.users trigger behavior and whether it creates profiles/wallets; verify profile member_code uniqueness/indexes; test the SQL migration against PostgreSQL/disposable database; then perform code/SQL review. The schema audit does not establish these.
- No migration was run, no database rows or schema were changed, and no production action was taken. A1.2/A1.3 remain OPEN.
- Next read-only evidence request is a focused routine/trigger/constraint/count audit; see `docs/verify-registration-runtime.sql` (added in commit `b8b6a31c7def6a5d2952ade4366db718d12e2c73`). No user action is required for code edits; only the final live SQL evidence must be run in the existing Supabase SQL Editor because no Supabase database connector is available in this workspace.


### Registration runtime audit query added (2026-11-19)
- Added `docs/verify-registration-runtime.sql`, a single-result-grid, read-only query to inspect activation-code row count (count only), constraints, indexes, auth/profile/activation triggers and trigger function bodies, plus registration-related function definitions and EXECUTE privileges.
- This is the next required live evidence because the schema audit shows the app calls reserve/release/complete RPCs that did not appear in the live function inventory, while two SECURITY DEFINER `consume_amanah_activation_code` overloads do exist.
- Direct link: https://github.com/amanahoperationsdept-beep/Amanah-unilevel-system/blob/feature/amanah-pos-pricing/docs/verify-registration-runtime.sql
- No live database changes, migration execution, PR merge, or production deployment occurred.


### Registration runtime audit results and allocator correction (2026-11-19)

- User supplied the complete read-only runtime audit grid from `docs/verify-registration-runtime.sql`.
- Activation-code row count was **0 at audit time**, so migration 0007's empty-table precondition was satisfied by this snapshot. This is not permission to execute it; recheck immediately before any approved migration because the count can change.
- Confirmed constraints: activation_codes primary key, unique code_hash, and foreign keys created_by/used_by → auth.users(id); profiles primary key, unique member_code, id → auth.users(id) ON DELETE CASCADE, and sponsor_id → profiles(id) ON DELETE SET NULL.
- Confirmed indexes include unique profiles(member_code), unique lower(username) for non-null usernames, and the expected activation_codes code_hash/primary-key indexes.
- Confirmed auth.users AFTER INSERT trigger `on_auth_user_created_amanah` calls SECURITY DEFINER `handle_new_amanah_user()`. The trigger resolves sponsor_code from Auth user metadata when present, inserts the profile with a temporary `AM-` plus eight-character user-ID-derived member code and distributor role (ON CONFLICT id DO NOTHING), inserts the wallet (ON CONFLICT DO NOTHING), and returns the Auth row. The registration action currently supplies `amanah_username` metadata but no `sponsor_code`; sponsor assignment is therefore not part of this registration flow yet and remains A2 work.
- Confirmed the only audited live registration routines are the two `consume_amanah_activation_code` overloads (text) and (text, uuid). Both are SECURITY DEFINER, owned by postgres, and executable by service_role but not anon/authenticated. Their bodies update used_at (and used_by in the two-argument overload) only when the code is unused and unexpired. The application-required reserve/release/complete RPCs were not present in this inventory, so the draft migration remains uninstalled based on this audit.
- The draft completion RPC's update-in-place approach matches the live trigger: it should update the trigger-created profile and preserve the already-created wallet, not insert a second profile. The profile member_code unique constraint and case-insensitive username unique index provide relevant collision safeguards.
- Source review found a member-code allocator edge case: PostgreSQL `lpad(value, 4, '0')` truncates strings longer than four characters. After a role sequence passes 9999, this could produce repeated/truncated candidates and potentially loop on collision. Migration 0007 was corrected to keep a minimum width of four while retaining all digits above 9999.
- Latest allocator-fix commit: `556b02bfa508f31df024866636a26302139c9c38` (includes the sequential correction commits `f727b039` and `0796e209`). This is a feature-branch SQL source change only. It has not been parsed or executed by PostgreSQL.
- Remaining verification: inspect the final migration source after the allocator fix; run migration 0007 against a disposable PostgreSQL/Supabase-compatible database; verify function definitions/ACLs and sequence behavior; run lint/typecheck/build and Preview; then prepare a controlled live migration plan. Recheck activation_codes count and take an appropriate backup immediately before any approved live execution.
- No live Supabase migration, schema/data write, account change, PR merge, or production deployment was performed. A1.2/A1.3 remain OPEN.


### Disposable PostgreSQL registration migration test harness (2026-11-19)

- Added a GitHub Actions workflow using an ephemeral PostgreSQL 17 service; it does not connect to or modify the hosted Supabase project.
- Added `tests/sql/registration_fixture.sql`, which models the audited registration schema, role enum, unique member-code and lower(username) indexes, Auth user/profile/wallet trigger, and service-role execution context. The fixture contains only synthetic IDs and test data.
- Added `tests/sql/registration_migration_test.sql`, which applies the real migration 0007 and checks reservation, active-lease rejection, owner-bound release, stale-lease reclaim, Auth-trigger-created profile update, wallet preservation, role assignment, code redemption, legacy member-code collision skipping, allocation beyond 9999, expiry handling, duplicate username rejection, and anon EXECUTE denial.
- Added a separate disposable-database check that expects migration 0007 to fail when activation_codes already contains a row.
- Hardened migration 0007 preflight to verify the audited profiles columns, unique member_code constraint, case-insensitive username unique index, and all four allocatable amanah_role enum labels. The activation_codes empty-table check is now repeated after taking an ACCESS EXCLUSIVE table lock held until transaction commit, preventing an issuance race between the row-count check and adding the NOT NULL role column.
- Local PostgreSQL execution was unavailable in this workspace (no postgres/psql server or Docker runtime). Do not describe the SQL suite as passed until the GitHub Actions run completes successfully and its logs are reviewed.
- No live Supabase migration, schema/data write, account change, PR merge, or production deployment was performed. A1.2/A1.3 remain OPEN.


### Disposable PostgreSQL CI findings and correction (2026-11-19)

- The first PostgreSQL 17 CI execution successfully built the synthetic Supabase fixture, then caught a malformed closing dollar-quote delimiter in migration 0007's preflight DO block. This was a real parser failure, not a fixture or environment issue.
- Corrected the migration delimiter and found/corrected the matching delimiter typo in the allocator boundary test block. The current migration has balanced DO/function dollar-quote delimiters, and the test SQL has four balanced DO blocks.
- The initial CI run's application validation workflow passed; the SQL workflow failed at migration parsing before lifecycle assertions ran. The corrected commit is `fc1608a0b2646e0c2678b813e995ee5d4dd29118`; a new PostgreSQL run is still pending/has not yet been observed through the available PR-run listing.
- Do not treat the PostgreSQL test suite as passed until a subsequent run completes successfully and logs confirm both the lifecycle test and non-empty-inventory fail-closed test.
- No live Supabase operation was performed.


### Disposable PostgreSQL registration migration suite — PASS (2026-11-19)

- GitHub Actions PostgreSQL 17 run `44319528449` completed successfully: [workflow run](https://github.com/amanahoperationsdept-beep/Amanah-unilevel-system/actions/runs/44319528449).
- The real migration 0007 applied successfully to the disposable audited-schema fixture. Lifecycle assertions passed for active reservation rejection, owner-bound release, stale-lease reclaim, trigger-created profile update, wallet preservation, role-specific member-code assignment, activation redemption, legacy DS0001 collision avoidance (next code DS0002), allocation at DS10000, expiry marking, duplicate case-insensitive username rejection, and anon execution denial.
- The separate non-empty-inventory database check also passed: migration 0007 correctly rejected a populated activation_codes table and the transaction rolled back.
- The test fixture initially exposed two test-only problems (unbalanced dollar quotes and repeated first-eight-character UUID prefixes); both were corrected. The production Auth trigger and member_code uniqueness rule were not weakened.
- GitHub Actions application validation run `44319528731` also completed successfully: lint, type-check, and Next.js build all passed.
- This validates migration syntax and registration lifecycle behavior against the disposable PostgreSQL 17 fixture matching the supplied live schema/trigger contract. It is not a live Supabase migration, a full Supabase platform integration test, or end-to-end browser/Auth-provider validation.
- No live Supabase migration, schema/data write, account change, PR merge, or production deployment was performed. A1.2/A1.3 remain OPEN pending final review and explicit approval for any live migration.


## 2026-11-19 continuation — member self-profile view

- Added a reusable read-only `MemberProfileSummary` server component and placed it in the Admin, Distributor, Marketing Officer, Branch Operator, and Mobile Stockist workspaces.
- The component queries only the authenticated profile ID supplied by the server-side `requireRole` guard and selects the audited self-profile fields: full_name, username, phone, member_code, role, is_active, and created_at.
- The query remains subject to Supabase RLS. No profile edit, role change, activation change, credential change, sponsor change, or other write action was added.
- Removed the obsolete hard-coded Vercel password-reset fallback URL. Recovery now prefers `NEXT_PUBLIC_SITE_URL`, then the current request origin; if neither is available, it fails closed with a support message.
- Branch: `feature/member-self-profile-view` (based on `feature/distributor-own-network`).
- Commits: `01cf27a` (component), `60bedfa` (shared role workspaces), `ddc5b17` (Distributor), `7a9d2f5` (Admin), `2d7b3b1` and `bd86501` (remove obsolete hosting fallback/comment), `4fb3a75` (progress dashboard update).
- Validation: GitHub Actions run `44351044341` passed lint, TypeScript type-check, and Next.js build. This is code/build validation only; no live Supabase query/write, migration execution, deployment, PR merge, or account/credential change was performed.
- Scope: this implements read-only profile viewing only. Profile editing and account recovery workflow improvements remain separate, security-sensitive work.


### Member profile validation and recovery redirect hardening (2026-11-19)
- GitHub Actions run `44351044341` passed lint, TypeScript type-check, and Next.js build for the member self-profile feature.
- Follow-up security review removed the password-reset redirect's Host and X-Forwarded-Host fallback. The redirect destination now comes only from `NEXT_PUBLIC_SITE_URL`, parsed and restricted to HTTP(S) origins; missing or invalid configuration fails closed with a generic support message.
- This avoids allowing request-controlled host headers to select the authentication redirect origin. The Supabase redirect allow-list must still include the configured URL for recovery emails to work.
- Updated the project progress dashboard to reflect PR #16's successful CI run.
- No live Supabase operation, migration, deployment, PR merge, or account/credential change was performed.


### Member self-profile editing (2026-11-19)
- Extended PR #16 with a self-service edit form for full name and contact number across all authenticated role workspaces.
- Server action requires an authenticated Supabase user and an active profile matching auth.uid(); update filters by that user ID and sends only the allow-listed `full_name` and `phone` columns. It verifies a row was returned after update, so zero-row/RLS outcomes are not reported as success.
- Validates full name (2–100 characters), normalizes whitespace, and validates optional phone number format/length. Username, member code, role, sponsor, and is_active remain read-only.
- No live database changes. Existing self-update RLS and broad grants still require additional authorization/column-grant review; application allow-listing is defense-in-depth, not a substitute for database controls.
- Fresh GitHub Actions run `44374642858` for commit `678955f603b5d2cf392f3cc9892ac26378d81b68` passed dependency installation, lint, TypeScript type-check, and Next.js build. This validates code/build only; it does not prove live Supabase RLS/column grants or end-to-end behavior.

## 2026-11-19 continuation — profile edit permission audit draft (PR #17)
- Added `docs/profile-self-edit-permission-audit.sql`, a read-only audit script for table/column grants, effective UPDATE privileges for authenticated/anon roles, profile RLS policy expressions, triggers, relevant function security/search_path/EXECUTE grants, views, and RLS flags/ownership.
- This audit is specifically intended to verify whether the live database safely constrains the profile self-edit action to the allowed fields. Application-side allow-listing does not replace database-level controls.
- GitHub Actions run `44375599918` passed install, lint, type-check, and build for the audit branch; this validates the repository only and does not verify the live database.
- Branch: `feature/profile-self-edit-permission-audit`, based on PR #16.
- No SQL has been executed against the live database. The script is a draft for review only; CI validation is pending.

## 2026-11-19 continuation — Admin directory sponsor context (PR #18)
- Added read-only sponsor name/member-code context to the Admin active Distributor directory.
- The page fetches sponsor records only for sponsor IDs belonging to the current directory page; it does not fetch the whole sponsor population.
- Graceful fallback labels handle missing sponsor data or profile read access.
- PR #18 is draft and CI pending. No live database changes or deployment.

## 2026-11-19 continuation — Admin member status filter (PR #19)
- Extended the read-only Admin Distributor directory to filter active and inactive accounts.
- Status filter is informational only; no activation, suspension, or account changes are exposed.
- Search and pagination preserve the selected status. CI pending.

## 2026-11-19 continuation — Profile audit coverage (PR #20)
- Expanded the read-only profile permission audit to inspect every public function whose source references `profiles`, including effective execute privileges for authenticated and anon roles.
- This supplements the name-based function scan. Dynamic SQL and indirect dependencies still require manual review.
- The audit is not run against live database; CI pending.
- PR #19 CI initially failed at type-check because the selected profile query did not yet include `is_active` and still filtered only active records. The query was corrected to select `is_active` and apply the selected status; CI is rerunning.
