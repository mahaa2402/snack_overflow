# 🍿 Snack Overflow

Snack Overflow is a full-stack web application built as part of a Full Stack Intern assignment.

## Tech Stack

### Frontend
- **Framework:** React + Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Routing:** React Router v7
- **HTTP Client:** Axios (centralized client with interceptors)

### Backend
- **Runtime & Framework:** Node.js + Express.js
- **Language:** TypeScript
- **ORM:** Prisma ORM
- **Database:** PostgreSQL
- **Testing:** Jest + Supertest
- **Authentication:** JWT + bcrypt

---

## Project Structure
```
snack_overflow/
├── frontend/               # React + TypeScript + Vite SPA
├── backend/                # Express + TypeScript + Prisma API
├── IMPLEMENTATION_DETAILS.md # Complete architectural breakdown
└── README.md
```

---

## Quickstart

### 1. Backend Setup
```bash
cd backend
npm install
npm run prisma:generate
npm run dev
```
Backend API will start on: `http://localhost:5000`  
Health check endpoint: `http://localhost:5000/api/health`

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend will start on: `http://localhost:5173`

### 3. Run Backend Tests
```bash
cd backend
npm test
```

For complete details on the architecture, folder responsibilities, and verification procedures, refer to [IMPLEMENTATION_DETAILS.md](./IMPLEMENTATION_DETAILS.md).

