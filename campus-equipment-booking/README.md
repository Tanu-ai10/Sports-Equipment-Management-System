# CourtSide — Sports Equipment Booking System

A full-stack campus sports equipment booking platform.

- **Backend:** Node.js, Express, PostgreSQL, JWT auth, Multer (image uploads), node-cron (overdue sweep)
- **Frontend:** React (Vite), React Router, Axios, Recharts

This replaces the earlier single-file HTML prototype with a proper client-server
architecture backed by a real relational database.

---

## 1. Prerequisites

- Node.js 18+
- PostgreSQL 14+ running locally (or a connection string to a hosted instance)

---

## 2. Backend setup

```bash
cd server
npm install
cp .env.example .env        # then edit .env with your DB credentials & a real JWT_SECRET
```

Create the database and a role that can own it (adjust names/password to match your `.env`):

```sql
CREATE USER courtside_user WITH PASSWORD 'change_me';
CREATE DATABASE courtside OWNER courtside_user;
```

Apply the schema, then seed demo data:

```bash
npm run migrate
npm run seed
```

Seeding creates four demo accounts (all with password `password123`):

| Role        | Email                       |
|-------------|------------------------------|
| Admin       | admin@courtside.edu          |
| Coordinator | coordinator@courtside.edu    |
| Student     | tanu@courtside.edu           |
| Student     | aarav@courtside.edu          |

Start the API:

```bash
npm run dev      # nodemon, auto-restarts on change
# or
npm start        # plain node
```

The API listens on `http://localhost:4000` by default (`PORT` in `.env`).
Health check: `GET /api/health`.

An overdue-sweep job runs once at boot and then every 30 minutes — it flags
`Issued` bookings whose return date has passed, moves them to `Overdue`, and
applies a late fine automatically.

---

## 3. Frontend setup

```bash
cd client
npm install
npm run dev
```

Vite serves the app at `http://localhost:5173` and proxies `/api` and `/uploads`
requests to `http://localhost:4000` (see `vite.config.js`), so both servers need
to be running at the same time during development.

For a production build:

```bash
npm run build      # outputs to client/dist
npm run preview    # serve the built files locally to sanity-check
```

---

## 4. How the pieces map to your original spec

| Your spec section     | Where it lives |
|------------------------|----------------|
| User Authentication (Student/Admin/Coordinator login, forgot password) | `server/src/routes/auth.routes.js`, `client/src/pages/LoginPage.jsx` |
| Equipment Catalog (ID, name, sport, image, description, qty, condition, location, status) | `Equipment` table in `schema.sql`; `equipment.routes.js`; `StudentDashboard.jsx` catalog tab |
| Search & Filter (sport, name, availability, date, popular) | `GET /api/equipment` query params; filter bar in `StudentDashboard.jsx` |
| Booking Workflow (equipment/date/slot/qty/purpose, availability & limit checks) | `booking.routes.js` `POST /api/bookings`; `BookingModal.jsx` |
| Booking Status (Pending → Approved/Rejected → Issued → Returned/Cancelled/Overdue) | `booking_status` enum in `schema.sql`; status transitions across `booking.routes.js` |
| Equipment Issue & Return | `PATCH /api/bookings/:id/issue`, `POST /api/returns` |
| Damage Reporting (image + description, coordinator review) | `damage.routes.js`; `DamageModal.jsx`; `DamageTab` in `CoordinatorDashboard.jsx` |
| Fine Management (late, damaged, lost) | `Fines` table; `jobs/overdueSweep.js`; fine logic in `return.routes.js` and `damage.routes.js` |
| Notifications | `Notifications` table; `notification.routes.js`; generated alongside every state change |
| Student / Coordinator / Admin dashboards | `dashboard.routes.js`; the three `*Dashboard.jsx` pages |
| Database tables (Users, Equipment, Bookings, Returns, DamageReports, Notifications) | `server/src/schema.sql` — plus a `Fines` table added to support Fine Management cleanly |

---

## 5. Notes & next steps for production

- **Forgot password** currently returns the reset token directly in the API
  response for demo purposes (`devResetToken`). Wire up real email delivery
  (SES, SendGrid, etc.) and remove that field before shipping.
- **Image uploads** are stored on local disk under `server/uploads/` and served
  statically. For production, swap this for S3/Cloud Storage.
- **JWT_SECRET** in `.env.example` is a placeholder — generate a long random
  value for real deployments and never commit the real `.env`.
- The overdue sweep runs on an in-process `node-cron` schedule, which is fine
  for a single instance; for multiple instances, move it to a dedicated worker
  or a database-level scheduled job to avoid duplicate runs.
