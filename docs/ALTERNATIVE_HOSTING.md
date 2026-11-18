# Alternative hosting preparation (no deployment)

## Application architecture

AMANAH is a Next.js 15 application using server actions, middleware, and
Supabase server-managed authentication cookies. It must run as a Node.js
application or compatible container. GitHub Pages is static hosting and is
not a suitable runtime for the protected application.

This repository now includes a Dockerfile using Next.js standalone output.
It is intentionally provider-neutral: any container host that supports a
Node.js 20 image, HTTPS, environment variables, and a persistent application
process can be evaluated.

## Runtime configuration

Configure these values in the hosting provider's secret/environment settings:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Never put a Supabase service-role key in browser-visible variables. Do not
commit production credentials or copy secrets into Docker build arguments.

## Build and run locally

```sh
docker build -t amanah-unilevel .
docker run --rm -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT.supabase.co" \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_ANON_KEY" \
  amanah-unilevel
```

Open `http://localhost:3000`. Use a disposable development Supabase project
for authentication integration tests. Do not test account provisioning,
orders, payments, stock, commissions, or payouts against production.

## Before choosing a host

1. Confirm the provider supports a long-running Node.js 20 container and
   Next.js server actions/middleware.
2. Confirm HTTPS, custom domains, environment secrets, logs, and rollback.
3. Configure the final public site URL and matching Supabase Auth redirect
   allow-list only after the provider is selected and reviewed.
4. Run GitHub Actions and a disposable-project authentication smoke test.
5. Review privacy, backups, monitoring, and operational ownership.

## Explicitly not done

- No hosting provider has been selected.
- No account, project, domain, DNS, or environment secret has been created.
- No deployment or production configuration has been changed.
- GitHub Pages remains unchanged.
- No live database migration or business transaction was run.

## Product storefront and cart scope

The public landing page uses the existing eight product image/catalog entries.
Retail prices and PV remain unconfirmed and are not invented. The cart is a
browser-session selection preview only; checkout, order creation, payment,
inventory reservation/deduction, and commission posting are not enabled.

## Role support gap

The current repository schema and sign-in action support only `admin` and
`distributor`. Marketing Officer, Branch Operator, and Mobile Stockist are
not yet represented in the current role enum or authorization route checks.
They must not be exposed as working login portals until the schema, role
provisioning, RLS, route guards, and role-specific dashboard permissions are
reviewed and implemented as a separate security increment.
