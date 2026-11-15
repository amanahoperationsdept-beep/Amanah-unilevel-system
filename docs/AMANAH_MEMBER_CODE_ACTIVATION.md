# AMANAH role-based member codes

This specification is implemented by migration
`0005_generate_role_member_codes.sql`.

| Database role | Code prefix / value | Example |
|---|---|---|
| `distributor` | `DS` + 4-digit sequence | `DS0001` |
| `mobile_stockist` | `MS` + 4-digit sequence | `MS0001` |
| `branch_operator` | `BO` + 4-digit sequence | `BO0001` |
| `marketing_officer` | `MO` + 4-digit sequence | `MO0001` |
| `administrator` | Fixed value | `ADMIN` |

## Security and login behavior

- A role code identifies the account type during account activation.
- Members sign in with their assigned username and password only.
- The application reads the saved database role and sends the member to that role's dashboard.
- A member code is not a password, username, or login field.
- The generator function is executable only by Supabase `service_role`; never call it from a browser.
- PostgreSQL sequences allocate codes atomically. Gaps can occur if an activation attempt fails after allocation; codes are never recycled.
- The fixed `ADMIN` value assumes one administrator account. Multiple administrator accounts would require a separately approved code convention.

## Generator RPC

Trusted server-side activation code may call:

```ts
const { data: memberCode, error } = await adminClient.rpc(
  "generate_amanah_member_code",
  { p_role: "distributor" },
);
```

Allowed role strings: `distributor`, `mobile_stockist`,
`branch_operator`, `marketing_officer`, and `administrator`.

The RPC only allocates and returns a code. The activation workflow must validate the target account and then save the returned code together with the approved role, username, and active status in one trusted server-side operation. Do not expose the service-role key or allow a public user to choose their own role.

## Deployment note

This is a migration file only. It has not been run against the live Supabase project.
Before applying it, audit the live `profiles.member_code` uniqueness and existing code values.
