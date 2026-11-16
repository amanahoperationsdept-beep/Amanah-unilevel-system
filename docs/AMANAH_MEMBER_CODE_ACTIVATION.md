# AMANAH activation codes, member codes, and login credentials

## Customer registration flow

1. AMANAH issues one unique activation code for a specific account type. The activation code is the only code printed on the receipt.
2. The customer enters that activation code during registration and creates a username and password.
3. The server validates the activation code, determines the account type from its stored assignment, and prevents the customer from choosing or changing their role in the browser.
4. On successful registration, the system internally allocates and stores the account's member code:
   - Distributor: `DS0001`, `DS0002`, ...
   - Mobile Stockist: `MS0001`, `MS0002`, ...
   - Branch Operator: `BO0001`, `BO0002`, ...
   - Marketing Officer: `MO0001`, `MO0002`, ...
   - Administrator: `ADMIN` (single administrator convention only)
5. The activation code is redeemed once and cannot be reused. It is not the member code, username, or password.
6. After registration, the member logs in using the username and password they created. The application reads the saved role and routes the member to the correct dashboard.

## Important distinction

- **Activation code:** issued by AMANAH, printed on the receipt, entered once during registration, and associated server-side with the account type and validity rules.
- **Member code:** generated and stored internally after successful activation; it identifies the member and is not a login credential.
- **Username/password:** created by the member during registration and used for dashboard login. Neither is printed on the activation receipt.

## Activation-code inventory and redemption

The activation-code inventory and redemption workflow is separate from the member-code generator in migration
`0005_generate_role_member_codes.sql`. That migration does not create, issue, validate, or redeem activation codes.

The implementation must:
- generate unpredictable activation codes on the server;
- store only a cryptographic hash of each activation code;
- associate each code with its intended role, issuer, status, and optional expiry;
- redeem each code atomically and only once;
- derive the role from the stored code record, never from a submitted browser field;
- rate-limit or otherwise protect repeated invalid-code attempts;
- avoid logging or displaying activation codes after issuance except in the one-time issuance response/receipt workflow;
- create the Supabase Auth user and profile safely, with cleanup if either step fails.

## Member-code generator

The migration's RPC is intended for trusted server-side activation only:

```ts
const { data: memberCode, error } = await adminClient.rpc(
  "generate_amanah_member_code",
  { p_role: "distributor" },
);
```

Allowed role strings: `distributor`, `mobile_stockist`,
`branch_operator`, `marketing_officer`, and `administrator`.

The function is executable only by Supabase `service_role`; never call it from a browser or expose the service-role key. PostgreSQL sequences allocate codes atomically. Gaps can occur if an activation attempt fails after allocation; codes are never recycled.

The fixed `ADMIN` value assumes one administrator account. Multiple administrator accounts require a separately approved code convention.

## Database and deployment safety

The member-code migration and any future activation-code migration are code only until explicitly reviewed and applied. Before applying the member-code migration, audit live `profiles.member_code` uniqueness and existing code values. Also verify username uniqueness and the live profile constraints.

Do not apply migrations to the live Supabase project or deploy to production without explicit approval.


## Reservation and expiry contract (A1.2 draft)

- Newly issued activation codes expire 30 days after issuance.
- A reservation is an atomic 15-minute lease owned by one pending registration attempt.
- A new reservation attempt may reclaim a reservation whose lease is at least 15 minutes old, but only if the code itself has not expired and has not been used.
- A code whose `expires_at` has passed is marked expired on the next reservation or release attempt and cannot be reserved again.
- Releasing a still-valid reservation returns it to `issued`; releasing an expired reservation marks it `expired`.
- The database stores only the SHA-256 code hash. The raw code is returned only once at issuance.
- The A1.2 migration targets the audited live table contract (`created_by`, `expires_at`, `used_at`, `used_by`) and adds role/status/reservation fields. It deliberately aborts if the live activation_codes table is non-empty, because existing rows cannot be assigned roles safely without an owner-approved reconciliation.
- Registration completion must independently re-check reservation owner, lease age, `expires_at > now()`, and `used_at is null` in the same transaction that redeems the code. That completion transaction is part of the subsequent registration integration task; this A1.2 draft does not make the existing live registration flow operational by itself.
- Never apply this migration to live until the exact schema preconditions, backup, migration diff, and completion-function integration have been reviewed and explicitly approved.
