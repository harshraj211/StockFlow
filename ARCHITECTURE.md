# StockFlow Architecture

StockFlow is a mini ERP + CRM portal for wholesale inventory, customer follow-ups, sales challans, and role-based operations. The system is split into a React frontend, an Express API, and PostgreSQL accessed through Prisma.

## Core Modules

- **CRM**: customers, priorities, statuses, follow-up notes, account history, and customer-wise challan context.
- **Inventory**: products, stock thresholds, stock movement ledger, low-stock filtering, and warehouse/location views.
- **Product Media**: private AWS S3 objects with presigned browser uploads and short-lived read access.
- **Sales Challans**: draft creation, confirmation, cancellation, status history, PDF generation, and challan-time item snapshots.
- **Admin**: JWT login, roles, user management, activity logging, and access boundaries.
- **Operations Dashboard**: KPIs, follow-up queue, low-stock alerts, recent challans, and audit visibility.

## AWS Deployment Topology

```mermaid
flowchart LR
  U["Reviewer browser"] --> G["AWS API Gateway"]
  G --> L["Lambda container: React + Express"]
  L --> P["Supabase PostgreSQL"]
  L --> S["Private AWS S3 product images"]
  GH["GitHub Actions"] -->|"OIDC temporary role"| E["Amazon ECR"]
  GH -->|"CloudFormation deploy"| G
  E --> L
```

The production container serves the compiled React application and Express API through one API Gateway origin. This avoids an always-on server while preserving the existing Vercel and Render deployment as a fallback. Infrastructure is declared in CloudFormation, and every `main` deployment is gated by tests, application builds, Docker builds, database migration, and a production smoke test.

GitHub does not store long-lived AWS access keys. Its workflow exchanges GitHub's OIDC identity for a short-lived, repository- and branch-scoped AWS role. Lambda uses its own execution role for private S3 access, including the temporary session token required when signing browser uploads.

## Challan Confirmation Flow

```mermaid
flowchart TD
  A["Create challan as DRAFT"] --> B["User confirms challan"]
  B --> C["Load challan + line items inside DB transaction"]
  C --> D{"For each product: atomic update if currentStock >= quantity"}
  D -->|All updates succeed| E["Create OUT stock movements"]
  E --> F["Set challan status to CONFIRMED"]
  F --> G["Write ChallanStatusHistory audit row"]
  G --> H["Return confirmed challan"]
  D -->|Any update affects 0 rows| I["Reject with insufficient-stock error"]
  I --> J["Transaction rolls back: no partial deduction"]
```

## Concurrency Decision

The first implementation checked product stock and then decremented it later in the same transaction. That is correct for a single user, but under concurrent confirmations two requests could both read the same available stock before either write completed.

The confirmation path now uses a conditional atomic update:

```ts
await tx.product.updateMany({
  where: { id: item.productId, currentStock: { gte: item.quantity } },
  data: { currentStock: { decrement: item.quantity } }
});
```

If the update affects `0` rows, the API rejects the confirmation with an insufficient-stock error. Because this happens inside the transaction, any earlier deductions from the same confirmation are rolled back.

## Challan Number Safety

Challan numbers are generated inside the create transaction and protected with retry handling for unique-key collisions. This keeps the human-readable format (`CH-2026-00001`) while avoiding a hard failure when two challans are created at nearly the same time.

## Private Product Image Flow

```mermaid
sequenceDiagram
  participant UI as React UI
  participant API as Express API
  participant S3 as Private S3 Bucket
  participant DB as PostgreSQL
  UI->>API: Request upload URL (name, type, size)
  API->>API: Validate role, MIME type, and 5 MB limit
  API-->>UI: Five-minute presigned PUT URL + object key
  UI->>S3: Upload image directly
  UI->>API: Complete upload with object key
  API->>S3: HEAD object and verify type/size
  API->>DB: Save imageKey on Product
  API-->>UI: Product with one-hour presigned read URL
```

The bucket remains private with Block Public Access enabled. AWS credentials exist only in the API environment, are scoped to the `products/*` prefix, and are never sent to the browser.

## API Maturity

- `GET /health` checks database reachability and required environment configuration.
- `GET /openapi.json` exposes the API contract.
- `GET /docs` serves interactive Swagger documentation.
- `/auth/login` has a stricter rate limit.
- all API routes have a lighter general request limiter.
