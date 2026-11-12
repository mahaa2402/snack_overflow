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

### 3. Automated Test Suite (27 Tests)
```bash
cd backend
npm test
```
Runs 27 integration tests covering:
- Pantry snack listing, filtering, search, and pagination
- Snack inventory statistics calculation
- Snack consumption and stock decrementing
- Single-vote per user database constraint enforcement
- Admin Add, Edit, Delete, and Restock operations
- Member access control & 403 Forbidden protection
- JWT authentication, bcrypt password security, and public member registration

---

For architectural details, schema explanations, and API endpoints, refer to [IMPLEMENTATION_DETAILS.md](./IMPLEMENTATION_DETAILS.md).
