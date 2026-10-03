## ImageKit uploads

Copy `.env.example` to `.env` and add the ImageKit private key, public key, and URL endpoint. The backend signs short-lived uploads at `/api/courses/upload-auth`; the private key is never sent to the browser.
# CRM Backend

This backend is built with Node.js and Express, using Firebase Admin for Firestore database access.

## Available endpoints

- `POST /api/auth/login` - login with `username` and `password`
- `POST /api/auth/signup` - signup with `name`, `username`, and `password`
- `GET /api/users` - get all users (requires `Authorization: Bearer <token>`)
- `POST /api/users` - create a new user (requires auth)
- `GET /api/leads` - get all leads (requires auth)
- `POST /api/leads` - add a new lead (requires auth)

## Local development

1. Copy `.env.example` to `.env`
2. Set `JWT_SECRET` and `FIREBASE_SERVICE_ACCOUNT_PATH`
3. Run `npm install`
4. Run `npm run dev:api`

## Vercel deployment notes

- Use Vercel environment variables rather than `.env`
- Set `JWT_SECRET`, `FIREBASE_SERVICE_ACCOUNT_BASE64`, and `VITE_API_BASE_URL`
- Deploy using Vercel's Node.js functions or an external backend server on the same domain if needed.

## Admin and IT projects

Project records use `Project/{Employee Name--Employee ID}/{Project ID}/Project Data`.
The employee document stores assignment identity; each project ID is a subcollection
containing one `Project Data` document. Employee IDs distinguish duplicate names.
Existing employee folders are reused after name changes.

- `GET /api/projects`: Admin sees all projects; IT employees see only their assignments.
- `POST /api/projects/pdf`: authenticated Admin/IT PDF upload, maximum 3 MB per file.
  The server verifies the PDF signature and uploads only to ImageKit using
  `IMAGEKIT_PRIVATE_KEY`. It returns a signed upload receipt, valid for 24 hours.
- `POST /api/projects`: Admin-only creation; validates an existing IT assignee and
  upload receipts, generates a project ID and saves status `New`.
- `PATCH /api/projects/:employeeKey/:id`: Admin or the assigned employee can
  accept/reject a new project or update its progress and completion status.

Firestore stores project fields and PDF metadata (`name`, `type`, `size`, `fileId`,
`url`), never PDF bytes or base64. Configure the existing Firebase Admin credentials
and `IMAGEKIT_PRIVATE_KEY` on the backend, then restart the API. No browser Firebase
credentials or public Firestore rules are needed; requests use the existing JWT login.
IT projects refresh on login, tab focus and every 15 seconds while visible.
Existing browser-only demo projects are not migrated automatically.

Verification (mocked Firestore/ImageKit; does not write production data):
`node --experimental-test-module-mocks --test backend/tests/projects.test.js`

Project storage omits empty strings/maps/lists and duplicate path/employee identity
fields (`id`, `projectId`, `employeeKey`, `assignedEmployeeId`, `assignedEmployeeName`).
The API reconstructs those fields from the path and employee parent document.
Unused `createdById` and redundant completion values are omitted; project dates,
nonempty content, PDF metadata, and status history remain intact.
Existing records are compacted on their next update. For a one-time cleanup:
`node backend/scripts/compactProjects.js` previews the number of affected records;
`node backend/scripts/compactProjects.js --apply` backs up originals under
`backups/projects/` (ignored by Git) before replacing records. Concurrently edited
records are not overwritten.
