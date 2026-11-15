# AMANAH activation codes, member codes, and receipt credentials

## Customer registration flow

1. AMANAH issues the customer one unique activation code. This is the only code the customer needs to enter during registration.
2. The customer enters the activation code in the registration form and creates or receives their username and password as defined by the registration process.
3. The server validates the activation code, determines the account type from the code's stored assignment, and activates the correct role. The customer must not be able to select or change their role in the browser.
4. The system internally allocates the account's member code:
   - Distributor: `DS0001`, `DS0002`, ...
   - Mobile Stockist: `MS0001`, `MS0002`, ...
   - Branch Operator: `BO0001`, `BO0002`, ...
   - Marketing Officer: `MO0001`, `MO0002`, ...
   - Administrator: `ADMIN` (single administrator convention only)
5. The receipt includes the assigned username and password as requested by AMANAH. The activation code is for registration/activation only; it is not used to log in.
6. After registration, the member logs in using username and password only. The application reads the saved role and routes the member to the correct dashboard.

## Important distinction

- **Activation code:** issued by AMANAH, entered once during registration, and associated server-side with the account type and any required issuance/validity rules.
- **Member code:** generated and stored internally after successful activation; it identifies the member and is not a login credential.
- **Username/password:** credentials used for dashboard login. The activation code and member code are not login credentials.

The activation-code inventory and redemption workflow is a separate feature from the member-code generator in migration
`0005_generate_role_member_codes.sql`. That migration does not create, issue, validate, or redeem activation codes.

## Receipt password safety

Printing a permanent password in plaintext on a receipt creates a risk if the receipt is lost or photographed. Preferred implementation: issue a one-time temporary password, require the member to change it at first login, and never store or log the plaintext password. If AMANAH requires the receipt to contain the final password, this should be an explicit security decision; the system must still avoid logging or exposing it in admin screens.

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

## Deployment note

The migration is code only and has not been run against the live Supabase project. Before applying it, audit the live `profiles.member_code` uniqueness and existing code values. The activation-code issuance/redemption workflow still needs to be implemented and reviewed separately.
