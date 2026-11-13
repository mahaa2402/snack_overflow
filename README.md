# 🍿 Snack Overflow - Modern Office Pantry Management System

Snack Overflow is a full-stack office pantry and snack inventory management application built with React, TypeScript, Tailwind CSS, Express, and Prisma ORM with PostgreSQL.

---

## 🎨 UI & User Experience Redesign

The application is styled as a modern SaaS office pantry product:
- **Clean SaaS Aesthetic:** Light neutral background (`bg-gray-50/70`), warm orange accents (`orange-600`), subtle shadows, rounded cards, and responsive desktop/mobile layouts.
- **Pure Product Experience:** Completely stripped of developer monitoring widgets (no raw uptime, database health badges, or technical descriptions on user-facing pages).
- **Interactive Pantry Actions:** Real-time snack consumption (`Grab Snack`), single-user voting toggle (`❤️ Vote`), live search, category pills, status filters, and pagination.
- **Personal My Pantry Dashboard:** Members can review their own snack consumption, favourite snacks, active votes, weekly/monthly trends, monthly recap, and personal activity timeline.
- **Dedicated Admin Center:** Role-guarded inventory management with Add, Edit, Delete, Quick-Restock modals, and live activity audit logs.

---

## 🔑 Demo User Credentials

The database comes pre-seeded with one Administrator and three Member accounts (all passwords hashed with bcrypt):

| Role | Name | Email | Password | Permissions & Views |
| :--- | :--- | :--- | :--- | :--- |
| **ADMIN** | Admin User | `admin@snackoverflow.com` | `Admin@123` | Full access, Admin Dashboard, Add/Edit/Delete/Restock snacks, User roster & Activity logs |
| **MEMBER** | Priya | `priya@snackoverflow.com` | `Member@123` | Office Pantry, Vote for snacks, Grab/Consume snacks, Profile view |
| **MEMBER** | Rekha | `rekha@snackoverflow.com` | `Member@123` | Office Pantry, Vote for snacks, Grab/Consume snacks, Profile view |
| **MEMBER** | Karthik | `karthik@snackoverflow.com` | `Member@123` | Office Pantry, Vote for snacks, Grab/Consume snacks, Profile view |

*Tip: The web Login page features instant one-click demo account filling for seamless testing.*

---

## 🚀 Quickstart

### 1. Backend Setup
```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed              # Seeds demo users, 16 snacks, initial votes, and activities
npm run dev               # Starts API on http://localhost:5000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev               # Starts UI on http://localhost:5173
```
- **Pantry Dashboard:** `http://localhost:5173`
- **Snack Inventory & Filters:** `http://localhost:5173/snacks`
- **My Pantry:** `http://localhost:5173/my-pantry` (sign in to view your personal dashboard)
- **Admin Dashboard (Admin only):** `http://localhost:5173/admin`
- **Sign In:** `http://localhost:5173/login`
- **Register Member:** `http://localhost:5173/signup`

### 3. Automated Test Suite (95 Tests across 10 Test Suites)
```bash
cd backend
npm test
```
Runs 95 integration and unit tests covering:
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

---

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

---

## ⚡ Smart Restock List & Alert Notification System

The Smart Restock system provides predictive replenishment analytics and live inventory alerts exclusively for administrators.

### 1. API Endpoints (Admin Only)

| Method | Endpoint | Description | Guard |
| :--- | :--- | :--- | :--- |
| `GET` | `/restock/suggestions` | Retrieves running-low and out-of-stock snacks with replenishment metrics and urgency. Accepts `?category=<CATEGORY>`. | Admin Only (`401/403`) |
| `POST` | `/restock/all` | Atomically restocks multiple snacks with custom quantities in a single transaction. Body: `{ items: [{ snackId, quantity }] }`. | Admin Only (`401/403`) |
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
      data: { quantity: { increment: item.quantity } },
    });
    await tx.activity.create({
      data: {
        userId,
        snackId: item.snackId,
        action: 'RESTOCKED',
        quantity: item.quantity,
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

For architectural details, schema explanations, and API endpoints, refer to [IMPLEMENTATION_DETAILS.md](./IMPLEMENTATION_DETAILS.md).
