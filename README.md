# StockFlow - Mini ERP and CRM Operations Portal

![Node.js](https://img.shields.io/badge/Node.js-22-3C873A?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-20232A?logo=react&logoColor=61DAFB)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-4169E1?logo=postgresql&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-Lambda%20%7C%20API%20Gateway%20%7C%20S3-232F3E?logo=amazonwebservices&logoColor=white)
[![Quality Checks](https://github.com/harshraj211/StockFlow/actions/workflows/ci.yml/badge.svg)](https://github.com/harshraj211/StockFlow/actions/workflows/ci.yml)

StockFlow is a full-stack operations portal for wholesale and distribution teams. It combines customer relationship management, product inventory, stock movements, sales challans, role-based approvals, reporting, and audit history in one responsive application.

The project focuses on the business rule that matters most: confirming a challan must deduct stock exactly once, must never create negative stock, and must leave no partial changes when confirmation fails.

## Live AWS Application

| Resource | URL |
|---|---|
| **StockFlow application** | [https://3586xchi5e.execute-api.ap-south-1.amazonaws.com](https://3586xchi5e.execute-api.ap-south-1.amazonaws.com) |
| **Backend health check** | [https://3586xchi5e.execute-api.ap-south-1.amazonaws.com/health](https://3586xchi5e.execute-api.ap-south-1.amazonaws.com/health) |
| **Swagger API documentation** | [https://3586xchi5e.execute-api.ap-south-1.amazonaws.com/docs](https://3586xchi5e.execute-api.ap-south-1.amazonaws.com/docs) |
| **OpenAPI JSON** | [https://3586xchi5e.execute-api.ap-south-1.amazonaws.com/openapi.json](https://3586xchi5e.execute-api.ap-south-1.amazonaws.com/openapi.json) |
| **GitHub Actions** | [Quality checks and AWS deployment](https://github.com/harshraj211/StockFlow/actions/workflows/ci.yml) |

The AWS URL serves both the React frontend and Express API. A reviewer does not need separate frontend and backend links.

## Test Credentials

All seeded demonstration accounts use `Password@123`.

| Role | Email | Main access |
|---|---|---|
| **Admin** | `admin@fundsroom.test` | Full access, including internal user management |
| **Sales** | `sales@fundsroom.test` | Customers, follow-ups, and sales challan creation |
| **Warehouse** | `warehouse@fundsroom.test` | Products, images, and stock movements |
| **Accounts** | `accounts@fundsroom.test` | Challan review, confirmation, cancellation, and reports |

Navigation is role-aware. Modules a user cannot access are hidden instead of appearing as disabled menu items.

## Reviewer Quick Walkthrough

1. Sign in as **Admin** and inspect the dashboard, notifications, and global search.
2. Open **Customers** to review priorities, follow-up dates, notes, editing, filtering, pagination, and CSV export.
3. Open **Inventory**, select a product, upload or replace its image, record an IN/OUT movement, and inspect the audit trail.
4. Open **Challans**, create a draft with multiple products, then confirm it.
5. Confirm that product stock is deducted and both the challan timeline and global Activity page record the operation.
6. Attempt a confirmation with insufficient stock. StockFlow rejects it without making partial updates.
7. Download the challan PDF and switch between Admin, Sales, Warehouse, and Accounts to inspect permission boundaries.

## Assignment Bonus Features: 4/4 Completed

| Bonus requirement | Status | Implementation |
|---|---|---|
| Docker setup | Completed | PostgreSQL, Express, and the Nginx-served React application run through one `docker compose up` command |
| GitHub Actions deployment | Completed | Tests, builds, Docker validation, Prisma migrations, ECR publishing, CloudFormation deployment, S3 CORS, and production smoke tests |
| Export invoice as PDF | Completed | The backend generates an A4 sales challan PDF through PDFKit |
| Upload product image to AWS S3 | Completed | Private S3 objects, direct presigned uploads, verification, replacement, deletion, and short-lived read URLs |

An additional full AWS deployment is also complete using API Gateway, Lambda, ECR, CloudFormation, IAM OIDC, CloudWatch Logs, and S3.

## Major Features

### Dashboard and Operational Control

- Revenue, customer, challan, healthy-stock, low-stock, and out-of-stock KPIs.
- Low-stock recovery, follow-up queue, and pending confirmation panels.
- Notifications that deep-link to the customer, product, or challan requiring attention.
- Role-specific dashboard content and navigation.
- Global search across customers, products, and challans.
- Light, dark, and system theme support.

### Customer CRM

- Create, view, and edit customer records.
- Customer status: Lead, Active, or Inactive.
- Hot, Warm, and Cold priority tracking.
- Search, status filters, follow-up filters, pagination, and CSV export.
- Separate customer detail routes with notes and chronological activity.
- Follow-up date, note, author, and timestamp tracking.
- Empty, loading, validation, and error states.

### Product and Inventory Management

- Create, view, and edit products with unique SKUs.
- Category, warehouse location, unit price, current stock, and minimum stock.
- Healthy, low-stock, and out-of-stock filtering.
- Reorder suggestions and dashboard alerts.
- Manual IN/OUT movements with quantity, reason, author, and timestamp.
- Full Inventory Audit Trail with stable responsive columns.
- CSV export and API-backed pagination.
- Database-level `currentStock >= 0` check constraint.

### Private AWS S3 Product Images

- Admin and Warehouse users can upload, replace, or remove product images from the Inventory page.
- Images upload directly from the browser to S3 through a five-minute presigned PUT URL.
- Supported formats are JPEG, PNG, and WebP, with a maximum size of 5 MB.
- The API verifies the uploaded object's key, content type, and content length before linking it to a product.
- The S3 bucket remains private with Block Public Access enabled.
- Product responses contain a one-hour presigned read URL instead of exposing a public object.
- Lambda receives least-privilege access only to the bucket's `products/*` objects.
- Replaced and removed images are deleted from S3.

### Sales Challans

- Multi-product Draft or Confirmed challan creation.
- Retry-safe sequential challan numbers such as `CH-2026-00001`.
- Product name, SKU, category, location, and price snapshots preserve historical accuracy.
- Server-computed quantities and totals.
- Draft notes and a complete status timeline.
- Confirmation and cancellation controlled by role and current status.
- Browser print view and server-generated PDF download.
- CSV export, pagination, search, and status filters.

### Authentication and Administration

- JWT authentication with bcrypt password hashing.
- Admin, Sales, Warehouse, and Accounts roles.
- Backend-enforced role authorization for every protected operation.
- Admin-only user creation, role updates, activation, and soft deactivation.
- Password complexity validation when accounts are created.
- Login rate limiting and general API rate limiting.
- Helmet security headers, controlled CORS, Zod validation, and centralized error handling.

### Auditability and Reporting

- Global activity stream across CRM, inventory, challans, and user administration.
- Customer follow-up history.
- Product stock movement ledger.
- Challan status history with actor, role, note, and timestamp.
- CSV exports for customers, products, challans, and activity.
- Structured JSON request logs with method, path, status, response time, and content length.

## Technical Architecture

```mermaid
flowchart LR
    Browser[React browser client] --> APIGW[AWS API Gateway HTTP API]
    APIGW --> Lambda[AWS Lambda container]
    Lambda --> Frontend[React static application]
    Lambda --> Express[Express REST API]
    Express --> Supabase[(Supabase PostgreSQL)]
    Express --> S3[(Private AWS S3 bucket)]
    Actions[GitHub Actions] --> ECR[AWS ECR]
    Actions --> Migrations[Prisma migrations]
    Actions --> CloudFormation[AWS CloudFormation]
    ECR --> Lambda
    CloudFormation --> APIGW
    CloudFormation --> Lambda
```

### Production Request Flow

1. API Gateway receives every frontend and API request.
2. Lambda runs the container image stored in ECR.
3. Express serves the built React application for browser routes and handles REST endpoints.
4. Prisma connects to Supabase through transaction pooling, with a bounded connection pool suitable for Lambda.
5. Product images are uploaded directly to private S3 using presigned URLs.
6. CloudWatch stores structured Lambda logs with a 14-day retention policy.

### Technology Stack

- **Frontend:** React 19, TypeScript, Vite, React Router, Axios, Lucide icons, custom responsive CSS.
- **Backend:** Node.js 22, Express 5, TypeScript, Prisma ORM, Zod, JWT, bcrypt, PDFKit, Swagger/OpenAPI.
- **Database:** PostgreSQL hosted by Supabase, including Prisma migrations and transaction pooling.
- **AWS:** API Gateway HTTP API, Lambda container, ECR, S3, IAM, CloudFormation, CloudWatch Logs.
- **DevOps:** pnpm workspace, Docker Compose, GitHub Actions, GitHub OIDC, automated smoke tests.
- **Testing:** Vitest, Supertest, mocked service tests, and an optional real-PostgreSQL integration suite.

## Reliability and Data Integrity

### Atomic challan confirmation

Challan confirmation executes inside a Prisma transaction. Each product is updated with a conditional atomic decrement:

```ts
const result = await tx.product.updateMany({
  where: {
    id: item.productId,
    currentStock: { gte: item.quantity }
  },
  data: {
    currentStock: { decrement: item.quantity }
  }
});

if (result.count === 0) {
  throw new HttpError(400, "Insufficient stock");
}
```

This avoids a check-then-write race. Concurrent confirmations cannot both pass a stale stock check, and a failure rolls back every deduction, movement, and status change in the transaction.

### Additional safeguards

- A PostgreSQL CHECK constraint prevents `Product.currentStock` from becoming negative.
- Confirmed challans cannot be edited or cancelled.
- Draft challan notes and status changes are recorded in history.
- Sales challan items store snapshots rather than relying on mutable product values.
- Challan number conflicts are handled through transactional generation and retry.
- Required environment variables fail fast during application startup.
- The `/health` endpoint verifies database connectivity and reports S3 configuration readiness.

More detail is available in [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## API Reference

`/auth/login`, `/health`, `/docs`, and `/openapi.json` are public. Business endpoints require `Authorization: Bearer <token>`.

### Platform

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/health` | Database and environment readiness |
| `GET` | `/docs` | Interactive Swagger UI |
| `GET` | `/openapi.json` | OpenAPI 3 specification |
| `POST` | `/auth/login` | Authenticate and return a JWT |
| `GET` | `/dashboard/stats` | Operational KPIs and exception queues |
| `GET` | `/activity` | Paginated global audit stream |

### Customers

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/customers` | Searchable and paginated customer list |
| `POST` | `/customers` | Create a customer |
| `GET` | `/customers/:id` | Customer detail and follow-up history |
| `PUT` | `/customers/:id` | Update a customer |
| `POST` | `/customers/:id/follow-ups` | Add a follow-up note |

### Products and Inventory

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/products` | Search, filter, and paginate inventory |
| `POST` | `/products` | Create a product |
| `GET` | `/products/:id` | Product detail and recent movements |
| `PUT` | `/products/:id` | Update a product |
| `GET` | `/products/:id/movements` | Paginated inventory audit trail |
| `POST` | `/products/:id/movements` | Record an IN/OUT movement |
| `POST` | `/products/:id/image/upload-url` | Create a five-minute S3 upload URL |
| `POST` | `/products/:id/image/complete` | Verify and attach the uploaded image |
| `DELETE` | `/products/:id/image` | Remove the product image from S3 |

### Sales Challans

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/challans` | Searchable and paginated challan list |
| `POST` | `/challans` | Create a Draft or Confirmed challan |
| `GET` | `/challans/:id` | Challan detail and lifecycle history |
| `GET` | `/challans/:id/pdf` | Download the server-generated PDF |
| `PATCH` | `/challans/:id/notes` | Update notes on a Draft challan |
| `PATCH` | `/challans/:id/status` | Confirm or cancel a Draft challan |

### Admin Users

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/users` | List internal users |
| `POST` | `/users` | Create a user |
| `PUT` | `/users/:id` | Update name or role |
| `PATCH` | `/users/:id/deactivate` | Soft-deactivate a user |
| `PATCH` | `/users/:id/activate` | Reactivate a user |

## Local Setup

### Prerequisites

- Node.js 22 or later.
- pnpm 11.
- PostgreSQL 16, or Docker for the complete local stack.

### Option 1: Full Stack with Docker

```bash
docker compose up --build -d
docker compose exec backend pnpm --filter backend db:seed
```

Open the following URLs:

| Service | Local URL |
|---|---|
| StockFlow frontend | `http://localhost:8080` |
| Express API | `http://localhost:4000` |
| Health check | `http://localhost:4000/health` |
| Swagger UI | `http://localhost:4000/docs` |

The seed command is needed only when initializing a new PostgreSQL volume.

### Option 2: Manual Development

```bash
pnpm install

# Create local environment files
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env

# Start PostgreSQL only through Docker
docker compose up -d postgres

# Generate Prisma, apply migrations, and seed demo data
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# Start React and Express in development mode
pnpm dev
```

Local development URLs:

| Service | Local URL |
|---|---|
| React application | `http://localhost:5173` |
| Express API | `http://localhost:4000` |
| Health check | `http://localhost:4000/health` |
| Swagger UI | `http://localhost:4000/docs` |
| OpenAPI JSON | `http://localhost:4000/openapi.json` |

### Environment Variables

Backend variables:

```env
DATABASE_URL=postgresql://erp_user:erp_password@localhost:5432/mini_erp?schema=public
JWT_SECRET=replace-with-a-strong-secret
JWT_EXPIRES_IN=8h
PORT=4000
FRONTEND_URL=http://localhost:5173
AWS_REGION=ap-south-1
AWS_S3_BUCKET=your-private-product-image-bucket
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
```

Frontend variable:

```env
VITE_API_URL=http://localhost:4000
```

When running in AWS, Lambda uses its IAM execution role for S3. Long-lived AWS keys are not required inside the production application.

## Testing and Quality Checks

```bash
# Backend API and business-rule tests
pnpm test

# TypeScript and production builds for both applications
pnpm build

# Validate Docker Compose
docker compose config --quiet
```

To run the real-PostgreSQL stock-safety integration suite:

```bash
TEST_DATABASE_URL=postgresql://... RUN_INTEGRATION_TESTS=true pnpm --filter backend test
```

The integration suite creates records prefixed with `integration-`, verifies insufficient-stock rejection against PostgreSQL, and removes its own data afterward.

## Automated AWS Deployment

Every push to `main` runs the following GitHub Actions pipeline:

1. Install locked pnpm dependencies.
2. Generate Prisma Client.
3. Run backend tests.
4. Build the backend and frontend.
5. validate Docker Compose and build both production Docker images.
6. Assume the AWS deployment role through GitHub OIDC.
7. Build the Lambda container and publish an immutable commit-tagged image to ECR.
8. Apply Prisma migrations using the direct Supabase database connection.
9. Deploy API Gateway, Lambda, IAM, and CloudWatch configuration through CloudFormation.
10. Configure S3 CORS for direct browser uploads.
11. Smoke-test the AWS root application and `/health` endpoint.

GitHub stores no long-lived AWS access keys. The workflow exchanges its GitHub OIDC identity for short-lived AWS credentials restricted to this repository and deployment stack.

AWS infrastructure is defined in:

- [`infra/aws-bootstrap.yml`](./infra/aws-bootstrap.yml): GitHub OIDC provider, deployment role, and ECR repository.
- [`infra/aws-app.yml`](./infra/aws-app.yml): Lambda, API Gateway, execution role, environment configuration, and CloudWatch log group.

## Project Structure

```text
StockFlow/
|-- apps/
|   |-- backend/
|   |   |-- prisma/              # Schema, migrations, and seed data
|   |   `-- src/                 # Express API, auth, routes, S3, tests
|   `-- frontend/
|       `-- src/                 # React application and design system
|-- infra/
|   |-- aws-bootstrap.yml        # OIDC role and ECR
|   `-- aws-app.yml              # Lambda and API Gateway stack
|-- postman/                     # Importable Postman collection
|-- .github/workflows/ci.yml     # Quality gate and AWS deployment
|-- docker-compose.yml           # PostgreSQL, backend, and frontend
|-- ARCHITECTURE.md              # Concurrency and architecture decisions
`-- README.md
```

## Postman Collection

Import [`postman/Mini_ERP_CRM.postman_collection.json`](./postman/Mini_ERP_CRM.postman_collection.json). It includes:

- Automatic JWT capture after login.
- Automatic customer, product, and challan ID capture.
- Positive and negative business-flow requests.
- Role-denial and insufficient-stock checks.

For production testing, set the collection base URL to:

```text
https://3586xchi5e.execute-api.ap-south-1.amazonaws.com
```

## Known Scope Boundaries

- Confirmed challans cannot be cancelled or edited. A production return or credit-note flow would reverse stock through a separate auditable document.
- A product currently belongs to one warehouse location. Per-SKU balances across multiple warehouses are not modeled.
- Authentication uses a short-lived access JWT without a refresh-token rotation flow.
- S3 supports product images but not general purchase-order or customer document attachments.
- The frontend is currently concentrated in `App.tsx`; a larger team would split it into feature-level pages and components.

## Submission Checklist

- [x] GitHub repository
- [x] Live AWS frontend
- [x] Live AWS backend API
- [x] Managed PostgreSQL database on Supabase
- [x] Seeded Admin, Sales, Warehouse, and Accounts credentials
- [x] Customer CRM module
- [x] Product and inventory module
- [x] Sales challan workflow with safe stock deduction
- [x] Role-based access control
- [x] Global and module-level audit trails
- [x] Swagger/OpenAPI documentation
- [x] Postman collection
- [x] Architecture notes
- [x] Full-stack Docker setup
- [x] GitHub Actions CI/CD to AWS
- [x] Server-generated PDF export
- [x] Private AWS S3 product image upload

## License

This project is licensed under the MIT License.
