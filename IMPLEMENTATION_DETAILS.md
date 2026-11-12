# Snack Overflow - Technical Architecture & Implementation Details

## 1. Project Overview

**Snack Overflow** is a full-stack office pantry and snack inventory management application built to demonstrate clean architecture, robust authentication, role-based authorization, and rock-solid concurrent stock correctness.

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4, React Router 7, Axios
- **Backend:** Node.js, Express.js, TypeScript, Prisma ORM 6
- **Database:** PostgreSQL (with storage-level `CHECK` constraints)
- **Authentication:** JWT, bcrypt password hashing, HTTP-only cookie + Bearer token support
- **Testing:** Jest, Supertest (56 integration & unit tests)

---

## 2. Directory Structure & Architecture

```
snack_overflow/
├── backend/
│   ├── prisma/
│   │   ├── migrations/             # PostgreSQL database migrations
│   │   └── schema.prisma           # Prisma schema definition
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts         # Singleton Prisma client instance
│   │   │   └── env.ts              # Type-safe environment variables
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts  # Login, signup, me, logout handlers
│   │   │   └── snack.controller.ts # CRUD, consume, restock, vote handlers
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.ts  # authenticate, optionalAuthenticate, requireAdmin
│   │   │   ├── errorHandler.ts     # Centralized error handler returning consistent format
│   │   │   ├── notFoundHandler.ts  # 404 handler for unknown routes
│   │   │   └── requestLogger.ts    # HTTP request logger
│   │   ├── routes/
│   │   │   ├── admin.routes.ts     # Admin-only dashboard & management routes
│   │   │   ├── auth.routes.ts      # Authentication endpoints
│   │   │   ├── health.routes.ts    # Health-check endpoint
│   │   │   ├── snack.routes.ts     # Core snack endpoints (/snacks)
│   │   │   └── index.ts            # Centralized API route aggregator (/api)
│   │   ├── services/
│   │   │   ├── auth.service.ts     # Authentication & token generation business logic
│   │   │   └── snack.service.ts    # Stock operations & atomic transaction logic
│   │   ├── utils/
│   │   │   ├── apiResponse.ts      # Standardized { success, data, message } formatter
│   │   │   ├── AppError.ts         # Operational error class with HTTP status & error code
│   │   │   └── snackStatus.ts      # Derived status logic (STOCKED, RUNNING_LOW, GONE)
│   │   ├── validators/
│   │   │   ├── auth.validator.ts   # Input validation for login and signup
│   │   │   └── snack.validator.ts  # Input validation for CRUD, consume, restock
│   │   ├── app.ts                  # Express application factory & middleware pipeline
│   │   ├── server.ts               # HTTP server listener
│   │   └── seed.ts                 # Database seed script for demo accounts & snacks
│   └── tests/
│       ├── auth.test.ts            # Authentication & RBAC tests
│       ├── concurrency.test.ts     # 10 concurrent requests, race condition, 409 tests
│       ├── health.test.ts          # Server health-check tests
│       ├── snackCrud.test.ts       # Snack CRUD endpoint tests
│       ├── snacks.test.ts          # Search, filter, vote, and activity tests
│       └── snackStatus.test.ts     # Pure unit tests for derived status logic
└── frontend/
    └── src/
        ├── api/                    # Axios centralized client & API modules
        ├── components/             # Reusable UI components & modals
        ├── context/                # AuthContext for session management
        ├── pages/                  # HomePage, SnacksPage, AdminDashboardPage, LoginPage, SignupPage
        └── types/                  # Shared TypeScript interfaces
```

---

## 3. Database Layer & PostgreSQL Schema

### Models & Relationships

1. **User**
   - `id`: UUID (Primary Key)
   - `name`: String
   - `email`: String (Unique)
   - `password`: String (bcrypt hashed)
   - `role`: Role enum (`ADMIN`, `MEMBER`)
   - `createdAt`: DateTime
   - Relations: `votes` (`Vote[]`), `activities` (`Activity[]`)

2. **Snack**
   - `id`: UUID (Primary Key)
   - `name`: String (Unique)
   - `category`: SnackCategory enum (`SWEET`, `SAVOURY`, `DRINK`, `HEALTHY_ISH`)
   - `quantity`: Int (default 0)
   - `lowStockThreshold`: Int (default 5)
   - `createdAt`: DateTime
   - `updatedAt`: DateTime
   - Relations: `votes` (`Vote[]`), `activities` (`Activity[]`)

3. **Vote**
   - `id`: UUID (Primary Key)
   - `userId`: UUID (Foreign Key &rarr; User)
   - `snackId`: UUID (Foreign Key &rarr; Snack)
   - `createdAt`: DateTime
   - **Unique Constraint:** `@@unique([userId, snackId])` ensures a user can vote at most once per snack.

4. **Activity**
   - `id`: UUID (Primary Key)
   - `userId`: UUID (Foreign Key &rarr; User)
   - `snackId`: UUID (Foreign Key &rarr; Snack)
   - `action`: ActivityAction enum (`RESTOCKED`, `CONSUMED`)
   - `amount`: Int (positive integer)
   - `createdAt`: DateTime

### PostgreSQL Engine Constraints

In addition to Prisma validations, storage-level PostgreSQL constraints are enforced:
```sql
-- Prevents negative snack inventory under all circumstances
ALTER TABLE "Snack" ADD CONSTRAINT "snack_quantity_non_negative" CHECK ("quantity" >= 0);

-- Enforces positive activity amounts
ALTER TABLE "Activity" ADD CONSTRAINT "activity_amount_positive" CHECK ("amount" > 0);
```

### Derived Snack Status (Never Stored in Database)
- `quantity === 0` &rarr; `GONE`
- `0 < quantity <= lowStockThreshold` &rarr; `RUNNING_LOW`
- `quantity > lowStockThreshold` &rarr; `STOCKED`

---

## 4. Stock Consumption & Restocking Operations

### 1. Stock Consumption (`POST /snacks/:id/consume`)

- **Permissions:** Authenticated Users (`MEMBER` or `ADMIN`).
- **Request Body:**
  ```json
  {
    "amount": 1
  }
  ```
- **Validation:** `amount` must be an integer > 0.
- **Database Execution:** Inside a Prisma `$transaction`, executes a conditional update:
  ```typescript
  const updateResult = await tx.snack.updateMany({
    where: {
      id: snackId,
      quantity: { gte: amount },
    },
    data: {
      quantity: { decrement: amount },
    },
  });
  ```
- **Outcome:**
  - If `updateResult.count === 1`: Stock is decremented; an `Activity` record (`CONSUMED`) is inserted in the same transaction; returns HTTP `200 OK`.
  - If `updateResult.count === 0`: The condition was not met. Checks if the snack exists:
    - If snack does not exist: throws `AppError('Snack not found', 404, 'NOT_FOUND')`.
    - If snack exists with `quantity < amount`: throws `AppError('Insufficient stock available...', 409, 'INSUFFICIENT_STOCK')`.
  - If activity creation or transaction fails: all changes roll back immediately.

### 2. Stock Restocking (`POST /snacks/:id/restock`)

- **Permissions:** Admin only (`ADMIN`).
- **Request Body:**
  ```json
  {
    "amount": 10
  }
  ```
- **Validation:** `amount` must be an integer > 0.
- **Database Execution:** Inside a Prisma `$transaction`:
  1. Verifies snack exists (returns `404` if not found).
  2. Atomically increments quantity: `quantity: { increment: amount }`.
  3. Inserts an `Activity` record (`action: 'RESTOCKED'`, `amount`).
  4. Returns the updated snack with freshly derived status and the activity record.
  5. If activity insertion fails, the inventory update rolls back.

---

## 5. Concurrency & Anti-Overselling Mechanics

### How the Database Prevents Overselling

When multiple users attempt to consume the last remaining stock items simultaneously:

```
[Request 1] ──┐
[Request 2] ──┼──> Node.js Express (Non-blocking I/O)
[Request ...] ─┤
[Request 10] ─┘
         │
         ▼
[PostgreSQL Database Engine]
  │
  ├─> Executes: UPDATE "Snack" SET "quantity" = "quantity" - 1
  │             WHERE "id" = $1 AND "quantity" >= 1;
  │
  ├─> PostgreSQL Row-Level Lock (FOR UPDATE):
  │   - The first transaction acquires an exclusive row-level lock on the snack row.
  │   - Concurrent transactions queue and wait for the row lock.
  │
  ├─> Transaction Execution Order:
  │   - Req 1: sees quantity = 3 (>= 1 is TRUE) -> decrements to 2 (count = 1) -> SUCCEEDS (200)
  │   - Req 2: sees quantity = 2 (>= 1 is TRUE) -> decrements to 1 (count = 1) -> SUCCEEDS (200)
  │   - Req 3: sees quantity = 1 (>= 1 is TRUE) -> decrements to 0 (count = 1) -> SUCCEEDS (200)
  │   - Req 4: sees quantity = 0 (>= 1 is FALSE) -> updates 0 rows (count = 0) -> CONFLICT (409)
  │   - Req 5: sees quantity = 0 (>= 1 is FALSE) -> updates 0 rows (count = 0) -> CONFLICT (409)
  │   - Req 6..10: evaluate to count = 0 -> CONFLICT (409)
  │
  └─> Absolute Storage Guard:
      - PostgreSQL CHECK ("quantity" >= 0) ensures quantity can NEVER be negative.
```

### Why Naive Approaches Fail and Why Our Design is Correct:

1. **Why "Read-Then-Write" fails:**
   - In naive implementations, application code queries `const snack = await db.snack.findUnique(...)` and then issues `await db.snack.update({ data: { quantity: snack.quantity - 1 } })`.
   - When 10 requests arrive simultaneously, all 10 read `quantity = 3` before any write occurs. All 10 then write `quantity = 2`, or decrement sequentially to `-7`, corrupting inventory data and overselling stock.
2. **Why in-memory locks fail:**
   - In-memory Node.js mutexes only lock within a single Node.js process. In any multi-container, cluster, or serverless deployment, in-memory locks do not protect other instances.
3. **Why atomic database conditional update is standard:**
   - By embedding `WHERE quantity >= amount` directly into the atomic SQL `UPDATE` statement, PostgreSQL performs evaluation and decrement in a single atomic row operation protected by database row-level locking.
   - Zero overselling is mathematically and structurally guaranteed.

---

## 6. API Request & Response Contracts

### 1. Consume Snack

- **Route:** `POST /snacks/:id/consume` (or `/api/snacks/:id/consume`)
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "amount": 1
  }
  ```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "message": "Snack consumed successfully",
  "data": {
    "snack": {
      "id": "18cf70ca-f3b3-4680-ba67-0c15f91e3e14",
      "name": "Matcha Pocky Sticks",
      "category": "SWEET",
      "quantity": 2,
      "lowStockThreshold": 3,
      "createdAt": "2026-11-12T08:00:00.000Z",
      "updatedAt": "2026-11-12T09:30:00.000Z",
      "status": "RUNNING_LOW",
      "voteCount": 4,
      "hasVoted": false
    },
    "activity": {
      "id": "d0f1b2c3-4e5f-6a7b-8c9d-0e1f2a3b4c5d",
      "userId": "b4a3a69a-251f-4efc-8d14-36873bc7969e",
      "snackId": "18cf70ca-f3b3-4680-ba67-0c15f91e3e14",
      "action": "CONSUMED",
      "amount": 1,
      "createdAt": "2026-11-12T09:30:00.000Z"
    }
  }
}
```

#### Out of Stock / Insufficient Stock Response (`409 Conflict`):
```json
{
  "success": false,
  "message": "Insufficient stock available. Requested 1, but only 0 remaining.",
  "error": {
    "code": "INSUFFICIENT_STOCK"
  }
}
```

#### Not Found Response (`404 Not Found`):
```json
{
  "success": false,
  "message": "Snack not found",
  "error": {
    "code": "NOT_FOUND"
  }
}
```

#### Invalid Amount Response (`400 Bad Request`):
```json
{
  "success": false,
  "message": "Consumption amount must be a positive integer (> 0)",
  "error": {
    "code": "VALIDATION_ERROR"
  }
}
```

---

### 2. Restock Snack

- **Route:** `POST /snacks/:id/restock` (or `/api/snacks/:id/restock`)
- **Headers:** `Authorization: Bearer <admin-token>`
- **Request Body:**
  ```json
  {
    "amount": 10
  }
  ```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "message": "Snack restocked successfully",
  "data": {
    "snack": {
      "id": "18cf70ca-f3b3-4680-ba67-0c15f91e3e14",
      "name": "Matcha Pocky Sticks",
      "category": "SWEET",
      "quantity": 12,
      "lowStockThreshold": 3,
      "createdAt": "2026-11-12T08:00:00.000Z",
      "updatedAt": "2026-11-12T09:35:00.000Z",
      "status": "STOCKED",
      "voteCount": 4,
      "hasVoted": false
    },
    "activity": {
      "id": "e1f2a3b4-c5d6-7e8f-9a0b-1c2d3e4f5a6b",
      "userId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "snackId": "18cf70ca-f3b3-4680-ba67-0c15f91e3e14",
      "action": "RESTOCKED",
      "amount": 10,
      "createdAt": "2026-11-12T09:35:00.000Z"
    }
  }
}
```

#### Forbidden Response (Non-admin member attempt) (`403 Forbidden`):
```json
{
  "success": false,
  "message": "Access denied. Administrator privileges required.",
  "error": {
    "code": "FORBIDDEN"
  }
}
```

---

## 7. Automated Test Suite & Concurrency Verification

All 56 automated tests pass cleanly across 6 test suites:

```text
PASS tests/concurrency.test.ts
PASS tests/auth.test.ts
PASS tests/snacks.test.ts
PASS tests/snackCrud.test.ts
PASS tests/health.test.ts
PASS tests/snackStatus.test.ts

Test Suites: 6 passed, 6 total
Tests:       56 passed, 56 total
Snapshots:   0 total
```

### Specific Concurrency Test Verification (`tests/concurrency.test.ts`):
1. **Simulation Setup:** Creates a snack with initial `quantity = 3`.
2. **Concurrent Execution:** Dispatches 10 parallel HTTP requests simultaneously via `Promise.all`:
   ```typescript
   const requests = Array.from({ length: 10 }, () =>
     request(app)
       .post(`/snacks/${snackId}/consume`)
       .set('Authorization', `Bearer ${memberToken}`)
       .send({ amount: 1 })
   );
   const results = await Promise.all(requests);
   ```
3. **Results Verified:**
   - **Exactly 3 requests returned HTTP 200 OK.**
   - **Exactly 7 requests returned HTTP 409 Conflict (`INSUFFICIENT_STOCK`).**
   - **Final database quantity in PostgreSQL is exactly 0** (verified with direct `prisma.snack.findUnique` query).
   - **No negative stock under any condition.**
   - **Exactly 3 activity records created in PostgreSQL with `action: 'CONSUMED'`.**
   - Subsequent consume attempt when stock is 0 immediately returns `409 Conflict`.
   - Restocking by Admin safely increments stock and creates an audit record within the same transaction.
   - Restocking attempt by unprivileged Member is rejected with `403 Forbidden`.
