# 🍿 Snack Overflow - Modern Office Pantry Management System

Snack Overflow is a full-stack office pantry and snack inventory management application built with React, TypeScript, Tailwind CSS, Express, Prisma, and PostgreSQL. Members can browse snacks, consume stock, and vote; administrators manage inventory, restocking, alerts, and activity.

---

## 🎨 UI & User Experience Redesign

The application is styled as a modern SaaS office pantry product:
- **Clean SaaS Aesthetic:** Light neutral background (`bg-gray-50/70`), warm orange accents (`orange-600`), subtle shadows, rounded cards, and responsive desktop/mobile layouts.
- **Pure Product Experience:** Completely stripped of developer monitoring widgets (no raw uptime, database health badges, or technical descriptions on user-facing pages).
- **Interactive Pantry Actions:** Real-time snack consumption (`Grab Snack`), single-user voting toggle (`❤️ Vote`), live search, category pills, status filters, and pagination.
- **Personal My Pantry Dashboard:** Members can review their own snack consumption, favourite snacks, active votes, weekly/monthly trends, monthly recap, and personal activity timeline.
- **Dedicated Admin Center:** Role-guarded inventory management with Add, Edit, Delete, Quick-Restock modals, and live activity audit logs.

---

## 🚀 Quickstart

### Prerequisites

- Node.js and npm
- PostgreSQL running locally or reachable from your machine
- A PostgreSQL database matching `DATABASE_URL` (the example uses `snack_overflow`)

### Configure the environment

From the repository root, copy the examples:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```

Edit `backend\.env` for your PostgreSQL username, password, host, and database. Set `JWT_SECRET` to a long, unique random value and do not commit either `.env` file. The backend has a development fallback if the variable is omitted; never rely on that fallback outside local development.

The backend example allows `http://localhost:5173`. If Vite starts on a different port, update `CORS_ORIGIN` to match the frontend origin.

Create the database if it does not already exist:

```powershell
createdb -U postgres snack_overflow
```

Alternatively, run `CREATE DATABASE snack_overflow;` in `psql`. Adjust the database name or connection string as needed.

### Start the backend

```powershell
Set-Location backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```

The API listens on `http://localhost:5000`. Run the seed once against a fresh development database. It sets seeded snack quantities and adds sample activity history; rerunning it resets those quantities and appends more history.

### Start the frontend

In a second terminal from the repository root:

```powershell
Set-Location frontend
npm install
npm run dev
```

Open the Vite URL (normally `http://localhost:5173`). Useful routes:

- `/` — pantry dashboard
- `/snacks` — snack inventory, search, filters, and pagination
- `/my-pantry` — signed-in member dashboard
- `/admin` — administrator dashboard
- `/login` — sign in
- `/signup` — register a member account

## 🔑 Demo User Credentials

After `npm run seed`, the database contains one Administrator and three Member accounts. Seeded passwords are hashed with bcrypt.

| Role | Name | Email | Password | Permissions & Views |
| :--- | :--- | :--- | :--- | :--- |
| **ADMIN** | Admin User | `admin@snackoverflow.com` | `Admin@123` | Full access, Admin Dashboard, Add/Edit/Delete/Restock snacks, User roster & Activity logs |
| **MEMBER** | Priya | `priya@snackoverflow.com` | `Member@123` | Office Pantry, Vote for snacks, Grab/Consume snacks, Profile view |
| **MEMBER** | Rekha | `rekha@snackoverflow.com` | `Member@123` | Office Pantry, Vote for snacks, Grab/Consume snacks, Profile view |
| **MEMBER** | Karthik | `karthik@snackoverflow.com` | `Member@123` | Office Pantry, Vote for snacks, Grab/Consume snacks, Profile view |

Do not use these demo credentials in production.

## 🧪 Automated Tests

The backend suite currently contains 97 tests across 11 suites. Tests use PostgreSQL and seeded users; run them against a local test/development database, never a production database.

```bash
cd backend
npm test
```
Coverage includes:
- **Smart Restock & Real-Time Alerts:** Urgency formulas (CRITICAL, HIGH, MEDIUM), 7-day average daily consumption, days left, suggested quantities, category filtering, 401/403 admin authorization guards, atomic batch restock transaction rollback, and concurrent restock/consume race safety.
- **Atomic Concurrency & Anti-Overselling:** Simulates 10 simultaneous requests to consume the last 3 items using `Promise.all`; verifies exactly 3 succeed (200), 7 fail with 409 Conflict, final stock is 0, and exactly 3 consumption activity records are logged in PostgreSQL.
- **Stock Consumption & Restocking:** Atomic conditional updates via `updateMany`, transaction rollback safety, and positive integer validation.
- **Voting Integrity & Ownership:** Tests single-vote enforcement, multi-user voting, self-vote removal, and blocks cross-user vote deletion with 403 Forbidden.
- **PostgreSQL Database Integrity:** Verifies unique constraints (`users.email`, `snacks.name`, `votes(userId, snackId)`), foreign keys (cascade on vote, restrict on activity), storage-level CHECK constraints (`quantity >= 0`, `amount > 0`), and system index catalog entries.
- **Pantry snack listing, filtering, search, and pagination:** Server-side filtering by category and derived status.
- **Snack inventory statistics calculation:** Live counts of total snacks, items, low-stock, and out-of-stock.
- **Admin CRUD & Restock operations:** Add, edit, delete with cascade/cleanup, and restock.
- **Member access control & 403 Forbidden protection:** Unprivileged users cannot restock, edit, or delete snacks.
- **JWT authentication, bcrypt password security, and public member registration:** Role elevation prevention, cookie/bearer auth, password hashing verification.
- **Realtime update delivery:** Authenticated SSE stream authorization and inventory/vote change event broadcasts.

## 🌐 API Reference

Use the `/api` prefix shown below. Several route groups are also mounted without that prefix for compatibility. Successful responses use `{ "success": true, "message": "...", "data": ..., "timestamp": "..." }`; errors include `success: false`, a top-level `message`, and `error.code`.

### Authentication

| Method | Endpoint | Access | Notes |
|---|---|---|---|
| `POST` | `/api/auth/signup` | Public | Body: `{ name, email, password }`; public registration always creates a `MEMBER`. |
| `POST` | `/api/auth/login` | Public | Body: `{ email, password }`; sets an HttpOnly cookie and returns a bearer token. |
| `GET` | `/api/auth/me` | Signed in | Current user profile. |
| `POST` | `/api/auth/logout` | Public | Clears the authentication cookie. |

### Snacks and votes

| Method | Endpoint | Access | Notes |
|---|---|---|---|
| `GET` | `/api/snacks` | Public | Server-side `search`, `category`, `status`, `page`, `limit`, and `sortBy` filters. Categories: `SWEET`, `SAVOURY`, `DRINK`, `HEALTHY_ISH`; statuses: `STOCKED`, `RUNNING_LOW`, `GONE`. |
| `GET` | `/api/snacks/:id` | Public | One snack, including vote count and derived status. |
| `GET` | `/api/snacks/stats` | Public | Inventory and activity summary counts. |
| `GET` | `/api/snacks/popular?limit=4` | Public | Most-voted snacks. |
| `GET` | `/api/snacks/featured` | Public | Current highest-voted snack. Despite the UI label, this currently uses all-time votes, not a weekly date window. |
| `POST` | `/api/snacks` | Admin | Create a snack; body includes `name`, `category`, optional `quantity` and `lowStockThreshold`. |
| `PATCH` / `PUT` | `/api/snacks/:id` | Admin | Update snack fields. |
| `DELETE` | `/api/snacks/:id` | Admin | Delete a snack and its associated votes/activity records. |
| `POST` | `/api/snacks/:id/consume` | Signed in | Body: `{ amount }` (defaults to 1); atomic stock decrement. Returns `409 INSUFFICIENT_STOCK` when unavailable. |
| `POST` | `/api/snacks/:id/restock` | Admin | Body: `{ amount }`. |
| `POST` | `/api/snacks/:id/vote` | Signed in | Optional body: `{ action: "vote" \| "unvote" \| "toggle" }`; default is toggle. |
| `DELETE` | `/api/snacks/:id/vote` | Signed in | Removes the current user's vote. |
| `DELETE` | `/api/votes/:id` | Signed in | Deletes the identified vote only when it belongs to the caller. |

### Activity, admin, restock, and live updates

| Method | Endpoint | Access | Notes |
|---|---|---|---|
| `GET` | `/api/activities/me` | Signed in | Current user's consumption history. |
| `GET` | `/api/activities/me/dashboard` | Signed in | Personal pantry metrics and timeline. |
| `GET` | `/api/activities` | Admin | Global activity feed. |
| `GET` | `/api/admin/dashboard` | Admin | Admin dashboard metrics and recent activity. |
| `GET` | `/api/admin/users` | Admin | User roster; sensitive fields are not returned. |
| `GET` | `/api/admin/insights` | Admin | Pantry insights and consumption trends. |
| `GET` | `/api/restock/suggestions?category=DRINK` | Admin | Low/out-of-stock recommendations. |
| `POST` | `/api/restock/all` | Admin | Atomic batch restock. Optional body: `{ "items": [{ "snackId": "...", "amount": 5 }] }`; without items, restocks all current suggestions. |
| `GET` | `/api/alerts` | Admin | Current shortage alerts. |
| `GET` | `/api/alerts/stream` | Admin | SSE stream for alert refreshes. |
| `GET` | `/api/realtime/stream` | Signed in | SSE stream for inventory and vote changes across open tabs. |
| `GET` | `/api/health` | Public | API and database health status. |

The backend accepts authentication through the HttpOnly cookie or `Authorization: Bearer <token>` header. Admin authorization is enforced by server middleware on every admin route; hiding controls in the frontend is only a usability measure. Errors use HTTP status codes such as `400`, `401`, `403`, `404`, and `409`, with the same response envelope.

## 🗃️ Database Schema

Prisma models map to PostgreSQL tables named `users`, `snacks`, `votes`, and `activities`.

| Model | Important fields and constraints |
|---|---|
| `User` | UUID id, name, unique email, bcrypt password hash, `ADMIN`/`MEMBER` role. |
| `Snack` | UUID id, unique name, category, integer quantity, low-stock threshold, timestamps. `STOCKED`, `RUNNING_LOW`, and `GONE` are derived from quantity and threshold, not stored. |
| `Vote` | User/snack foreign keys and creation time; unique constraint on `(userId, snackId)` prevents duplicate votes. Deleting a user or snack cascades to its votes. |
| `Activity` | User/snack foreign keys, `CONSUMED`/`RESTOCKED` action, positive amount, and timestamp. Foreign keys restrict deletion until related activity is handled. |

Database constraints also enforce `snacks.quantity >= 0` and `activities.amount > 0`. Indexes support snack category, vote lookups, and activity timelines.

---

## 🔒 Authentication and Authorization

- Login verifies bcrypt password hashes and issues a signed JWT in an HttpOnly cookie; the API also accepts a bearer token.
- Public signup always assigns `MEMBER`; clients cannot grant themselves the `ADMIN` role.
- Protected routes verify the token on the server. Admin operations additionally check the verified role and return `403` for members; missing or invalid authentication returns `401`.
- Snack browsing and health checks are public. Consumption, voting, personal activity, and the general realtime stream require authentication. Inventory management, global activity, restock, alerts, and admin analytics require `ADMIN`.
- Password hashes are never returned by the API. Frontend role-based navigation does not replace server-side authorization.

## ⚡ Concurrency & Stock Correctness Architecture

### 1. Conditional Atomic Decrement
To prevent race conditions and overselling under high concurrency:
- We **never** read quantity into Node.js application memory and then issue an unconditional decrement (`UPDATE ... SET quantity = quantity - 1`).
- We **never** rely on in-memory locks or mutexes, which fail in distributed or multi-instance environments.
- Instead, we perform a **database-level atomic conditional update** inside a Prisma transaction:
  ```typescript
  const updateResult = await tx.snack.updateMany({
    where: {
      id: snackId,
      quantity: { gte: amount }, // Conditional check executed atomically by PostgreSQL
    },
    data: {
      quantity: { decrement: amount },
    },
  });
  ```
- **PostgreSQL Row-Level Locking:** During the `UPDATE`, PostgreSQL acquires an exclusive row-level lock on the target row. Concurrent requests queue up. When each queued transaction executes, it reads the newly committed quantity. Once stock drops below `amount`, `quantity >= amount` evaluates to false, updating 0 rows (`updateResult.count === 0`).
- If `updateResult.count === 0`, we check whether the snack exists: if it exists, HTTP `409 Conflict` (`INSUFFICIENT_STOCK`) is returned; if not, HTTP `404 Not Found` (`NOT_FOUND`) is returned.

### 2. Transaction Integrity & Audit Trail
Both consumption and restocking execute inside `prisma.$transaction`:
- Quantity update and `Activity` insertion (`action: 'CONSUMED'` or `'RESTOCKED'`) occur in the same database transaction.
- If activity insertion or any constraint fails, the entire transaction rolls back automatically.
- A PostgreSQL storage-level `CHECK (quantity >= 0)` constraint serves as an absolute barrier against negative stock.

## 🔄 Live Stock and Vote Updates Across Tabs

Authenticated browser tabs connect to `GET /api/realtime/stream` using the HttpOnly authentication cookie. The server sends a `data-change` SSE event after successful snack creation, editing, deletion, consumption, restocking, or voting/unvoting. Each open tab then reloads the relevant snack, vote, dashboard, activity, and restock data through the API. A `connected` event also triggers a refresh after a reconnect, so tabs recover the latest state after a dropped connection.

The event contains only the change type, affected snack ID when available, and timestamp; clients fetch current values from the API rather than trusting event payloads as inventory state. The stream requires authentication. The existing admin-only `/api/alerts/stream` remains dedicated to stock alerts.

The broadcaster is in-process; deployments running multiple backend instances need a shared event broker to notify clients connected to different instances.

---

## ⚡ Smart Restock List & Alert Notification System

The Smart Restock system provides predictive replenishment analytics and live inventory alerts exclusively for administrators.

### 1. API Endpoints (Admin Only)

| Method | Endpoint | Description | Guard |
| :--- | :--- | :--- | :--- |
| `GET` | `/restock/suggestions` | Retrieves running-low and out-of-stock snacks with replenishment metrics and urgency. Accepts `?category=<CATEGORY>`. | Admin Only (`401/403`) |
| `POST` | `/restock/all` | Atomically restocks multiple snacks with custom quantities in a single transaction. Body: `{ items: [{ snackId, amount }] }`. | Admin Only (`401/403`) |
| `GET` | `/alerts` | Fetches live stock shortage alerts (`CRITICAL` for 0 stock, `WARNING` for `quantity <= lowStockThreshold`). | Admin Only (`401/403`) |
| `GET` | `/alerts/stream` | Server-Sent Events (SSE) stream for real-time stock shortage notifications and live refresh triggers. | Admin Only (`401/403`) |

*Note: All endpoints are accessible both directly at `/restock/*`, `/alerts/*` and prefixed under `/api/*`.*

### 2. Mathematical Calculations & Formulas

1. **Average Daily Consumption (7 Days):**
   $$\text{avgDailyConsumption} = \frac{\text{totalConsumedLast7Days}}{7}$$
   Aggregates the total items consumed in `Activity` records with `action = 'CONSUMED'` over the past 7 days (`createdAt >= now - 7 days`), divided by 7.0 (rounded to 2 decimal places).

2. **Estimated Days Left:**
   $$\text{daysLeft} = \begin{cases} 0 & \text{if } \text{quantity} = 0 \\ 999 & \text{if } \text{avgDailyConsumption} = 0 \\ \lfloor \frac{\text{quantity}}{\text{avgDailyConsumption}} \rfloor & \text{otherwise} \end{cases}$$

3. **Suggested Restock Quantity:**
   $$\text{suggestedQuantity} = \max\Big(\text{lowStockThreshold} \times 2 - \text{quantity},\; \lceil \text{avgDailyConsumption} \times 14 \rceil - \text{quantity},\; 5\Big)$$
   Ensures stock covers at least a 14-day supply or doubles the low-stock safety threshold, with a guaranteed minimum order size of 5 units.

4. **Urgency Classification:**
   - **`CRITICAL`**: Snack is completely out of stock ($\text{quantity} = 0$) OR $\text{daysLeft} \le 1$.
   - **`HIGH`**: $\text{daysLeft} \le 3$ OR $\text{quantity} \le \text{lowStockThreshold}$.
   - **`MEDIUM`**: Any remaining suggestion needing restock.

### 3. Atomic Database Transaction Rollback

The `POST /restock/all` endpoint executes all snack updates and activity inserts within a single Prisma interactive transaction (`prisma.$transaction`):
```typescript
await prisma.$transaction(async (tx) => {
  for (const item of items) {
    await tx.snack.update({
      where: { id: item.snackId },
      data: { quantity: { increment: item.amount } },
    });
    await tx.activity.create({
      data: {
        userId,
        snackId: item.snackId,
        action: 'RESTOCKED',
        amount: item.amount,
      },
    });
  }
});
```
- If **any** snack ID is invalid or any restock quantity is invalid ($\le 0$ or non-integer), an exception is thrown and PostgreSQL rolls back **all** increments and activity records.
- Zero partial updates occur.

### 4. Real-Time Alert Architecture (SSE + Polling Fallback)

- **SSE Stream (`/alerts/stream`):** Connects admin clients via `text/event-stream` with a 25-second keep-alive heartbeat.
- **Instant Broadcast:** When any user consumes a snack that causes stock to drop to or below `lowStockThreshold`, `snackService.consumeSnack` invokes `alertEmitterService.broadcastRefresh()`, notifying all connected admin browser sessions instantly.
- **Resilient Fallback:** The frontend `NotificationBell` automatically falls back to 30-second polling if SSE is disconnected.
- **Admin Isolation:** All alert APIs, SSE streams, restock routes, navigation links, and UI modals are strictly guarded and completely hidden from regular members.

---

## 🧭 Design Decisions and Scaling Notes

### Key decisions and trade-offs

- **PostgreSQL owns inventory correctness.** A conditional `UPDATE` avoids the unsafe read-then-decrement pattern. The transaction records the corresponding activity with the stock mutation; a database `CHECK` is the final guard against negative stock. This favors correctness over optimistic application-level checks.
- **The schema enforces vote uniqueness.** The composite unique constraint is the guarantee, including under simultaneous requests. The service can return a friendly conflict, but the database remains authoritative.
- **JWT plus role middleware keeps authorization server-side.** Public registration creates members only. Set a strong `JWT_SECRET` explicitly; the backend has a development fallback, which must not be used in a deployed environment.
- **SSE is used for one-way live updates.** Browsers receive change notifications and refetch canonical API data rather than treating event payloads as inventory state. This is simpler than WebSockets for this use case, but the current event broadcaster is process-local.

### What is likely to break first at 100×



1. **Realtime fan-out across replicas:** Connected SSE clients are held in memory by one Node process. Tabs connected to different backend instances will not receive each other's events. Add a shared broker such as Redis Pub/Sub or PostgreSQL `LISTEN/NOTIFY` before horizontal scaling.
2. **Read and connection load during bursts:** Each event causes open tabs to refetch their relevant views. A burst therefore multiplies database reads by the number of open tabs. Coalesce events, debounce refreshes, and consider a shared client cache before browser/API request fan-out becomes costly.
3. **Database-backed summaries and search:** `getPantryStats` reads snack quantities to calculate derived counts, while case-insensitive substring search can become expensive as inventory grows. Measure query plans; move aggregations into SQL and add appropriate search indexes/caching if these become hot paths. Size the connection pool and database from load-test results rather than guessing.


