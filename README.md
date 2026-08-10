# Mini ERP + CRM Operations Portal

Full-stack case study for a wholesale/distribution business. The app covers authentication, role-based access, customer CRM, product inventory, stock movement logs, and sales challans that reduce stock only when confirmed.

## Tech Stack

- Backend: Node.js, TypeScript, Express.js, Prisma, PostgreSQL, JWT
- Frontend: React, TypeScript, Vite, CSS
- DevOps: Docker Compose for local PostgreSQL, environment-based configuration

## Features

- JWT login with Admin, Sales, Warehouse, and Accounts roles
- Customer CRM with search, detail view, follow-up dates, and follow-up notes
- Product inventory with SKU, stock, minimum stock alerts, and warehouse location
- Stock movement logging for IN and OUT movements
- Sales challan creation with multiple products
- Draft, confirmed, and cancelled challan states
- Business logic to block negative stock and store product snapshot data on challans
- Responsive admin-style UI

## Test Credentials

All seeded users use the password:

```text
Password@123
```

| Role | Email |
| --- | --- |
| Admin | admin@fundsroom.test |
| Sales | sales@fundsroom.test |
| Warehouse | warehouse@fundsroom.test |
| Accounts | accounts@fundsroom.test |

## Local Setup

1. Install dependencies:

```bash
pnpm install
```

2. Copy environment files:

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

3. Start PostgreSQL:

```bash
docker compose up -d
```

4. Create database tables and seed demo data:

```bash
pnpm db:migrate
pnpm db:seed
```

5. Start backend and frontend:

```bash
pnpm dev
```

Default URLs:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:4000`
- Health check: `http://localhost:4000/health`

## API Overview

All endpoints except `/auth/login` require:

```text
Authorization: Bearer <token>
```

Main endpoints:

- `POST /auth/login`
- `GET /customers`
- `POST /customers`
- `GET /customers/:id`
- `PUT /customers/:id`
- `POST /customers/:id/follow-ups`
- `GET /products`
- `POST /products`
- `PUT /products/:id`
- `GET /products/:id/movements`
- `POST /products/:id/movements`
- `GET /challans`
- `POST /challans`
- `PATCH /challans/:id/status`

Pagination/search endpoints support `page`, `limit`, and `search` query parameters.

## Role Access

- Admin: full operational access
- Sales: customers, follow-ups, challans
- Warehouse: products and stock movements
- Accounts: read records and confirm/cancel challans for billing workflow

## Architecture

The backend is a layered Express API:

- `src/app.ts` configures middleware and routes
- `src/routes/*` contains REST endpoints
- `src/validators.ts` centralizes Zod validation
- `src/auth.ts` handles JWT authentication and role checks
- `prisma/schema.prisma` defines database tables and relations

The frontend is a Vite React app with a compact admin interface. It uses Axios with a token interceptor and keeps the required flows available from a single dashboard-style shell.

## Deployment Notes

Free deployment option:

- Database: Neon or Supabase Postgres
- Backend: Render, Railway, or Fly.io
- Frontend: Vercel or Netlify

Backend environment variables:

```text
DATABASE_URL=postgresql://...
JWT_SECRET=strong-production-secret
JWT_EXPIRES_IN=1d
PORT=4000
FRONTEND_URL=https://your-frontend-url
```

Frontend environment variable:

```text
VITE_API_URL=https://your-backend-url
```

Deployment flow:

1. Create a hosted PostgreSQL database.
2. Set backend environment variables in the hosting dashboard.
3. Deploy backend from `apps/backend` with build command `pnpm install && pnpm --filter backend build` and start command `pnpm --filter backend start`.
4. Run migrations against the hosted database: `pnpm --filter backend prisma migrate deploy`.
5. Deploy frontend from `apps/frontend` with build command `pnpm install && pnpm --filter frontend build`.
6. Set `VITE_API_URL` to the live backend URL.

## Assumptions

- Challan stock is reduced only once, when moving from Draft to Confirmed or when directly created as Confirmed.
- Cancelled challans do not restore stock because only unconfirmed drafts can be cancelled in the intended flow.
- Product snapshot data is copied into challan items so future product edits do not alter old challans.
- Email and SKU are unique identifiers.

## Known Limitations

- No automated test suite yet.
- No PDF invoice export or S3 product images; those are listed as bonus items in the assignment.
- Local setup assumes Docker is available for PostgreSQL. A hosted Postgres URL can be used instead.

## Submission Checklist

- GitHub repository link
- Live frontend URL
- Live backend API URL
- Test login credentials above
- Postman collection: `postman/Mini_ERP_CRM.postman_collection.json`
- README setup and architecture notes
- Known limitations section
