# HCM Lite · Multi-module HR platform

Multi-company HR administration built with React/Vite and Express/MongoDB. Each company starts in a pending state and is activated by a separately provisioned platform Super Admin.

## Local setup

1. Configure `server/.env` with `MONGODB_URI`, `CLIENT_URL`, `JWT_SECRET`, `SUPER_ADMIN_NAME`, `SUPER_ADMIN_EMAIL`, and a unique `SUPER_ADMIN_PASSWORD` of at least 14 characters.
2. From `server/`, run `npm run bootstrap:super-admin` once. This creates the platform Super Admin with a bcryptjs password hash. Super Admins cannot be created through public signup.
3. Start the API from `server/` with `npm run dev` (or `npm start`). It listens on port 5000 by default.
4. Configure `frontend/.env` with `VITE_API_URL=http://localhost:5000/api` if the Vite proxy is not being used, then run `npm run dev` from `frontend/`.
5. A company administrator submits a company request from the registration tab. They can check the request from the same browser. The company and its admin login remain disabled until the Super Admin approves it. Upon approval, the initial admin is activated and the company code becomes available to the requester.

Environment variables are read from `server/.env`: `PORT` (optional; defaults to 5000), `MONGODB_URI` (required), `MONGODB_DB` (optional database override), `CLIENT_URL` (frontend origin), `JWT_SECRET` (use a long random production secret), `NODE_ENV`, `SUPER_ADMIN_NAME`, `SUPER_ADMIN_EMAIL`, and `SUPER_ADMIN_PASSWORD` (bootstrap only). SMTP settings are optional and used only if mail delivery is configured. Set `VITE_API_URL` in `frontend/.env` to `http://localhost:5000/api` when not using the Vite proxy.

Company roles are resolved from MongoDB. Company users log in with email, password, and the six-digit company code; Super Admins use a separate login path. The API issues an httpOnly same-site cookie, checks account/company status, and scopes company operations to the authenticated user's company. Existing single-company records and legacy indexes are migrated at server startup.

## Core API

- `POST /api/auth/company-requests`, `POST /api/auth/company-registration/status` (requires company name and registering administrator credentials; reveals a code only when approved)
- `POST /api/auth/login`, `POST /api/auth/super-admin-login`, `GET /api/auth/me`, `POST /api/auth/logout`
- `GET /api/super-admin/companies/pending`, `POST /api/super-admin/companies/:id/review`
- `GET /api/admin/overview`, `/resources/:kind`, `/hr`, `/audit`, `/settings`, `/company-code/regenerate`
- `POST /api/admin/payroll/drafts`, `POST /api/admin/payroll/:id/finalize`
- `GET /api/attendance/today`, `POST /api/attendance/check-in`, `/check-out`; admin reconciliation uses `POST /api/attendance/reconcile`

The database starts without sample companies, employees, departments, or leave types. On company approval, only the initial company administrator is activated. Configure company resources from the Admin screens. Annual, Sick, Casual, and Unpaid leave type quotas are set to 14, 8, 10, and unlimited when those named leave types are created.

## Module 2–3 integration

Employee accounts and HR accounts receive a bcrypt-hashed six-character temporary password and are forced to change it at first sign-in. The temporary value is returned once to the creating Admin/HR UI; it is not stored in plaintext. Employee salary structures use effective dates, and payroll rows snapshot the salary components and calculations at draft creation. HR prepares drafts; Admin finalizes them. Finalized payroll records cannot be edited or deleted through resource APIs.

HR can create and publish company announcements, review employee leave and attendance correction requests, see company HR analytics, and prepare payroll drafts. Employees can see only their own profile, attendance, correction requests, leave history/balances, notifications, activity, and finalized payslips. Every company query is scoped by the authenticated company id.

### API routes

- Employee: `GET /api/hr/self`, `PATCH /api/hr/self/profile`, `GET /api/hr/self/activity`, `GET /api/hr/self/notifications`, `PATCH /api/hr/self/notifications/:id/read`.
- Employee attendance corrections: `GET/POST /api/hr/self/attendance-corrections`; HR review: `GET /api/hr/attendance/corrections`, `POST /api/hr/attendance/corrections/:id/review`.
- Leave: `POST /api/hr/leaves`, `GET /api/hr/leaves`, `POST /api/hr/self/leaves/:id/cancel`, `POST /api/hr/leaves/:id/review`.
- HR: `GET /api/hr/overview`, `/employees`, `/attendance`, `/payroll`, `/audit`; `POST /api/hr/employees`, `/attendance/corrections`, `/payroll/drafts`.
- Salary history: `GET/POST /api/hr/employees/:id/salary-structures` (employees may GET only their own salary history).
- Payslips: `GET /api/hr/self/payslips/:id.pdf`; Admin finalization remains `POST /api/admin/payroll/:id/finalize`.
- Announcements: Admin or HR can `POST /api/admin/resources/announcement`; employee company board is returned by `/api/hr/self`.

### Verification

- Backend syntax/import checks: from `server/`, run `node --check` on edited JS files and `node -e "import('./app.js')"`.
- Payroll tax unit tests: `npm test` checks each PKR tax bracket boundary and a value above the top bracket.
- Frontend production build: from `frontend/`, run `npm run build`.
- Optional development fixtures (never inserted at startup): from `server/`, run `npm run demo:data`; verify demo logins with `npm run demo:verify`. The fixture command is disabled when `NODE_ENV=production` and reuses only the three specifically named HCM Demo companies. Rerunning it resets their demo HR/Employee passwords to the documented temporary values.
- End-to-end authenticated workflows require a running MongoDB configured in `server/.env`, then company approval and company-scoped users created through the UI. No sample data is inserted by startup.
