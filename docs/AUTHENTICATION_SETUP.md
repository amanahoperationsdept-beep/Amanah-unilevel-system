# AMANAH authentication setup

## What this increment implements

- Email/password authentication through Supabase Auth.
- Server-managed Supabase session cookies, refreshed by Next.js middleware.
- Separate /admin and /distributor entry routes.
- Server-side role and account-status checks against the authenticated user's own
  public.profiles row.
- Sign-out through a server action.

The browser receives only the Supabase project URL and anon key. The service-role
key is not used by the authentication flow and must never be exposed to the browser.

## Required environment

Set these variables in your local development environment:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

Copy .env.example to .env.local for local development. Restart Next.js after
changing environment variables. Do not commit .env.local.

The current live schema differs from historical repository migrations. Verify any schema-dependent auth behavior against a disposable database before considering a change.

## Account provisioning policy

Public registration and account provisioning are not considered production-ready.
A successful Supabase password check is not sufficient for access; the app must
also verify the authenticated user's profile, role, and active state server-side.
Do not trust role or account-status values supplied by the browser.

The current audited live schema uses `public.profiles.is_active` and the
`amanah_role` enum (including `administrator` and `distributor`). Earlier
bootstrap examples in this document used a different schema (`status`,
`admin`, and `genealogy`) and are **obsolete and unsafe to reuse**. They have
been removed. Do not run manual profile/bootstrap SQL from older copies of this
document against the live project.

No administrator creation, account recovery, password reset, or live
provisioning action is authorized by this guide. Preserve existing Auth IDs and
profiles; use a reviewed, schema-specific procedure only after explicit approval.

## Important limitations

- Password recovery, invitations, and distributor self-registration are not
  implemented yet.
- The workspace entry pages show only the authenticated profile identity; they
  do not query live business metrics.
- Admin bootstrap is a documented manual development procedure, not an
  application feature.
- RLS, migrations, and authentication still require integration testing against
  a disposable Supabase project before production use.
