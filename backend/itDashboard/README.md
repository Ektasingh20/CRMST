# IT Dashboard Backend

Mounted by `backend/index.js` at `/api/it`. This feature shares the CRM backend's Firebase Admin app and reads credentials from `backend/serviceAccount.json` through `backend/config/db.js`.

Start the IT-only server from the repository root with `npm --prefix backend/itDashboard start` (defaults to `http://localhost:4000`). This avoids the CRM server's unrelated default-admin seeding. Commands are run from the repository root: `npm --prefix backend/itDashboard run discover`, `npm --prefix backend/itDashboard run import -- --dry-run`, `npm --prefix backend/itDashboard run import -- --apply`, `npm --prefix backend/itDashboard run seed`, and `npm --prefix backend/itDashboard test`.

All source-project reads are read-only. Writes are restricted to collections with the `itd_` prefix. Emulator tests use a `demo-*` project and loopback-only endpoints.
