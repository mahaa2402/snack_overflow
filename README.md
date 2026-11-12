# 🍿 Snack Overflow - Modern Office Pantry Management System

Snack Overflow is a full-stack office pantry and snack inventory management application built with React, TypeScript, Tailwind CSS, Express, and Prisma ORM with PostgreSQL.

---

## 🎨 UI & User Experience Redesign

The application is styled as a modern SaaS office pantry product:
- **Clean SaaS Aesthetic:** Light neutral background (`bg-gray-50/70`), warm orange accents (`orange-600`), subtle shadows, rounded cards, and responsive desktop/mobile layouts.
- **Pure Product Experience:** Completely stripped of developer monitoring widgets (no raw uptime, database health badges, or technical descriptions on user-facing pages).
- **Interactive Pantry Actions:** Real-time snack consumption (`Grab Snack`), single-user voting toggle (`❤️ Vote`), live search, category pills, status filters, and pagination.
- **Dedicated Admin Center:** Role-guarded inventory management with Add, Edit, Delete, Quick-Restock modals, and live activity audit logs.

---

## 🔑 Demo User Credentials

The database comes pre-seeded with one Administrator and three Member accounts (all passwords hashed with bcrypt):

| Role | Name | Email | Password | Permissions & Views |
| :--- | :--- | :--- | :--- | :--- |
| **ADMIN** | Admin User | `admin@snackoverflow.com` | `Admin@123` | Full access, Admin Dashboard, Add/Edit/Delete/Restock snacks, User roster & Activity logs |
| **MEMBER** | Alice Chen | `alice@snackoverflow.com` | `Member@123` | Office Pantry, Vote for snacks, Grab/Consume snacks, Profile view |
| **MEMBER** | Bob Miller | `bob@snackoverflow.com` | `Member@123` | Office Pantry, Vote for snacks, Grab/Consume snacks, Profile view |
| **MEMBER** | Charlie Davis | `charlie@snackoverflow.com` | `Member@123` | Office Pantry, Vote for snacks, Grab/Consume snacks, Profile view |

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
- **Admin Dashboard (Admin only):** `http://localhost:5173/admin`
- **Sign In:** `http://localhost:5173/login`
- **Register Member:** `http://localhost:5173/signup`

### 3. Automated Test Suite (56 Tests across 6 Test Suites)
```bash
cd backend
npm test
```
Runs 56 integration and unit tests covering:
- **Atomic Concurrency & Anti-Overselling:** Simulates 10 simultaneous requests to consume the last 3 items using `Promise.all`; verifies exactly 3 succeed (200), 7 fail with 409 Conflict, final stock is 0, and exactly 3 consumption activity records are logged in PostgreSQL.
- **Stock Consumption & Restocking:** Atomic conditional updates via `updateMany`, transaction rollback safety, and positive integer validation.
- **Pantry snack listing, filtering, search, and pagination:** Server-side filtering by category and derived status.
- **Snack inventory statistics calculation:** Live counts of total snacks, items, low-stock, and out-of-stock.
- **Single-vote per user database constraint enforcement:** DB-level unique constraint `(userId, snackId)`.
- **Admin CRUD & Restock operations:** Add, edit, delete with cascade/cleanup, and restock.
- **Member access control & 403 Forbidden protection:** Unprivileged users cannot restock, edit, or delete snacks.
- **JWT authentication, bcrypt password security, and public member registration:** Role elevation prevention, cookie/bearer auth.

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

For architectural details, schema explanations, and API endpoints, refer to [IMPLEMENTATION_DETAILS.md](./IMPLEMENTATION_DETAILS.md).
