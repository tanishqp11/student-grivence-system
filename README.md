# CampusCare — University Grievance Portal

A student grievance redressal system for a university, built as a **BCA minor project**.

Students register with their roll number, file grievances under a category, get a tracking ID and follow
every action the grievance cell records. Administrators work from a console with counts, filters, status
updates, remarks, assignment and CSV export.

- **Front end:** plain HTML, CSS and JavaScript (no build step, no framework)
- **Back end:** one Vercel serverless function (`api/index.js`) with route modules in `routes/`
- **Database:** PostgreSQL (Neon free tier recommended), accessed with the `pg` driver
- **Auth:** scrypt password hashing and signed, HttpOnly session cookies
- **Hosting:** Vercel (static files plus `/api` functions)

---

## 1. Features

**Student side**

- Register and sign in with a roll number or email
- File a grievance: category, subject, description, priority and place/office involved
- Automatic tracking ID (`GRV-2026-AB12C`)
- Dashboard with counts, ticket list and a per-ticket timeline
- Public tracking page that needs only the tracking ID
- Tickets are private: a student can only open their own grievances

**Grievance cell (admin) side**

- Separate console with administrator-only access
- Counts for total, pending, in review, resolved and average closure time
- Load-by-category and status-mix charts (CSS only, no chart library)
- Search and filter by status, category and department
- Update status, assign an officer or desk and write a remark; each change is added to the student's timeline
- Export the full register as CSV

---

## 2. Project structure

```
api/index.js          request router and error handling (Vercel function entry point)
routes/
  auth.js             register, login, logout, current user
  grievances.js       file, list, read, update and track grievances
  admin.js            console statistics and CSV export
  public.js           health, metadata and public counts
lib/
  db.js               connection pool, schema bootstrap, admin and demo seeding
  schema.js           database DDL executed on startup
  auth.js             scrypt hashing, HS256 session tokens, cookies
  session.js          current user lookup and role guards
  http.js             JSON responses, body parsing, HttpError
  constants.js        categories, departments, priorities, statuses
  validation.js       input trimming and validation helpers
  serializers.js      database rows to API response objects
assets/
  css/styles.css      design tokens, layout and components
  js/api.js           fetch wrapper
  js/session.js       sign-in state and sign-out
  js/format.js        labels, dates and timeline markup
  js/ui.js            toasts and clipboard
  js/icons.js         inline SVG icons
  js/chrome.js        shared header and footer
  js/app.js           import point for page scripts
  js/index.js         landing page statistics
  js/login.js         sign in and registration
  js/dashboard.js     student dashboard, filing form, ticket drawer
  js/track.js         public tracking
  js/admin.js         admin console, table, charts, update drawer
scripts/
  dev-server.js       local static and API server (npm run dev)
  db-init.js          creates tables and demo data in a real database
  seed-demo.js        demo students and grievances
  test-api.js         35 API checks against an in-memory Postgres emulator
db/schema.sql         reference copy of the DDL used in lib/schema.js
index.html  login.html  dashboard.html  track.html  admin.html
vercel.json           clean URLs and the /api/* rewrite to the function
```

---

## 3. Run it locally

```bash
npm install
```

### Option A — with a real Postgres database (persistent)

1. Create a free project at [neon.tech](https://neon.tech) (or use Supabase, Railway or any Postgres).
2. Copy the connection string, which looks like
   `postgresql://user:password@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`.
3. Create `.env` from `.env.example`:

```env
DATABASE_URL=postgresql://...
AUTH_SECRET=some-long-random-string
ADMIN_EMAIL=admin@university.edu
ADMIN_PASSWORD=Admin@123
NODE_ENV=development
```

4. Create the tables and load demo data:

```bash
npm run db:init
```

5. Start the app and open <http://127.0.0.1:3000>:

```bash
npm run dev
```

### Option B — no database (in-memory demo)

Skip `.env` and run `npm run dev`. The API falls back to an in-memory Postgres emulator and seeds the
demo students and grievances automatically. **Data resets when the server restarts**, so use Option A
for a real demo or the viva.

### Demo accounts

| Role    | Email                                 | Password     |
| ------- | ------------------------------------- | ------------ |
| Admin   | `admin@university.edu`                | `Admin@123`  |
| Student | `priya.sharma@student.university.edu` | `Student@123` |
| Student | `rahul.verma@student.university.edu`  | `Student@123` |

Demo tracking IDs: `GRV-2026-8K2PA` (in review), `GRV-2026-7XT9L` (resolved), `GRV-2026-ZN6UH` (closed).

Change `ADMIN_EMAIL` and `ADMIN_PASSWORD` before going live. The admin account is created on the first
API request, or by `npm run db:init`.

### Checks

```bash
npm test
```

Runs 35 API checks (registration, duplicate detection, auth guards, grievance creation, tracking, admin
updates, CSV export, student isolation, logout) against an in-memory Postgres emulator.

---

## 4. Deploy to Vercel with Neon Postgres

### 4.1 Create the database (Neon free plan)

1. Sign up at [neon.tech](https://neon.tech), create an organisation and a project. Pick the region
   closest to where the app will run, for example **AWS ap-southeast-1 (Singapore)**.
2. Open **Connect** in the project dashboard and copy the connection string with **Pooled connection**
   selected. The host then contains `-pooler`, which is what serverless functions need. It looks like:

   ```text
   postgresql://user:password@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```

3. Keep it handy. Tables do not have to be created by hand: the API runs the schema on its first request.

### 4.2 Push the project to GitHub

`.env` is gitignored and must never be committed.

```bash
git init
git add .
git commit -m "University grievance portal"
git branch -M main
# create an empty repository on github.com, then:
git remote add origin https://github.com/<your-account>/<repository>.git
git push -u origin main
```

### 4.3 Import it in Vercel

Choose **Add New → Project → Import** the repository and set:

- Framework preset: **Other**
- Build command: leave empty
- Output directory: leave empty (static files are served from the root, `api/` becomes a function)

### 4.4 Environment variables

Add these under Project → Settings → Environment Variables (all environments):

| Name             | Value                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`   | the pooled Neon connection string from 4.1                                                        |
| `AUTH_SECRET`    | 64 random hex characters: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ADMIN_EMAIL`    | the administrator sign-in email you want to use                                                   |
| `ADMIN_PASSWORD` | a strong password for that account                                                                |
| `NODE_ENV`       | `production` (this is what marks the session cookie `Secure`)                                      |

Then open **Settings → Functions → Region** and select the region closest to the database (for example
`sin1` for a Singapore project). Otherwise every query travels between continents.

### 4.5 Deploy and check it

1. Click **Deploy**. The first deployment takes about a minute and needs no build step.
2. `https://your-app.vercel.app/api/health` must answer
   `{"ok":true,"database":"connected","latencyMs":...}`.
3. Optional demo data: put the same connection string in `.env` locally and run `npm run db:init`.
   The tables already exist by then, so this only loads the sample students and tickets.
4. Sign in at `/login` with the `ADMIN_EMAIL`/`ADMIN_PASSWORD` you set, file a grievance, then open
   `/track` and look it up by tracking ID.

Only the HTML, CSS and `assets/` files are readable over HTTP. `lib/`, `routes/`, `scripts/`, `db/` and
`package.json` are redirected away in `vercel.json`, while the function still imports them normally.

---

## 5. API reference

Every endpoint is served by `api/index.js` through the `/api/*` rewrite.

| Method | Endpoint                  | Access        | Purpose                                |
| ------ | ------------------------- | ------------- | -------------------------------------- |
| GET    | `/api/health`             | public        | Service and database health            |
| GET    | `/api/meta`               | public        | Categories, departments, priorities    |
| GET    | `/api/stats`              | public        | Aggregate counts for the landing page  |
| POST   | `/api/auth/register`      | public        | Create a student account               |
| POST   | `/api/auth/login`         | public        | Sign in with email or roll number      |
| POST   | `/api/auth/logout`        | public        | Clear the session cookie               |
| GET    | `/api/me`                 | any           | Current user, or `null`                |
| POST   | `/api/grievances`         | student       | File a grievance                       |
| GET    | `/api/grievances`         | student/admin | Own tickets, or all tickets with filters |
| GET    | `/api/grievances/:id`     | owner/admin   | Ticket and timeline                    |
| PATCH  | `/api/grievances/:id`     | admin         | Status, assignment and remark          |
| GET    | `/api/track?code=...`     | public        | Status and timeline by tracking ID     |
| GET    | `/api/admin/stats`        | admin         | Dashboard aggregates                   |
| GET    | `/api/admin/export`       | admin         | CSV register download                  |

Admin list filters: `?status=`, `?category=`, `?department=`, `?priority=`, `?q=`.

---

## 6. Database schema

```
users             id, role (student|admin), name, email (unique), roll_no (unique),
                  department, password_hash, created_at

grievances        id, code (unique), user_id -> users, student_name, roll_no, department,
                  category, subject, description, priority, location, status,
                  assigned_to, created_at, updated_at

grievance_updates id, grievance_id -> grievances, status, note, author, created_at
```

Statuses: `pending`, `review` (In review), `resolved`, `rejected` (Closed).
Priorities: `low`, `medium`, `high`, `urgent`.
The timeline table is the audit trail: every submission, status change and remark is one row.

---

## 7. Security notes and limitations

- Passwords are hashed with Node's `scrypt` (random salt, timing-safe comparison). No plain text is stored.
- Sessions are HS256-signed tokens in `HttpOnly; SameSite=Lax` cookies, marked `Secure` when
  `NODE_ENV=production`.
- Authorisation is enforced on the server: students can only read their own grievances and every admin
  route checks the `admin` role.
- SQL uses bound parameters everywhere, and all input is trimmed and length-checked.
- The public tracking endpoint returns only the subject, status and remarks, never the student's identity
  or full description.
- Not included, by design for a minor project: email or SMS notifications, file attachments (they need
  object storage), login rate limiting, multiple admin roles and pagination (result sets are capped).

---

## 8. Notes for the project report

- **Problem:** grievances were handled through paper forms, email and corridor conversations, so students
  had no record of what was reported or what action followed.
- **Solution:** a role-based web portal with a traceable ticket lifecycle and a separate admin console.
- **Database design:** three normalised tables (users, grievances, grievance_updates) with foreign keys
  and indexes on the frequently filtered columns.
- **Testing:** 35 automated API checks covering authentication, authorisation boundaries, validation,
  tracking and export.
- **Deployment:** Vercel static hosting, a Node serverless function and managed PostgreSQL, with secrets
  supplied as environment variables instead of being stored in the code.
