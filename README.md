# Mini ERP + CRM Operations Portal

Full-stack case study for a wholesale/distribution business. The app covers authentication, role-based access control (RBAC), customer CRM with follow-up tracking, product inventory management, stock movement audit logs, and sales challans with automatic stock deduction and snapshot preservation.

## Tech Stack

- **Backend**: Node.js, TypeScript, Express.js, Prisma ORM, PostgreSQL, JWT, Zod, Helmet, Express Rate Limit
- **Frontend**: React 19, TypeScript, Vite, CSS (Vanilla Design System)
- **DevOps**: Docker Compose (PostgreSQL), Environment-based configuration

---

## Key Backend Features & Enhancements

- **JWT Authentication & RBAC**: Roles (`ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS`) with granular endpoint protection and user account activation control (`isActive`).
- **Security & Rate Limiting**: Built-in rate limiting on `/auth/login` (20 req/15min) and Helmet HTTP security headers.
- **Health Check API**: `GET /health` conducts a live database ping check (`SELECT 1`).
- **Executive Dashboard KPIs**: `GET /dashboard/stats` provides total revenue, active/lead customer breakdowns, low-stock inventory items, upcoming follow-ups, and recent sales challans.
- **Customer CRM Module**: Full CRUD, status filtering (`LEAD`, `ACTIVE`, `INACTIVE`), pagination, search, and date-stamped follow-up notes with author attribution.
- **Product & Inventory Module**: Product management with SKU uniqueness enforcement, category/location tracking, stock level warnings, and full stock movement audit logging (`IN` / `OUT` with reason & user attribution).
- **Sales Challan Engine**: Multi-product challan creation (Draft or Confirmed), auto-generated sequential numbers (`CH-2026-00001`), snapshotting of product details (name, SKU, unit price), total amount computation, and atomic database transactions ensuring stock never drops below zero.
- **Admin User Management**: `ADMIN` role can list users, register new team members, adjust roles, and activate/deactivate accounts.
- **Operational UI Polish**: Customer/product edit flows, full customer detail panel, product filters, low-stock-only view, manual stock movement entry, product movement audit trail, challan detail view, browser print flow, server-generated PDF download, pagination controls, and role-aware read-only states.
- **Backend Test Coverage**: Tests cover login, role denial, negative stock prevention, and challan confirmation stock deduction.

---

## Test Credentials

All seeded accounts use the password: `Password@123`

| Role | Email | Permissions |
| -- | -- | -- |
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

Copy the sample env files:

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

### 3. Start Database (PostgreSQL)

If using Docker:
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

Default local endpoints:
- **Frontend App**: `http://localhost:5173`
- **Backend API**: `http://localhost:4000`
- **Health Check**: `http://localhost:4000/health`

### 6. Run Tests

```bash
pnpm --filter backend test
pnpm build
```

---

## API Endpoints Reference

All endpoints (except `/auth/login` and `/health`) require:
`Authorization: Bearer <token>`

### Auth & Health
- `GET  /health` - Live database status check
- `POST /auth/login` - Authenticate user & return JWT token (rate-limited)

### Executive Dashboard
- `GET  /dashboard/stats` - Consolidated KPIs, revenue, low stock list, & upcoming follow-ups

### Customers (CRM)
- `GET  /customers` - List customers (supports `page`, `limit`, `search`)
- `POST /customers` - Create new customer (`ADMIN`, `SALES`)
- `GET  /customers/:id` - Get customer details + follow-up history
- `PUT  /customers/:id` - Update customer details (`ADMIN`, `SALES`)
- `POST /customers/:id/follow-ups` - Append follow-up note (`ADMIN`, `SALES`)

### Products & Inventory
- `GET  /products` - List products (supports `page`, `limit`, `search`)
- `POST /products` - Add product (`ADMIN`, `WAREHOUSE`)
- `GET  /products/:id` - Get product details + recent stock movements
- `PUT  /products/:id` - Edit product (`ADMIN`, `WAREHOUSE`)
- `GET  /products/:id/movements` - View paginated stock movement audit trail
- `POST /products/:id/movements` - Manual stock adjustment (`IN`/`OUT`) (`ADMIN`, `WAREHOUSE`)

### Sales Challans
- `GET   /challans` - List sales challans (supports `page`, `limit`, `search`)
- `POST  /challans` - Create challan (Draft or Confirmed) (`ADMIN`, `SALES`)
- `GET   /challans/:id` - View complete challan details with item snapshots
- `GET   /challans/:id/pdf` - Download server-generated challan PDF
- `PATCH /challans/:id/notes` - Update notes on draft challan (`ADMIN`, `SALES`)
- `PATCH /challans/:id/status` - Change status to `CONFIRMED` or `CANCELLED` (`ADMIN`, `SALES`, `ACCOUNTS`)

### User Management (`ADMIN` Only)
- `GET   /users` - List all internal users
- `POST  /users` - Create user account
- `PUT   /users/:id` - Update user name or role
- `PATCH /users/:id/deactivate` - Soft-deactivate user account
- `PATCH /users/:id/activate` - Re-activate user account

---

## Postman Collection

A complete, production-ready Postman collection is included in `postman/Mini_ERP_CRM.postman_collection.json`. **Features of the Postman Collection:**
- **Auto-Token Capture**: Logging in as any user automatically sets the `{{token}}` collection variable for all subsequent requests.
- **Auto-ID Capture**: Creating a customer, product, or challan automatically populates `{{customerId}}`, `{{productId}}`, and `{{challanId}}`.
- **Negative & Role Validation Tests**: Includes test cases for insufficient stock errors, invalid credentials, and non-admin permission denials (403).

---

## Architecture & Code Design

### Backend (`apps/backend`)
- `src/app.ts`: Express application setup, security middleware (Helmet, Rate Limiter, CORS), route mounting, and central error handling.
- `src/auth.ts`: Auth middleware verifying JWT signatures and enforcing role-based permissions (`requireRoles`).
- `src/routes/*`: Modular REST controllers for Auth, Customers, Products, Challans, Users, and Dashboard.
- `src/validators.ts`: Type-safe request body & parameter validation using Zod.
- `src/http.ts`: Standardized HTTP error class and async route handler wrapper.
- `prisma/schema.prisma`: Data models with relations, enums, indexes, and precision numeric types (`Decimal(12,2)`).

### Frontend (`apps/frontend`)
- Dashboard: Revenue KPIs, low-stock alerts, upcoming follow-ups, and recent challans.
- Customers: Add/edit customers, follow-up filters, full detail view, and follow-up notes.
- Products: Add/edit products, category/location/low-stock filters, manual stock movement, and audit history.
- Challans: Create draft/confirmed challans, detail view, draft notes, confirm/cancel actions, browser print, and server PDF download.
- Lists: API-backed pagination controls on customer, product, challan, and user lists.
- Users: Admin-only user creation, role updates, activation, and deactivation.

---

## Key Assumptions & Business Logic

1. **Stock Deduction**: Stock is deducted inside a serializable Prisma transaction only when a challan is set to `CONFIRMED` state.
2. **Negative Stock Prevention**: Transactions fail atomically with HTTP 400 if product stock is lower than requested quantity.
3. **Data Immutability (Snapshots)**: Product details (name, SKU, unit price, category) are snapshot into `SalesChallanItem` rows upon creation, preserving historical records even if product details change later.
4. **Draft Cancellation**: Challans can only be cancelled from `DRAFT` status. Confirmed challans cannot be cancelled directly to maintain audit trail consistency.

---

## Submission Deliverables

- **GitHub Repository**: Included
- **Postman Collection**: `postman/Mini_ERP_CRM.postman_collection.json`
- **Seeded Credentials**: Admin, Sales, Warehouse, Accounts (`Password@123`)
- **Documentation**: Comprehensive README with setup, architecture, and API specs

---

## Demo Recording Checklist

Recommended 4-6 minute walkthrough:

1. Login as Admin and show dashboard KPIs.
2. Add or edit a customer and add a follow-up note.
3. Filter customers by follow-up state.
4. Add or edit a product, then record an IN/OUT stock movement.
5. Show product filters and movement history.
6. Create a draft challan with notes and multiple items.
7. Open challan detail, confirm it, and show stock reduction.
8. Use Print / Export PDF from the challan detail view.
9. Show Admin user management and role-aware read-only behavior.
10. Open Postman collection or README briefly to show API/documentation readiness.

## Deployment Checklist

Before final submission:

1. Create a Neon or Supabase PostgreSQL database.
2. Deploy backend on Render/Railway/Fly.io with `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `FRONTEND_URL`, and `PORT`.
3. Run `pnpm --filter backend exec prisma migrate deploy` against production.
4. Seed demo credentials only if the deployment is for review.
5. Deploy frontend on Vercel/Netlify with `VITE_API_URL` pointing to the backend URL.
6. Update this README with live frontend URL, live backend API URL, and final GitHub repository link.
