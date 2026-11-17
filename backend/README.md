## ImageKit uploads

Copy `.env.example` to `.env` and add the ImageKit private key, public key, and URL endpoint. The backend signs short-lived uploads at `/api/courses/upload-auth`; the private key is never sent to the browser.
# CRM Backend

This backend is built with Node.js and Express, using Firebase Admin for Firestore database access.

## Available endpoints

- `POST /api/auth/login` - login with `username` and `password`
- `POST /api/auth/signup` - signup with `name`, `username`, and `password`
- `GET /api/users` - get all users (requires `Authorization: Bearer <token>`)
- `GET /api/users/me/profile` - read the signed-in user's account settings
- `PUT /api/users/me/profile` - update the signed-in user's account settings
- `POST /api/users/me/photo` - validate and upload the signed-in user's profile photo to ImageKit
- `POST /api/users/me/documents/:key` - validate and upload one of the signed-in user's settings documents to ImageKit
- `GET /api/users/me/documents/:key` - download one of the signed-in user's settings documents
- `POST /api/users` - create a new user (requires auth)
- `GET /api/leads` - get all leads (requires auth)
- `POST /api/leads` - add a new lead (requires auth)
- `GET /api/hr-helpdesk/conversations` - list the signed-in employee's conversations; HR/Admin see all
- `POST /api/hr-helpdesk/conversations` - start a conversation with `{ "subject": "...", "message": "..." }`
- `DELETE /api/hr-helpdesk/conversations/:id` - hide a conversation from the signed-in user's list; other participants retain access
- `GET /api/hr-helpdesk/conversations/:id/messages` - read a conversation (owner or HR/Admin)
- `POST /api/hr-helpdesk/conversations/:id/messages` - send `{ "text": "..." }` (owner or HR/Admin)
- `GET /api/attendance/today` - read only the signed-in employee's current India work date
- `GET /api/attendance/month?month=YYYY-MM` - read only the signed-in employee's selected month
- `POST /api/attendance/check-in` - transaction-safe self check-in; employee identity, date, and timestamp are server-derived
- `POST /api/attendance/check-out` - transaction-safe, idempotent self check-out with server-calculated worked minutes
- `GET /api/attendance/admin` - HR/Admin cursor page with date, month, employee, and status filters
- `GET /api/attendance/admin/summary?date=YYYY-MM-DD` - Firestore aggregate counts for HR/Admin

Helpdesk data is stored under each employee at `hrHelpdeskEmployees/{employeeId}/hrHelpdeskThreads/{conversationId}/messages/{messageId}`. HR and Admin list all employees' threads through a collection-group query; CRM and IT employees read their own folder. Deleting a conversation adds the signed-in user's ID to `hiddenFor`; it does not delete the conversation or messages for other participants. HR can start a direct conversation by including `employeeId` in the create request. To move the old flat collection, run `node backend/scripts/migrateHrHelpdeskConversations.js --prepare`, review the local backup, then run `node backend/scripts/migrateHrHelpdeskConversations.js --apply --operation=<prepared-id>`.

Deploy the `hrHelpdeskThreads` collection-group field indexes from `firestore.indexes.json` for the sorted HR list and lookup by conversation ID. Until the indexes are ready, HR list reads use a collection-group scan and sort the results in the API. Employee list reads stay scoped to that employee's folder.

## Profile uploads

Profile photos are uploaded through the authenticated backend to ImageKit; the user document stores only `imageUrl` and `imagePublicId`. Account-document metadata is stored at `users/{department}/members/{userId}/profileDocuments/{documentKey}` with only `url`, `fileId`, `name`, `type`, `size`, and `updatedAt`. File bytes and base64 payloads are never stored in Firestore. PDF, JPG, and PNG documents are accepted up to 5 MB after their actual file signatures are validated.

## Notification hierarchy

Employee notifications are stored at `users/{department}/members/{userId}/notifications/{notificationId}`. Student notifications are stored at `students/{studentId}/notifications/{notificationId}`; the stable student ID is the folder name and the student's current display name is saved as metadata. New writes use only these nested paths. The legacy flat collection can be audited with `npm run plan:notifications` and migrated after backup with `node backend/scripts/migrateNotificationsHierarchy.js --apply --confirm=MOVE_LEGACY_NOTIFICATIONS`.

## Local development

1. Copy `.env.example` to `.env`
2. Set `JWT_SECRET` and `FIREBASE_SERVICE_ACCOUNT_PATH`
3. Run `npm install`
4. Run `npm run dev:api`

## Vercel deployment notes

- Use Vercel environment variables rather than `.env`
- Set `JWT_SECRET`, `FIREBASE_SERVICE_ACCOUNT_BASE64`, and `VITE_API_BASE_URL`
- Deploy using Vercel's Node.js functions or an external backend server on the same domain if needed.
- Set `CRON_SECRET` for attendance automation. The root `vercel.json` calls `GET /api/attendance/auto-mark` at 06:30 UTC (12:00 PM IST), Monday through Saturday. If the backend is deployed separately, configure the same authenticated schedule on its host.

## Attendance automation

New attendance data is stored at `attendance/{employeeId}/months/{YYYY-MM}/attendanceDays/{YYYY-MM-DD}`. Parent month documents are not written. Daily documents use Firestore `Timestamp` values and deterministic IDs. Legacy flat documents remain readable until the separately approved copy migration described in `ATTENDANCE_ROLLOUT.md`.

The daily finalization job runs at 00:15 IST (18:45 UTC) and processes only completed dates; batch planning is capped at yesterday in Asia/Kolkata, even when a caller supplies a later date. Automatic absence writers reject current and future dates. It considers active non-student employees with a valid `joined` date. Each employee's cursor is stored at `attendance/{employeeId}/automation/state`; only complete batches of five eligible working days are finalized. Weekly and configured company holidays do not count toward the batch, while approved leave does. Missing attendance is created as Absent only after the whole batch completes; existing Present, Absent, and Leave records are preserved. Deterministic creates and a monotonic cursor make retries safe.

The calendar configuration is stored at `settings/attendanceCalendar`:

```json
{
  "weeklyHolidays": [0],
  "weeklyHolidayPaid": true,
  "holidays": [
    { "date": "2026-01-26", "label": "Republic Day", "paid": true }
  ]
}
```

Weekday numbers use JavaScript's convention (`0` Sunday through `6` Saturday). The default is paid Sunday holidays and no company holidays. HR/Admin can read or update this configuration through `GET`/`PUT /api/attendance/calendar`. The first automation run also persists `automationStartDate` on this document so deployment does not backfill years of absences for existing employees.

The authenticated employee month endpoint remains scoped to one employee/month, returns no future month, and bounds current-month attendance reads through today's date. HR/Admin payroll loads a month through `GET /api/attendance/admin/month`, which uses one month-scoped attendance collection-group query, a bounded approved-leave lookup, and one calendar read. HR Salary Report and new Payroll drafts use these shared classifications; existing saved payroll records are not recalculated.

Run `npm run plan:future-attendance` for a read-only audit of future-dated nested and legacy attendance records. The attendance hierarchy migration also skips future-dated legacy attendance. The audit never reads leave-request or holiday-configuration collections and performs no writes or deletes.

For 1,000 employees completing the same five-day batch, the scheduler reads about 1,000 cursor documents plus existing attendance documents (at most about 5,000 for the five dates), matching approved leave documents, and one calendar document. A fully missing batch can write at most 5,000 deterministic absence documents plus 1,000 cursor updates. The monthly HR endpoint reads the saved month records in one query (up to about 31,000 documents for a fully populated 1,000-employee month), plus overlapping approved leaves and one calendar document; it avoids one query per employee.

Check-in normally costs one legacy-compatibility read, one transactional daily-document read, and one write, plus a calendar read. A duplicate retry performs no write. Check-out reads today's and the previous work date in one transaction and performs one write; a duplicate retry performs no write. Admin pages remain capped at 50 records and use document cursors rather than offsets. Serverless deployments must call `GET /api/attendance/auto-mark` with `Authorization: Bearer <CRON_SECRET>` daily at 18:45 UTC. Employees cannot change an automatic absence; an Admin can correct one with `PATCH /api/attendance/:id` and `{ "status": "Present" }` or `{ "status": "Absent" }`. Correction history preserves the previous remark and source.

Set `REQUIRE_FIREBASE_APP_CHECK=true` only after the frontend is configured to send a valid `X-Firebase-AppCheck` token. App Check is additional abuse protection and does not replace the signed CRM session or backend authorization.
