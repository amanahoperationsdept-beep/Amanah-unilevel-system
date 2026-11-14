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



### Owner clarification — member-specific annual cycle and reset countdown

The owner clarified on 2026-11-15:

- Each member's one-year qualification period begins on that member's **registration date (Day 1)**.
- The period is member-specific, not a shared calendar-year period.
- At the end of that one-year period, the personal-purchase and group-sales qualification counters reset to **0 PV**, and the next annual cycle begins.
- The member-facing system should show a **countdown timer to the upcoming annual reset** (for example, remaining days and time), so the member can see how long remains in the current qualification year.
- The reset must be calculated from the authoritative registration timestamp and handled server-side. The displayed timer is informational; it must not control or trigger the reset from the browser.
- Use a clearly defined timezone and anniversary boundary in implementation; do not rely on the member's device clock.

Still requiring owner confirmation before implementation:
- **Timezone:** Asia/Manila (Philippine Time, UTC+08:00), as confirmed by the owner. The exact anniversary boundary/time should follow the member's registration timestamp in this timezone.
- Whether rank status and rank commission eligibility end immediately at reset, or whether members retain rank while rebuilding the next year's PV.
- Which members and branches count in "group sales" and how the group is bounded.
- How returns, refunds, cancellations, and adjustments affect annual PV counters.
- Whether a member who meets thresholds partway through the year qualifies immediately or only at period close.


## Annual JMO / SMO qualification renewal — confirmed rule

Both required volume conditions must be achieved within the same member-specific one-year qualification cycle (Day 1 is the member's registration timestamp; cycle boundaries use Asia/Manila time):

- JMO: at least 5,000 personal PV AND at least 50,000 group PV/GVP.
- SMO: at least 50,000 personal PV AND at least 250,000 group PV/GVP.

The two conditions are conjunctive: meeting only personal PV or only group PV/GVP is not sufficient. If either required threshold has not been met by the end of that one-year cycle, the member does not retain that qualification into the next cycle; the applicable qualification counters reset to 0 PV and the member must qualify again in the new cycle. Qualification and the associated JMO/SMO additional 1.3% commission eligibility therefore do not carry forward when the required thresholds are missed.

If both thresholds are achieved within the cycle, the member meets the volume requirements for that rank. The existing separate 1.3% JMO and 1.3% SMO additions remain cumulative when a beneficiary qualifies for both ranks.

This rule clarifies annual renewal only. Group-volume membership/boundary, treatment of returns/refunds/cancellations, and exact qualification activation timing still require separate confirmation. Do not infer or implement those unresolved rules from this section.


## PV and Group PV/GVP definitions — confirmed by user

- **PV means Product Value.**
- **Personal PV** is the sum/gathering of Product Value from the member's own personal purchases during that member's one-year qualification cycle.
- **Group PV (GVP)** is the sum/gathering of Product Value from purchases/sales made by the member's downlines across Unilevel Levels 1 through 10.
- The Group PV/GVP calculation includes the member's downline network only through Level 10.
- **Branch Operator and Mobile Stockist activity is excluded** from this Group PV/GVP qualification calculation. Branch and Mobile Stockist purchases/sales must not be added to a member's Group PV/GVP.
- These definitions apply to the annual JMO/SMO qualification thresholds already specified above. Personal PV and Group PV/GVP must each meet the applicable threshold within the same one-year member-specific cycle.

Implementation must distinguish distributor/downline product purchases that generate qualifying Product Value from branch/mobile stockist inventory or replenishment activity. Do not count branch/mobile stockist transactions toward personal PV or Group PV/GVP unless the user separately defines a qualifying personal purchase by a person who also has one of those operational roles.


### Group PV/GVP downline eligibility clarification — confirmed

Group PV/GVP includes purchases from **all downlines at Unilevel Levels 1–10**, regardless of whether an individual downline member is currently active or inactive. Do not filter Group PV/GVP by downline account activation status. The existing exclusions remain: Branch Operator and Mobile Stockist inventory/replenishment activity is not included in Group PV/GVP.


## Rank promotion and immediate commission eligibility — confirmed

- JMO or SMO qualification is achieved as soon as the member reaches **both** required thresholds for that rank within the current one-year qualification cycle.
- The additional 1.3% commission for that rank becomes effective **immediately upon achieving both thresholds**. It does not wait until the end of the annual cycle.
- JMO requires both 5,000 Personal PV and 50,000 Group PV/GVP in the current cycle.
- SMO requires both 50,000 Personal PV and 250,000 Group PV/GVP in the current cycle.
- Meeting only one of the two thresholds does not activate the rank addition.
- If both ranks' thresholds are met, both separate 1.3% additions apply (2.6% total rank additions) at each eligible Unilevel level where the member is beneficiary.
- The implementation must record an authoritative qualification-achieved/effective timestamp so that the additional commission is applied only to eligible orders according to the rank's effective time. Do not retroactively apply a rank addition to orders before qualification was achieved.
- The existing annual reset rule remains: if either required threshold is not achieved by the end of the member's one-year cycle, the rank and its associated additional 1.3% eligibility do not carry into the next cycle; counters reset and the member must qualify again.


## Product replacement policy — confirmed by owner

The owner clarified the product replacement policy on 2026-11-15:

- Product orders are not cancelled or refunded. Product replacement is allowed.
- A customer may replace an item with another product of the same, higher, or lower PV.
- If the replacement product costs more, the customer pays the price difference. Example: replace Spirulina (₱350, 20 PV) with Serpentina (₱600, 25 PV); the customer pays an additional ₱250 and the order's PV increases from 20 PV to 25 PV.
- If the replacement product has a lower price, **no change/sukli is given** to the customer. The customer does not receive the price difference back.
- The order's PV follows the replacement product's PV. If the customer chooses a lower-PV replacement, the order PV is adjusted to that lower PV; do not preserve the original product's higher PV.
- If the replacement product has the same price, no additional payment or change is due; PV follows the replacement product.

Implementation must record the original item, replacement item, price difference collected (if any), and PV adjustment in an auditable replacement record. Do not treat a replacement as a cancellation/refund. The exact accounting treatment of any unreturned price difference on a lower-priced replacement must be represented without issuing customer change or a refund.


### Commission settlement and replacement PV clarification — confirmed by owner

The owner clarified on 2026-11-15:

- If Unilevel commission has already been released or withdrawn before a product replacement, that already-released/withdrawn commission is not returned to zero or clawed back because of the replacement.
- Promotion qualification PV must still follow the product replacement rule above. The PV credited for promotion qualification is adjusted to the replacement product's PV, even if the related Unilevel commission was already released or withdrawn.
- Therefore, a lower-PV replacement lowers the order's promotion PV to the replacement product's PV; a higher-PV replacement raises it accordingly. Do not preserve the original PV solely because commission was already released or withdrawn.

This clarification does not authorize changing or reversing already-settled commission amounts. The implementation must keep the replacement PV adjustment and the historical commission settlement as separately auditable records.


### Product replacement responsibility and approvals — confirmed by owner

The owner confirmed on 2026-11-15 that replacement handling is distributed across departments, with each department acting within its own responsibility. A replacement does not require every department to approve every request as a universal sign-off. The relevant department handles the part of the workflow assigned to its role.

- Branch Operator: handles replacement requests and product/inventory actions for orders fulfilled by that Branch Operator.
- Mobile Stockist: handles replacement requests and product/inventory actions for orders fulfilled by that Mobile Stockist.
- Marketing Officer: handles the marketing/oversight responsibilities assigned to the Marketing Officer in the replacement workflow.
- Admin: handles administrative oversight and any admin-only controls assigned in the replacement workflow.

Exact permission boundaries, escalation conditions, and which role has final authority for disputed or exceptional cases remain to be specified. Do not infer that every department has blanket approval rights over every replacement.


### Replacement price-difference collection — confirmed by owner

The owner confirmed on 2026-11-15 that when a replacement requires an additional payment because the replacement product has a higher price, the department/person handling that order collects the price difference. Do not route collection automatically to Admin when another department is responsible for fulfilling the order. The collection and replacement adjustment must be recorded in the order/replacement audit trail.


### Customer replacement concerns and point of service — confirmed by owner

The owner clarified on 2026-11-15 that a customer should bring a product replacement concern to the store where the product was originally purchased. That store is the customer's point of contact for handling the replacement concern. This does not establish a blanket approval role for Marketing Officer or Admin; escalation beyond the original store remains to be defined.


### Replacement time limit and recordkeeping — confirmed by owner

The owner confirmed on 2026-11-15:

- Product replacement is permitted only within 48 hours after purchase.
- The customer must bring the replacement concern to the store where the product was originally purchased.
- A separate replacement-record workflow is not required.
- Existing order/product data and the applicable PV adjustment remain governed by the previously approved replacement rules; this decision only removes the requirement for a separate replacement record.


### Replacement 48-hour clock start — confirmed by owner

The owner confirmed on 2026-11-15 that the 48-hour replacement window is measured from the exact purchase transaction timestamp, not from the end of the purchase date. The replacement deadline is the transaction timestamp plus 48 elapsed hours. Use the authoritative server-recorded transaction time, not the customer's or browser's local clock.
