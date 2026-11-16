# AMANAH live schema baseline procedure

## Purpose

Create a reproducible, read-only metadata snapshot of the existing Supabase database before any schema repair. This is an audit artifact, not a migration and not a backup of application data.

## Target

- Supabase project ref: `bqgxvnrgjmngezknqhsl`
- SQL Editor: https://supabase.com/dashboard/project/bqgxvnrgjmngezknqhsl/sql/new
- Script: [amanah-live-schema-baseline.sql](./amanah-live-schema-baseline.sql)

Confirm the project ref in the Supabase dashboard before running anything. Do not run against a different project.

## Run procedure

1. Open the SQL Editor for the existing AMANAH project.
2. Open `docs/amanah-live-schema-baseline.sql` from this repository.
3. Copy the script into the SQL Editor and run it as a read-only audit.
4. Save/export each result set separately, preserving its numbered section (00–18) and the capture timestamp from section 00.
5. Review the output for accidental secrets or personal information before sharing. This script is designed to return schema/catalog metadata and aggregate counts only; do not add queries that return member names, email addresses, phone numbers, activation-code values, wallet balances, or other personal/financial row data.
6. Provide the result sets for reconciliation. Keep the original unedited exports privately as the audit evidence.

## Safety

- The script contains SELECT statements only. It does not create, alter, drop, grant, revoke, insert, update, or delete anything.
- Do not execute historical migrations 0001–0006 as part of this procedure.
- Do not create a migration ledger by guessing which migrations were applied.
- Do not include API keys, passwords, service-role keys, access tokens, auth.users records, or credentials in exports or GitHub.
- Catalog visibility can depend on the SQL Editor execution role and PostgreSQL/Supabase version. If a query errors or returns incomplete metadata, report the exact section and error; do not improvise a write operation.
- The aggregate counts in section 18 cover the core audited tables. If one of those tables is absent, that query will fail and should be adjusted only after verifying the live table inventory.
- This baseline script captures current definitions and privileges, but it is not a point-in-time physical backup and does not prove historical migration order. A separate Supabase backup/export under the owner's approved backup process is required before any future live schema change.

## Baseline acceptance checklist

- [ ] Section 00 identifies the correct project/database and timestamp.
- [ ] Sections 01–05 capture schemas, relations, columns, constraints, and indexes.
- [ ] Section 06 captures RLS flags and policies.
- [ ] Sections 07–09 capture object ACLs, schema privileges, and default privileges.
- [ ] Sections 10–11 capture function definitions and triggers.
- [ ] Sections 12–16 capture enums, sequences, views, extensions, and relevant role attributes.
- [ ] Section 17 records migration-like catalog tables without treating Supabase subsystem history as the app migration ledger.
- [ ] Section 18 records aggregate counts only.
- [ ] Results have been reviewed and compared against the current application branch and migration files.
- [ ] No live schema or data changes have been made.

## Current A1.1 reconciliation status (2026-11-16)

A1.1 has been closed as a current-state schema reconciliation using the detailed read-only live-schema audit findings already recorded in `docs/PROJECT_PROGRESS.md` and comparison against repository migrations 0001–0006. The user later supplied only section 18 aggregate counts from this script and confirmed no other result sets are available. Those counts are supplementary; they are not a complete export of sections 00–17.

The historical migration ledger remains unavailable: no AMANAH project migration-history table was found in the reviewed catalogs, so the exact applied migration set/order cannot be proven. This exception is documented and must not be filled by guessing. The live database is treated as the operational baseline, and migrations 0001–0006 must not be replayed against it.

This procedure remains useful for capturing a fuller, reproducible metadata export before any future schema change. A complete export and approved backup should still be obtained before designing or applying any forward-only corrective migration. This document does not authorize a database write.
