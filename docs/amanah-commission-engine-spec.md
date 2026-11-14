# AMANAH Commission Engine — Approved Rules and Implementation Gate

Status: design recorded; implementation is gated on live-schema verification.
Target branch: feature/amanah-pos-pricing
Production: no changes authorized or made.

## Confirmed business rules

### Base Unilevel
- 10 upline levels.
- Levels 1–5: 12.5% of eligible order PV per level.
- Levels 6–10: 7.5% of eligible order PV per level.
- Formula: order PV × level rate = base commission.
- PV is currently derived by the live trigger as SUM(order_items.quantity × products.point_value).

### Rank additions
- A qualified JMO receives an additional 1.3% of eligible order PV at each Unilevel level where that JMO is the beneficiary.
- A qualified SMO receives an additional 1.3% of eligible order PV at each Unilevel level where that SMO is the beneficiary.
- A beneficiary who qualifies for both JMO and SMO receives both additions: +2.6%.
- Formula for each beneficiary and level: order PV × (base level rate + applicable JMO 1.3% + applicable SMO 1.3%).
- Example confirmed by the owner: 100 PV × (12.5% + 1.3% + 1.3%) = 15.10 at Level 1 for a beneficiary qualified as both JMO and SMO.
- Rank additions are cumulative, not replacements.

## Existing live database behavior observed by the owner

- public.record_unilevel_pv_commissions() is a SECURITY DEFINER trigger function.
- It runs after an orders UPDATE when new.status = 'completed' and the old status was not 'completed'.
- It walks the buyer's sponsor chain up to 10 levels, with cycle protection.
- It computes PV from order item quantities and product point values.
- It reads active rates from public.commission_rules where commission_type = 'unilevel'.
- It inserts pending commission rows and uses ON CONFLICT DO NOTHING.
- The live active rates currently observed are 12.5% at levels 1–5 and 7.5% at levels 6–10.
- The commissions table has a unique partial index on (order_id, beneficiary_id, level_number, commission_type), protecting duplicate Unilevel rows for non-null order_id and level_number.
- The commission table status check observed: pending, approved, paid, void.
- The trigger does not itself visibly verify payment, refunds, or JMO/SMO qualification. Those must be addressed before enabling payouts.
- The current commission function uses active commission_rules rows. Do not change those live rows during this implementation phase.

## Safety and implementation requirements

1. Do not modify the live Supabase database until its exact schema, policies, grants, existing rank qualification logic, and commission history are verified.
2. Do not change production or merge PR #1 without explicit owner approval.
3. Keep all money/PV calculations server-side and transaction-safe.
4. Qualification must be checked from authoritative database state, never from client input.
5. Define qualification effective dates / snapshot semantics so later rank changes do not silently rewrite historical eligibility.
6. Preserve the existing unique commission key or equivalent idempotency guarantee.
7. Add auditable commission components or equivalent traceability so base, JMO, and SMO additions can be explained independently.
8. Prevent commissions on unpaid, cancelled, refunded, or otherwise ineligible orders; define reversal/void behavior before payout.
9. Validate the entire sponsor chain and active beneficiary eligibility.
10. Add automated tests for all 10 levels, rank combinations, missing upline, inactive beneficiaries, repeated completion events, refunds/reversals, rounding, and rate totals.
11. Avoid applying repository migrations blindly: the checked-in historical migrations do not match the live schema observed in this project.

## Remaining facts required before coding the live database integration

- Exact profile columns or related tables that represent JMO and SMO rank, qualification, effective dates, and current status.
- Whether JMO and SMO are flags, ranks, or separate qualification records.
- The approved rule for how long rank qualification remains valid and whether qualification is evaluated at order completion or order date.
- Relevant commission history and any existing JMO/SMO commission types or ledger structures.
- Existing triggers/functions that might already implement qualification or rank bonuses.

Until these are verified, this specification is saved to the feature branch as the approved calculation design, not as a claim that the live commission engine has been changed.

## Owner-approved JMO / SMO qualification thresholds and annual period

These rules were explicitly provided by the owner on 2026-11-15 and must be preserved unless the owner explicitly approves or commands a change:

- **JMO qualification:** 5,000 PV personal purchase AND 50,000 PV group sales.
- **Senior Marketing Officer (SMO) qualification:** 50,000 PV personal purchase AND 250,000 PV group sales.
- Both conditions are required for the respective qualification.
- The qualification measurement period is **one year**. At the end of that one-year period, the qualification PV counters reset to **0 PV** for the next period.
- This annual reset applies to the personal-purchase and group-sales qualification measurements. It does not alter the separately approved base Unilevel rates or the 1.3% JMO and 1.3% SMO per-level commission additions.
- The owner instructed that no recorded rule may be changed or removed without explicit owner approval or command.

### Annual-period implementation details requiring confirmation

Do not silently assume:
- Whether the one-year period is a fixed calendar year or a rolling/member-specific 12-month period.
- The exact start date and reset boundary (for example, calendar-year start versus each member's qualification anniversary).
- Which members and branches count in "group sales" and how the group is bounded.
- Whether rank status and rank commission eligibility end immediately at reset, or whether members retain rank while rebuilding the next year's PV.
- How returns, refunds, cancellations, and adjustments affect the annual PV counters.
- Whether a member who meets thresholds partway through the year qualifies immediately or only at period close.

