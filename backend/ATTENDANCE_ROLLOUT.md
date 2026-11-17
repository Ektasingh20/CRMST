# Nested attendance rollout

## Storage model

New attendance writes use:

`attendance/{employeeId}/months/{YYYY-MM}/attendanceDays/{YYYY-MM-DD}`

The daily date is deterministic and the employee and month parent documents are not written. Check-in and check-out timestamps, creation time, update time, and correction time are Firestore `Timestamp` values. The authenticated API derives employee identity and India work date; it does not accept those values from the browser.

Legacy flat `attendance/{recordId}` documents remain readable. New writes do not modify or delete them, except that an already-open legacy check-in can still be checked out safely during the transition.

## Before deployment

1. Deploy the Firestore indexes in `firestore.indexes.json` and wait until every `attendanceDays` and `leaves` index is ready.
   The finalization job temporarily reads exact daily documents for eligible employees while the date collection-group index builds; it never infers an absence from a failed query.
2. Deploy `firestore.rules`. Direct client writes to attendance are denied; the authenticated API performs validated writes with Firebase Admin.
3. Configure `CRON_SECRET` and schedule `GET /api/attendance/auto-mark` daily at 18:45 UTC (00:15 IST), after the preceding work date has completed.
4. Test the API against Firebase Emulator or a staging project before production.
5. Confirm every employee that needs direct Firebase reads has the correct `firebaseAuthUid` mapping. The CRM API remains the supported fallback for legacy accounts without that mapping.

## Calendar and five-day finalization

Company calendar configuration lives at `settings/attendanceCalendar`:

```json
{
  "weeklyHolidays": [0],
  "weeklyHolidayPaid": true,
  "holidays": [
    { "date": "2026-01-26", "label": "Republic Day", "paid": true }
  ]
}
```

The default is Sunday as a paid weekly holiday and an empty company holiday list. HR/Admin can update the document through the authenticated `PUT /api/attendance/calendar` endpoint. The first scheduler run persists `automationStartDate` on the same document. Employees without a cursor start no earlier than this rollout date or their joining date, whichever is later, preventing historical backfill. New and future joiners never receive pre-joining attendance documents.

Employee cursors are stored at `attendance/{employeeId}/automation/state`. A cursor advances only after every missing-day create in each complete five-working-day batch succeeds. Approved leave counts as an eligible working day but is not changed to Absent. Company/weekly holidays are excluded from the count. Retries reuse deterministic `attendanceDays/{YYYY-MM-DD}` documents and advance the cursor monotonically.

## Migration plan

The migration is copy-only and idempotent. It never deletes legacy records.

Dry run:

`npm run plan:attendance-migration`

After reviewing the exact counts and taking a managed Firestore export, an approved staging copy can be run with:

`node backend/scripts/migrateAttendanceHierarchy.js --apply --confirm=KEEP_LEGACY_AND_COPY`

Do not run apply mode against production without explicit approval. Re-run dry mode after copying; `wouldCopy` should be zero and `alreadyMigrated` should match the eligible legacy count.

## Rollback

Rollback the application release if needed. Do not delete nested records and do not restore the whole database over newer writes. The compatibility reader continues to merge legacy and nested records, preferring nested records for the same employee and date.

## Known transition limitation

Admin cursor pagination is optimized for nested `attendanceDays`. The first page also merges bounded legacy results. Complete, stable pagination across both physical layouts is available only after the approved copy migration is complete.

Admin aggregate summaries query nested `attendanceDays` only. During the compatibility period, legacy-only records can appear in the bounded first-page table but are not included in summary cards until the approved copy migration is complete. Official HR attendance endpoints exclude documents marked `isTestData`; the employee report retains the TEST marker for development visibility.

The current default calendar is Monday through Saturday with Sunday as the weekly holiday. All active non-student employees with a valid joining date are included. Holiday dates and paid/unpaid holiday treatment come from `settings/attendanceCalendar`; future dates are not generated or displayed, and unfinalized eligible dates can remain Pending.

## Recovering historical pending attendance

The scheduled job intentionally begins at the persisted `automationStartDate` when an employee has no finalization cursor. This prevents a normal rollout from writing absences for the entire employment history. Consequently, dates before that activation date can remain Pending until an explicitly reviewed backfill is run. Approved-leave lookup uses one collection-group query constrained by `status` and `from`, then filters the end-date overlap in memory. If the required index is not ready, the service uses one collection-group fallback read and emits at most one warning per process. Deploy the indexes above to keep the normal query efficient.

The approved-leave query requires a `leaves` collection-group composite index on `status ASCENDING, from ASCENDING`, plus a collection-group single-field index on `status`. The official daily summary also uses the `attendanceDays` composite index on `workDate ASCENDING, isTestData ASCENDING`. The corresponding entries are in `firestore.indexes.json`; deploy them with `firebase deploy --only firestore:indexes` and wait for them to become ready. Firebase CLI was not available during this code change, so live deployment remains required.

Preview one employee without writes:

```text
npm run backfill:attendance -- --employee=crm_02
```

Only after reviewing the preview and approving the attendance corrections, apply it explicitly:

```text
npm run backfill:attendance -- --employee=crm_02 --apply --confirm=BACKFILL_COMPLETED_ATTENDANCE
```

The backfill starts from each selected employee's joining date, finalizes only complete five-working-day batches through the last completed India date, preserves existing records and approved leave, and uses deterministic attendance document IDs. An explicitly selected former employee is included only by the single-employee backfill command; normal scheduled eligibility is unchanged. `--all-active` can affect substantially more records and must be dry-run and reviewed separately.

## Temporary attendance testing

Temporary test records use the normal `attendance/{employeeId}/months/{YYYY-MM}/attendanceDays/{YYYY-MM-DD}` documents, carry `isTestData`, `excludedFromPayroll`, `simulatedPunches` where applicable, the `integration_test_seed` source, and `payable: false`. They appear with a TEST marker in the employee Attendance Report but are excluded from official HR attendance totals, exports, and payroll. The seed utility does not create leave requests or update leave balances.

Prepare the Ram/November 2026 operation to save an exact local backup of all 16 target documents and print the before/after preview. Preparation performs Firestore reads only:

```text
npm run seed:ram-attendance-test -- --prepare
```

Only apply after reviewing that output and explicitly confirming with the prepared operation ID:

```text
npm run seed:ram-attendance-test -- --apply --confirm=SEED_RAM_ATTENDANCE_TEST --operation=<operation-id-from-preview>
```

The operation manifest contains exact backups for replaced auto-finalized absences, absent-state markers for newly inserted dates, and the proposed test rows. Restore defaults to a dry run, restores original documents exactly, removes only test rows created by this operation, and refuses to overwrite a subsequently changed record:

```text
npm run restore:ram-attendance-test -- --operation=<operation-id>
npm run restore:ram-attendance-test -- --operation=<operation-id> --apply --confirm=RESTORE_RAM_ATTENDANCE_TEST
```
