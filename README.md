# StockFlow — Mini ERP + CRM Operations Portal

![Node](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-backend-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma_ORM-4169E1?logo=postgresql&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
[![Quality Checks](https://github.com/harshraj211/StockFlow/actions/workflows/ci.yml/badge.svg)](https://github.com/harshraj211/StockFlow/actions/workflows/ci.yml)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

A full-stack case study for a wholesale/distribution business — authentication and role-based access, customer CRM with follow-up tracking, product inventory with a real stock movement ledger, and a sales challan engine with atomic, race-safe stock deduction.

---

## 🎥 For Reviewers — Start Here

If you only have 5 minutes:

| | |
|---|---|
| **Live App** | [stockflow-finance.vercel.app](https://stockflow-finance.vercel.app) |
| **API Health** | [stockflow-api-x7w3.onrender.com/health](https://stockflow-api-x7w3.onrender.com/health) |
| **API Docs (Swagger)** | [stockflow-api-x7w3.onrender.com/docs](https://stockflow-api-x7w3.onrender.com/docs) |
| **Test Credentials** | See [Test Credentials](#test-credentials) below — all roles use `Password@123` |

The single feature worth testing first: create a sales challan, confirm it, then try another confirmation that would oversell stock. The API **rejects the unsafe confirmation without making partial changes** — the core business rule this case study is built around (see [Design Notes](#design-notes--what-i-learned-building-this) below).

---

## Table of Contents

- [What Makes StockFlow Different](#what-makes-stockflow-different)
- [Tech Stack](#tech-stack)
- [Test Credentials](#test-credentials)
- [Local Setup](#local-setup)
- [API Reference](#api-endpoints-reference)
- [Architecture](#architecture--code-design)
- [Design Notes](#design-notes--what-i-learned-building-this)
- [Known Limitations](#known-limitations--incomplete-parts)
- [Deployment](#deployment)
- [Submission Deliverables](#submission-deliverables)

---

## What Makes StockFlow Different

Most submissions for this case study can stop at CRUD. StockFlow adds business-facing reliability and reviewer-friendly product depth:

1. **Actionable Dashboard** — low stock, follow-up, draft challan, revenue, and operational exception signals are visible from the first screen.
2. **Notification Deep Links** — alerts open the exact customer, product, or challan record that needs attention.
3. **Audit Thinking** — a global Activity Log, customer activity, inventory movements, and challan lifecycle events are all visible in timeline or ledger format.
4. **Race-Safe Business Rules** — stock confirmation uses a conditional atomic decrement, not a check-then-write pattern, so concurrent confirms can't oversell (see [Design Notes](#design-notes--what-i-learned-building-this)).
5. **Professional Document Output** — challan print view includes branding, customer details, item table, totals, notes, and a signature area.
6. **Role Demonstration** — Admin, Sales, Warehouse, and Accounts accounts show different permission boundaries clearly in both the UI and the API.
7. **Reviewer-Ready Experience** — a public product overview, focused login flow, responsive operations workspace, and Light/Dark/System themes make every workflow easy to inspect.

---

## Tech Stack

- **Backend**: Node.js, TypeScript, Express.js, Prisma ORM, PostgreSQL, JWT, Zod, Helmet, Express Rate Limit
- **Frontend**: React 19, TypeScript, Vite, CSS (Vanilla Design System)
- **DevOps**: Docker Compose (local PostgreSQL), GitHub Actions CI, environment-based configuration
- **Hosting**: Vercel (frontend), Render (API), Supabase (PostgreSQL)

---

## Key Backend Features & Enhancements

- **Reviewer Walkthrough Mode**: in-app guide explaining seeded credentials, demo flow, role boundaries, and business rules for fast evaluation.
- **JWT Authentication & RBAC**: roles (`ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS`) with granular endpoint protection and account activation control (`isActive`).
- **Security & Rate Limiting**: rate limiting on `/auth/login` (20 req/15min), a lighter general API limiter, required JWT secret validation, and Helmet HTTP security headers.
- **Health Check API**: `GET /health` runs a live database ping (`SELECT 1`) and reports required-env readiness.
- **Swagger/OpenAPI Docs**: `GET /docs` serves interactive API documentation; `GET /openapi.json` exposes the raw contract.
- **Executive Dashboard KPIs**: `GET /dashboard/stats` returns revenue, active/lead breakdowns, low-stock items, upcoming follow-ups, and recent challans.
- **Customer CRM Module**: create/read/update workflows, status filtering (`LEAD`, `ACTIVE`, `INACTIVE`), pagination, search, and date-stamped follow-up notes with author attribution.
- **Product & Inventory Module**: SKU uniqueness enforcement, category/location tracking, stock-level warnings, and a full IN/OUT stock movement audit log with reason and user attribution.
- **Sales Challan Engine**: multi-product draft/confirmed creation, retry-safe sequential numbers (`CH-2026-00001`), snapshotting of product details, total amount computation, and atomic guarded stock decrements that never let stock go negative.
- **Challan Status History**: every lifecycle event stored with from/to status, note, actor, role, and timestamp for full auditability.
- **Admin User Management**: list, register, adjust roles, activate/deactivate accounts.
- **Operational UI Polish**: responsive role-aware navigation, hidden unauthorized modules, Light/Dark/System themes, route-based record URLs, notification deep-links, filters, low-stock review, manual stock entry, challan lifecycle timeline, browser print, server-generated PDF, pagination, loading states, and empty states.
- **Automated Quality Gate**: GitHub Actions installs dependencies, generates Prisma Client, runs backend tests, and builds both applications on pushes and pull requests.
- **Backend Test Coverage**: unit tests for login, role denial, negative stock prevention, challan confirmation — plus an optional real-Postgres integration suite (see [Local Setup](#local-setup)).

---

## Test Credentials

All seeded accounts use the password: `Password@123`

| Role | Email | Permissions |
|---|---|---|
| **Admin** | `admin@fundsroom.test` | Full operational access + user management |
| **Sales** | `sales@fundsroom.test` | Manage customers, follow-up notes, create/edit challans |
| **Warehouse** | `warehouse@fundsroom.test` | Manage products & execute stock movements |
| **Accounts** | `accounts@fundsroom.test` | View reports, confirm/cancel challans for billing |

---

## Local Setup

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Environment Variables
```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

### 3. Start Database (PostgreSQL)
```bash
docker compose up -d
```
*(Alternatively, supply your own PostgreSQL connection string in `apps/backend/.env`)*

### 4. Database Migration & Seeding
```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

### 5. Start Development Servers
```bash
pnpm dev
```

| Service | URL |
|---|---|
| Frontend App | `http://localhost:5173` |
| Backend API | `http://localhost:4000` |
| Health Check | `http://localhost:4000/health` |
| API Docs (Swagger) | `http://localhost:4000/docs` |
| OpenAPI JSON | `http://localhost:4000/openapi.json` |

### 6. Run Tests
```bash
pnpm --filter backend test
pnpm build
```

For a real Postgres stock-safety check against a live database rather than a mock:
```bash
TEST_DATABASE_URL="postgresql://..." RUN_INTEGRATION_TESTS=true pnpm --filter backend test
```
The integration suite creates and removes only its own `integration-*` records and will not run without `TEST_DATABASE_URL` set.

---

## API Endpoints Reference

Business endpoints require `Authorization: Bearer <token>`. `/auth/login`, `/health`, `/docs`, and `/openapi.json` are public.

### Auth, Docs & Health
- `GET  /health` — live database status check
- `GET  /docs` — interactive Swagger/OpenAPI documentation
- `GET  /openapi.json` — raw OpenAPI 3.0 contract
- `POST /auth/login` — authenticate & return JWT (rate-limited)

### Executive Dashboard
- `GET  /dashboard/stats` — consolidated KPIs, revenue, low stock list, upcoming follow-ups

### Customers (CRM)
- `GET  /customers` — list (supports `page`, `limit`, `search`)
- `POST /customers` — create (`ADMIN`, `SALES`)
- `GET  /customers/:id` — details + follow-up history
- `PUT  /customers/:id` — update (`ADMIN`, `SALES`)
- `POST /customers/:id/follow-ups` — append follow-up note (`ADMIN`, `SALES`)

### Activity Log
- `GET  /activity` — global activity stream (supports `page`, `limit`, `search`)

### Products & Inventory
- `GET  /products` — list (supports `page`, `limit`, `search`)
- `POST /products` — add (`ADMIN`, `WAREHOUSE`)
- `GET  /products/:id` — details + recent stock movements
- `PUT  /products/:id` — edit (`ADMIN`, `WAREHOUSE`)
- `GET  /products/:id/movements` — paginated stock movement audit trail
- `POST /products/:id/movements` — manual IN/OUT adjustment (`ADMIN`, `WAREHOUSE`)

### Sales Challans
- `GET   /challans` — list (supports `page`, `limit`, `search`)
- `POST  /challans` — create, Draft or Confirmed (`ADMIN`, `SALES`)
- `GET   /challans/:id` — full detail with item snapshots
- `GET   /challans/:id/pdf` — server-generated challan PDF
- `PATCH /challans/:id/notes` — update notes on a Draft challan (`ADMIN`, `SALES`)
- `PATCH /challans/:id/status` — confirm or cancel (`ADMIN`, `SALES`, `ACCOUNTS`)

### User Management (`ADMIN` only)
- `GET   /users` — list all internal users
- `POST  /users` — create a user account
- `PUT   /users/:id` — update name or role
- `PATCH /users/:id/deactivate` — soft-deactivate
- `PATCH /users/:id/activate` — re-activate

---

## Postman Collection

A complete, production-ready Postman collection is included at `postman/Mini_ERP_CRM.postman_collection.json`:
- **Auto-Token Capture** — logging in as any user sets `{{token}}` for all subsequent requests.
- **Auto-ID Capture** — creating a customer, product, or challan populates `{{customerId}}`, `{{productId}}`, `{{challanId}}`.
- **Negative & Role Validation Tests** — insufficient-stock errors, invalid credentials, 403s on non-admin actions.

Interactive documentation is also served live from the backend at `/docs`, with the raw contract at `/openapi.json`.

---

## Architecture & Code Design

Full diagrams and reasoning live in [`ARCHITECTURE.md`](./ARCHITECTURE.md), covering the challan confirmation flow, concurrency handling, and the design tradeoffs behind the atomic stock-decrement approach.

### Backend (`apps/backend`)
- `src/app.ts` — Express setup, security middleware (Helmet, rate limiter, CORS), route mounting, central error handling
- `src/auth.ts` — JWT verification middleware and role-based guards (`requireRoles`)
- `src/routes/*` — modular REST controllers per domain (Auth, Customers, Products, Challans, Users, Dashboard)
- `src/validators.ts` — Zod request validation
- `src/http.ts` — standardized error class and async handler wrapper
- `prisma/schema.prisma` — data models, enums, indexes, `Decimal(12,2)` precision types

### Frontend (`apps/frontend`)
- Walkthrough — reviewer-ready demo guide, credentials, module shortcuts, business-rule highlights
- Dashboard — revenue KPIs, low-stock alerts, upcoming follow-ups, notification actions, recent challans
- Customers — add/edit, Hot/Warm/Cold priority, follow-up filters, detail view, notes
- Products — add/edit, status badges, category/location/low-stock filters, reorder suggestion, manual stock movement, audit history
- Challans — draft/confirmed creation, detail view, lifecycle timeline, notes, confirm/cancel, print, PDF export
- Activity — global audit stream across CRM, inventory, challans, admin actions
- Deep Links — real URLs for records (`/customers/:id`, `/products/:id`, `/challans/:id`) with browser history support
- Lists — API-backed pagination throughout
- Users — admin-only creation, role updates, activation/deactivation

---

## Design Notes — What I Learned Building This

**Stock deduction is the one part of this system that can't be "mostly correct."** Two design decisions came out of thinking through that:

1. **Challan numbers are generated retry-safe, not just sequentially.** An earlier version counted existing challans and incremented — fine until two challans get created close together and collide on the same number. Fixed by generating inside the same transaction with a retry path on unique-constraint conflicts, rather than trusting a read-then-write outside the transaction boundary.
2. **Stock deduction uses a conditional atomic update, not check-then-write.** A naive implementation reads `currentStock`, compares it to the requested quantity, then writes the decrement — which is unsafe if two challans confirm against the same product at nearly the same moment; both can pass the check before either commits. The fix updates and checks in one atomic operation (`UPDATE ... WHERE currentStock >= quantity`, then checking the affected row count), so the database itself enforces the invariant instead of application logic racing against itself.

This is also why there's an optional real-Postgres integration test path (see [Local Setup](#local-setup)) — the unit tests mock Prisma and can prove the logic is wired correctly, but only a test against a real database can prove the race condition is actually closed.

---

## Known Limitations & Incomplete Parts

Being upfront about scope boundaries and tradeoffs made under the assignment's time constraint:

- **Confirmed challans cannot be cancelled or edited**, only Draft ones. Reversing a confirmed challan (e.g. a customer return) would need a separate credit/return flow, which is out of scope here — this is a deliberate assumption, not an oversight, and is documented in [Key Assumptions](#key-assumptions--business-logic) below.
- **No multi-warehouse stock allocation.** `location` is stored per product as a single field; the schema doesn't yet support splitting one SKU's stock across multiple warehouses with independent reorder thresholds.
- **No refresh-token flow.** Auth issues a single JWT on login with a fixed expiry; there's no silent-refresh or long-lived session handling, which a production system would want.
- **No file/image upload.** Product photos and document attachments (e.g. scanned PO) aren't supported — S3 upload was considered but deprioritized in favor of correctness-critical backend work.
- **Frontend is a single-file React app (`App.tsx`).** It works and is fully functional, but isn't split into `pages/`/`components/` the way a larger production codebase would be — a conscious tradeoff to prioritize backend business logic within the time available.

---

## Key Assumptions & Business Logic

1. **Stock Deduction** — stock is deducted inside a Prisma transaction only when a challan moves to `CONFIRMED`.
2. **Negative Stock Prevention** — each line item uses a conditional atomic decrement (`currentStock >= requestedQuantity`). If any product can't satisfy the request, the transaction fails with HTTP 400 and nothing is partially committed.
3. **Data Immutability (Snapshots)** — product details (name, SKU, unit price, category) are snapshotted into `SalesChallanItem` at creation time, preserving historical accuracy even if the product record changes later.
4. **Draft Cancellation** — challans can only be cancelled from `DRAFT`. Confirmed challans stay confirmed, to keep the audit trail consistent (see [Known Limitations](#known-limitations--incomplete-parts) above for the implication of this).

---

## Deployment

- **Frontend**: [StockFlow on Vercel](https://stockflow-finance.vercel.app)
- **Backend**: [StockFlow API on Render](https://stockflow-api-x7w3.onrender.com/health)
- **API Documentation**: [Swagger UI](https://stockflow-api-x7w3.onrender.com/docs)
- **Database**: Supabase managed PostgreSQL
- **Continuous Integration**: [GitHub Actions quality checks](https://github.com/harshraj211/StockFlow/actions/workflows/ci.yml)

The Render free instance may need a short cold start after a period of inactivity. The frontend remains available while the API wakes up.

Deployment configuration:
1. Provision a Postgres instance (Neon/Supabase/Render).
2. Deploy `apps/backend` with env vars `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `FRONTEND_URL`, `PORT`.
3. Run `pnpm --filter backend exec prisma migrate deploy` against the production database.
4. Seed demo credentials (only if this deployment is for review purposes).
5. Deploy `apps/frontend` with `VITE_API_URL` pointing at the live backend.

---

## Submission Deliverables

- ✅ GitHub Repository
- ✅ Postman Collection — `postman/Mini_ERP_CRM.postman_collection.json`
- ✅ Swagger/OpenAPI — `/docs` and `/openapi.json`
- ✅ Architecture Notes — [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- ✅ Seeded Credentials — Admin, Sales, Warehouse, Accounts (`Password@123`)
- ✅ README — setup, architecture, API spec, known limitations
- ✅ Live Frontend — [Vercel](https://stockflow-finance.vercel.app)
- ✅ Live Backend — [Render](https://stockflow-api-x7w3.onrender.com/health)
- ✅ Managed PostgreSQL — Supabase
- ✅ GitHub Actions — automated test and build checks
- ⬜ Demo Recording — *add before submitting*

---

## Demo Recording Checklist

Recommended 4–6 minute walkthrough:

1. Login as Admin, show dashboard KPIs.
2. Open the Walkthrough page, explain roles and business rules.
3. Click a notification, show it opens the exact record needing attention.
4. Add/edit a customer, add a follow-up note.
5. Filter customers by follow-up state, show the customer activity timeline.
6. Add/edit a product, record an IN/OUT stock movement.
7. Show product filters, status badges, reorder suggestion, movement ledger.
8. Create a draft challan with notes and multiple items.
9. Open challan detail, confirm it, show stock reduction and the lifecycle timeline.
10. **Try to confirm/create a challan that exceeds available stock — show it gets rejected with no partial changes.** *(This is the moment worth not skipping — it's the core test of the assignment.)*
11. Use Print / Export PDF from the challan detail view.
12. Show Admin user management and role-aware read-only behavior.
13. Open `/docs`, the Postman collection, or this README briefly to show documentation readiness.
