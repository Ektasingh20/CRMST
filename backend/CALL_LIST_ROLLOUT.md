# Call list rollout

## Storage choice

New imports and manually created contacts use `listData/{services|training}/crmExecutives/{employeeId}/dates/{YYYY-MM-DD}/calls/{callId}`. The date folder comes from the contact's Excel Date value; if that column is absent, it uses the actual upload day in India. `uploadDate` and `createdAt` still record the actual upload time. The `dates/{date}` document exists so its folder appears in the Firestore console. Existing direct `crmExecutives/{employeeId}/calls/{callId}` records remain readable until an approved migration moves them. The contact date is immutable after creation because it determines its path.

Before starting a new upload batch, the API checks every contact row for name, phone, date, and duplicate phone numbers in the file or existing CRM data. It returns the Excel row numbers for all known issues and writes no contacts when any issue exists. A connection failure during a later batch can be retried with the same file and upload batch ID to finish the remaining rows.

The CRM no longer creates call-history subcollections or shows a View History action, as requested after the initial implementation. Committed edits still update the contact document transactionally, and `lastMutationId` prevents a retried request from repeating the same write. `lastCallClickedAt` is a dialing attempt, not confirmed call duration; duration fields remain null.

## Before production deployment

1. Export the Firestore database with the managed Firestore export facility to a restricted Cloud Storage bucket. Record the export location and document counts by call type and employee. Do not use the old `migrateCallListHierarchy.js` script for this rollout.
2. Deploy `firestore.indexes.json` and wait for the new collection group indexes to finish building.
3. Run `node backend/scripts/migrateCallListDates.js --project=<project-id>` to preview direct-path contacts, dated folders, linked leads, and blockers. Test the same migration with `--apply --expected=<preview-count> --backup=<absolute-path-outside-repo>` against a staging or emulator copy. The script backs up source calls and linked lead documents before transactionally moving calls and updating lead path references. Production application requires the user's separate approval, as specified in the original task document.
4. Test import retries with the same `uploadBatchId`, concurrent employee edits, call and WhatsApp actions, lead approval, date filters, and PDF exports against staging data.
5. Deploy the API and frontend together. Check API errors, Firestore index errors, and read/write volume. Existing records continue to load through their current paths until migration. After approval, apply the migration with the exact preview count and verify direct-path call count is zero and dated-path count matches the pre-migration total.

## Rollback

Revert the API and frontend release if necessary, but keep the history-removal change in the API so a rollback does not recreate history documents. Do not restore the whole database over newer live edits. If a data repair becomes necessary, compare the Firestore export with current documents by path and restore only verified missing documents after separate approval.

## Current limits

The admin dashboard uses count aggregations and 25-record cursor pages across both direct and dated employee collections. Once the collection-group indexes are built, pages query across dates directly. While indexes are unavailable, pages fall back to walking date collections; this can read many streams as the number of dates grows. Service/training, employee, date, call status, interest, program, and name/phone filters use the paged API. Date ranges and other row filters are checked on the server while walking ordered Firestore pages. Employee reads, duplicate checks, manual contact creation, and call lookups use direct collection queries if their collection-group indexes are not yet built. Call-lead panels, PDF export, detailed reports, and the CRM employee dashboard still load complete relevant call sets. No live contact path migration has been performed yet.

## Authorized history cleanup

On 14 November 2026, the user explicitly chose to remove call history and delete its existing records. `node backend/scripts/deleteCallHistory.js --project=crmst-71cb5 --expected=621 --apply` deleted exactly 621 `listData` call-history documents; verification found zero remaining. The call collection still contained 599 contacts (300 service, 299 training). No call contact documents were deleted. The removed history events were intentionally not retained.

The read-only date migration preview on 14 November 2026 found 599 direct-path contacts (300 service, 299 training), two distinct employee/date folders, one linked lead, zero existing destination documents, and zero blockers. Production migration is waiting for the approval required by the original task document. No production call paths were changed during this preview.

Read-only verification on 14 November 2026 found 22 service calls and 15 training calls in the current employee collections. All 37 had `listType` and `createdAt`; none had `uploadDate`. The new count and cursor-page functions returned 37 unique records across two 25-record pages. Paged date-range and status queries succeeded. The live employee collection-group query reported a missing `assignedTo` index; the direct fallback returned the employee's records. A direct contact equality query also succeeded. No customer values were printed during these checks.
