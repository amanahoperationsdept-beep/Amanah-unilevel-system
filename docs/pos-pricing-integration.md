# AMANAH POS pricing integration

## Official price source

The live Supabase `public.products` table is the source of truth for current catalog prices. The application must select a price by the authenticated buyer's approved position; it must never accept a price sent by the browser as authoritative.

| Product | SRP | Distributor | Mobile Stockist | Branch Operator | Marketing Officer |
|---|---:|---:|---:|---:|---:|
| Spirulina | 350 | 304 | 273 | 227 | 196 |
| Serpentina | 600 | 522 | 460 | 390 | 336 |
| Glutagen CEE | 600 | 522 | 460 | 390 | 336 |
| Max C Pro | 1000 | 870 | 800 | 710 | 620 |
| Baskug | 450 | 391 | 355 | 317 | 279 |
| Barakah | 450 | 391 | 355 | 317 | 279 |
| Herbal Oil | 180 | 156 | 140 | 125 | 110 |
| Herbal Rub | 125 | 108 | 110 | 90 | 77 |

Herbal Rub is an intentional exception: Mobile Stockist is ₱110 and Distributor is ₱108. Do not recalculate the matrix from discount percentages.

## Current implementation boundary

- `src/lib/pricing.ts` provides a typed helper to select the correct price field.
- The Distributor workspace now reads active products from Supabase and displays the live `distributor_price` field. Its cart is browser-only and is not an order.
- The helper does not create orders, grant role access, or trust client-submitted prices.
- Existing application authentication currently recognizes only `admin` and `distributor`. The live business database has additional operational roles, but they must not be enabled in the UI until the app's authorization model and database constraints are reconciled.
- The original checked-in migration defines an older product/order schema (including `retail_price` and `unit_price_snapshot`). The live Supabase schema inspected for this project instead uses `srp`, the four position price columns, and `order_items.unit_price`. Do not blindly replay or apply the old migration to the live database.

## Required before checkout can be enabled

1. Confirm the live schema for `orders` and `order_items`, including required columns, status values, quantity constraints, and RLS policies.
2. Reconcile application role authorization with the approved live profile roles. Keep role changes Admin-controlled.
3. Implement a server-only checkout action that loads the authenticated member's active profile and product prices from Supabase. Ignore any browser-supplied unit price.
4. Insert the server-calculated unit price into `order_items.unit_price` and preserve it as the order-time price snapshot.
5. Validate inventory, fulfillment destination, payment mode, and order status transitions before enabling sales.
6. Test each position, all eight products (including the Herbal Rub exception), unauthorized role access, inactive products, and tampered client prices.

## Safety rule

No live order, inventory movement, payment, commission, or payout is created by this pricing helper or the temporary cart. Checkout must remain disabled until the live schema and authorization checks above are verified.
