# Snack Overflow — Architecture and Design Notes

**Scope:** Architecture documented from the repository as inspected on 2026-11-14. This is a source-based design description, not a capacity test or deployment review. Statements about likely scaling limits are risks inferred from the implementation, not measured throughput claims.

## 1. Overview

Snack Overflow is a browser-based office pantry application. Members browse inventory, consume snacks, vote, and view personal activity. Administrators manage snacks and users, review activity and insights, and restock inventory.

The application is a modular monolith: one React single-page application calls one Express API, which uses Prisma to access PostgreSQL. Realtime notifications use Server-Sent Events (SSE). The backend has domain-oriented folders, but all backend modules run in the same Node.js process and deploy as one API.

```text
Browser
  React + TypeScript + Vite
  Pages / components / contexts
       | JSON over HTTP; SSE for updates
       v
  Express + TypeScript API
  Routes -> middleware/controllers -> services
       | Prisma Client / selected raw SQL
       v
  PostgreSQL
  users | snacks | votes | activities

SSE publishers and connected-client sets are held in backend process memory.
```

## 2. Project structure and technology

| Area | Responsibility |
|---|---|
| [`frontend/src/main.tsx`](frontend/src/main.tsx), [`frontend/src/App.tsx`](frontend/src/App.tsx) | React bootstrap and top-level providers/router. |
| [`frontend/src/routes/AppRoutes.tsx`](frontend/src/routes/AppRoutes.tsx) | Public, authenticated, and admin page routes/layouts. |
| `frontend/src/pages/`, `frontend/src/components/` | User-facing pantry, member, and administrator screens and reusable UI. |
| `frontend/src/context/` | Authentication, theme, and realtime-update state. |
| `frontend/src/api/` | Axios client and feature-specific API calls. |
| [`backend/src/server.ts`](backend/src/server.ts), [`backend/src/app.ts`](backend/src/app.ts) | HTTP listener/shutdown and Express app/middleware composition. |
| `backend/src/routes/`, `controllers/`, `services/` | Route composition, HTTP handling, and business/data operations. |
| `backend/src/middlewares/`, `validators/`, `utils/` | Authentication/authorization, validation, errors, response formatting, and shared domain logic. |
| [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma), `backend/prisma/migrations/` | PostgreSQL data model and schema evolution. |
| `backend/tests/` | Jest/Supertest tests, including integration and database correctness tests. |

**Manifest-level stack:** React 19, React Router 7, TypeScript, Vite, Tailwind CSS 3, Axios; Node.js/Express 4, Prisma 6, PostgreSQL, JWT, bcrypt; Jest and Supertest on the backend, Vitest in the frontend package. Package manifests specify dependency ranges; the repository does not pin a Node runtime in the files reviewed.

The frontend and backend have separate package manifests. Vite is configured for local development on port 5173; the backend defaults to port 5000. The backend reads its database URL and other settings from environment variables. No production deployment topology or orchestrator configuration is defined by this architecture description.

## 3. Runtime and request flow

1. The browser boots React and wraps the routes in theme, authentication, and realtime providers.
2. The frontend calls the API through a shared Axios client. It sends credentials, attaches a bearer token when available, and normalizes API errors for callers.
3. Express applies CORS, cookie parsing, JSON/form parsing, and request logging before the route handlers.
4. Routes invoke authentication and role middleware where required, then controllers validate/translate HTTP input and delegate business work to services.
5. Services use Prisma for persistence and transactions. A few calculations use raw SQL where the derived status cannot be expressed as a simple Prisma filter.
6. A centralized not-found handler and error handler produce consistent error responses.
7. For live updates, authenticated browsers open an SSE stream. Backend services broadcast inventory/vote or alert refresh events to connected clients.

The API is exposed under `/api` and selected route groups are also mounted at the root path (for example `/snacks`). This provides compatibility but creates two externally visible paths for overlapping operations; clients and future API changes should treat `/api` as the documented canonical prefix.

## 4. Functional boundaries

- **Authentication and authorization:** signup, login, logout, current-user lookup, and role checks. Public signup creates a member; admin-only operations are guarded by backend middleware.
- **Inventory:** snack CRUD, server-side search/filter/pagination, inventory counts, and derived stock status.
- **Consumption and voting:** authenticated members consume stock and vote; users can remove their own votes.
- **Activity and insights:** activity records support personal histories, admin feeds, usage summaries, trends, and restock analytics.
- **Restocking and alerts:** administrators receive computed suggestions/alerts and can restock one or multiple snacks.
- **Realtime:** SSE informs connected clients about selected inventory, vote, and alert changes.

The main route modules are `auth`, `snacks`, `votes`, `activities`, `admin`, `restock`, `alerts`, `realtime`, and `health`, aggregated by `backend/src/routes/index.ts`.

## 5. Data model and invariants

The Prisma schema maps four primary models to PostgreSQL tables:

| Entity | Purpose and constraints |
|---|---|
| `User` | Identity, email, password hash, and `ADMIN`/`MEMBER` role. Email is unique. |
| `Snack` | Name, category, quantity, low-stock threshold, and timestamps. Name is unique; category is indexed. |
| `Vote` | A user's vote for a snack. `(userId, snackId)` is unique, so a user can vote once per snack. |
| `Activity` | Consumption or restock event with user, snack, amount, and timestamp. This is the history source for activity and analytics. |

Foreign keys cascade vote deletion with its user/snack, while activity references restrict deletion until related history is handled. PostgreSQL check constraints enforce nonnegative snack quantity and positive activity amount.

Snack status is **derived, not persisted**: zero quantity is `GONE`; positive quantity up to and including the low-stock threshold is `RUNNING_LOW`; quantity above the threshold is `STOCKED`. This avoids a separately stored status becoming inconsistent with quantity, at the cost of recalculating it and using raw SQL for some status filters.

### Inventory consistency

Consumption is performed as a conditional database update (`quantity >= requested amount`) inside a transaction, and the corresponding activity insert is in that same transaction. The database, rather than a process-local lock, decides whether the update succeeds. Insufficient stock returns a conflict; a PostgreSQL check constraint is an additional guard against negative stock.

Restock updates and activity inserts also share a transaction. Batch restocking uses a transaction over its items. These choices preserve inventory/audit consistency under concurrent API instances, subject to PostgreSQL availability and transaction capacity.

## 6. Authentication, API, and browser state

- Backend authentication accepts a signed JWT from an HttpOnly cookie or an Authorization bearer header. The cookie is configured secure in production and has a seven-day lifetime.
- Login/signup return the token as API data as well as setting the cookie. The browser stores a token in session storage; the API client also checks local storage as a fallback.
- Authorization is enforced on the API. Frontend route guards and hidden admin controls are UX, not the security boundary.
- CORS origin is configured by environment variable. The API client uses `VITE_API_BASE_URL`, falling back to the local `/api` backend URL.
- API responses use a shared success/error envelope and centralized error handling.
- Theme preference is browser-local. The first-visit default is light; an existing saved preference takes precedence.

This is a straightforward browser-session approach, but the JWT is not described as having a refresh/revocation mechanism. Token lifetime, cookie policy, CORS origin, and the development JWT fallback must be reviewed and explicitly configured for any production deployment.

## 7. Realtime design

Realtime delivery uses SSE because the current use case is server-to-browser notifications, not a bidirectional messaging session. The browser creates an `EventSource` while authenticated, listens for change events, and refreshes relevant page data. The backend maintains connected Express responses in in-memory `Set`s and periodically writes keep-alive comments.

This is simple and avoids a separate broker for a single backend instance. It has important boundaries: each process only knows its own SSE clients; clients receive no durable event history from these emitters; and each broadcast iterates connected clients. Alert and general realtime streams are separate in-process emitters.

## 8. Key design decisions and trade-offs

| Decision observed in the code | Benefit | Cost / trade-off |
|---|---|---|
| Modular monolith rather than service-per-domain | Simple local development, single deployment, direct calls, and easy database transactions. | All domains share process resources and deployment/release cadence; one hot area can affect the whole API. |
| React SPA separated from Express API | Clear browser/API boundary; frontend can be served independently. | Requires correct API URL, CORS, and cookie settings across origins; client/server contracts must stay aligned. |
| PostgreSQL with Prisma and migrations | Relational constraints, typed data access, transactions, and repeatable schema changes. | ORM does not remove query/index tuning; raw SQL creates PostgreSQL-specific paths that must be maintained alongside Prisma. |
| Activity rows as the operational history for reporting | Auditable actions and a common source for member/admin analytics. | The table grows with use; historical queries and retention/archival need a plan. |
| Derived snack status | No status/quantity drift. | Status filters and analytics must compute status; current filter path may materialize matching IDs before the paged query. |
| Database-atomic stock decrement plus transaction | Prevents overselling and keeps activity consistent without local locks. | Concurrent actions on the same snack serialize at the database row; hot inventory records can become contention points. |
| JWT in cookie plus bearer-token support | Browser cookie support and compatibility with API clients. | More than one token transport/storage path; cookie/CORS/CSRF policy and token lifecycle need deliberate production configuration. |
| SSE for live refresh notifications | Lower complexity than WebSockets for one-way events. | Process-local client registry does not fan out across replicas; long-lived streams consume connections and memory. |
| React contexts and feature API modules | Lightweight shared auth/theme/realtime state without a large client-state framework. | No shared query cache is evident; pages may repeat fetches and event-driven refreshes under heavy usage. |
| Server-side snack pagination | Bounds the normal snack-list response and avoids loading the entire list for that endpoint. | Other paths (for example the admin user roster and analytics) still need review for pagination and bounded result sizes. |

## 9. What is likely to strain first at 100× users

“100×” is not a capacity target here: the repository does not define a baseline user count, concurrency, dataset size, hardware, or measured request rate. The following is a qualitative order of structural risks, not a prediction that any particular request volume will fail.

| Likely pressure point | Evidence and why it matters | Likely first symptom |
|---|---|---|
| **Database work and connection capacity** | Every API instance shares PostgreSQL. Prisma connections/pool settings are not explicitly tuned here. Inventory actions write both snack and activity rows; popular snacks may concentrate writes on one row. | Rising API/database latency, pool waits, transaction timeouts, or lock waits during busy periods. |
| **Analytics on the growing activity table** | Admin insights perform several queries, including an all-time group-by by snack, and fetch recent activities for in-process mapping. Restock suggestions load recent consumption rows and aggregate them in Node. Activity retention/rollups are not evident. | Admin insights/restock endpoints become slow or memory/CPU intensive as history grows, even if ordinary snack reads remain small. |
| **SSE when adding API replicas** | Each emitter stores only local `Response` objects. A request handled by instance A cannot notify clients connected to B. Each event loops over the local client set. | Users see inconsistent/stale screens across instances; per-instance memory/file-descriptor usage increases with concurrent streams. |
| **Unbounded or lightly bounded result paths** | Snack listing is paginated, but the admin user roster returns all users, and some service calculations load result sets for aggregation. | Increasing response times, heap usage, and payload size as users/history grow. |
| **Hot-record writes and event bursts** | Consumption uses row-atomic updates, which is correct, but concurrent consumption of a popular snack contends on that snack row. Each successful action may also trigger a fan-out notification. | Queueing on a small set of rows and bursts of refresh traffic under peak use. |
| **Browser/API request churn** | Authenticated tabs open long-lived SSE streams; event handling causes page-level refreshes. The app has no evident shared server-state cache/deduplication layer. | More API reads per active user and repeated queries following bursts of events. |

These are architectural indicators only. Load testing with representative concurrent users, activity history, SSE connections, and snack popularity distribution is required to identify the actual first bottleneck.

## 10. Scale-up path (recommendations, not current features)

1. **Measure first:** add request latency/error metrics, database pool/lock/query metrics, and SSE connection counts; test realistic read/write mixes and long-lived streams.
2. **Bound work:** paginate user/activity feeds, cap request page sizes, and avoid returning full historical sets. Move trend aggregation into grouped SQL or precomputed rollups; add indexes based on measured query plans and production filters.
3. **Protect PostgreSQL:** configure Prisma pool sizes against the database's connection budget, use connection pooling where needed, and keep transactions short. Consider read replicas only for demonstrated read pressure and where read-after-write semantics permit it.
4. **Make SSE multi-instance:** introduce a shared pub/sub channel or durable event mechanism and have every API instance forward relevant events to its local clients. Define reconnect behavior and whether clients need replay or just refresh signals.
5. **Reduce repeat reads:** introduce appropriate caching or request deduplication for expensive, non-user-specific aggregates, with explicit invalidation rules after inventory/activity changes.
6. **Scale deployment deliberately:** keep API instances stateless apart from local SSE connections, serve the built frontend through a static host/CDN, and validate proxy timeouts and buffering for SSE.

Do not split the monolith into services solely because the user count grows. First profile and isolate the measured pressure point; inventory correctness and analytics depend on shared relational state and benefit from the existing transactional boundary.

## 11. Operational and documentation caveats

- `backend/src/config/env.ts` includes a development JWT secret fallback and does not itself enforce the presence of a strong production secret. Production configuration must override it; startup validation would make misconfiguration fail clearly.
- The backend exposes both `/api/...` and some root-level aliases. New clients should use `/api/...`; removing aliases should be treated as an API compatibility change.
- README and historical reports can describe different test totals or package versions. This note uses package manifests and source code for architecture and intentionally avoids claiming a current passing test count.
- No benchmark, production traffic profile, deployment topology, backup/recovery plan, or operational SLO was established as part of this source review.

## 12. Key source references

- Backend composition: [`backend/src/app.ts`](backend/src/app.ts), [`backend/src/server.ts`](backend/src/server.ts)
- Route map: [`backend/src/routes/index.ts`](backend/src/routes/index.ts)
- Authentication: `backend/src/middlewares/auth.middleware.ts`, `backend/src/controllers/auth.controller.ts`
- Persistence and invariants: [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma), `backend/prisma/migrations/`
- Inventory operations and analytics: `backend/src/services/snack.service.ts`, `backend/src/services/restock.service.ts`
- Realtime: `backend/src/services/realtimeEmitter.service.ts`, `backend/src/services/alertEmitter.service.ts`
- Frontend entry and API: `frontend/src/App.tsx`, `frontend/src/routes/AppRoutes.tsx`, `frontend/src/api/client.ts`
