import swaggerJSDoc from "swagger-jsdoc";

export const openApiSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "StockFlow Mini ERP + CRM API",
      version: "1.0.0",
      description:
        "JWT-secured APIs for CRM, inventory, sales challans, dashboard KPIs, activity logs, and admin users."
    },
    servers: [{ url: "http://localhost:4000", description: "Local API" }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" }
      },
      schemas: {
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", example: "admin@fundsroom.test" },
            password: { type: "string", example: "Password@123" }
          }
        },
        Customer: {
          type: "object",
          properties: {
            id: { type: "string" },
            businessName: { type: "string" },
            name: { type: "string" },
            mobile: { type: "string" },
            email: { type: "string" },
            type: { type: "string", enum: ["RETAIL", "WHOLESALE", "DISTRIBUTOR"] },
            priority: { type: "string", enum: ["HOT", "WARM", "COLD"] },
            status: { type: "string", enum: ["LEAD", "ACTIVE", "INACTIVE"] }
          }
        },
        Product: {
          type: "object",
          properties: {
            id: { type: "string" },
            sku: { type: "string" },
            name: { type: "string" },
            category: { type: "string" },
            location: { type: "string" },
            unitPrice: { type: "number" },
            currentStock: { type: "integer" },
            minimumStock: { type: "integer" }
          }
        },
        Challan: {
          type: "object",
          properties: {
            id: { type: "string" },
            challanNumber: { type: "string", example: "CH-2026-00001" },
            status: { type: "string", enum: ["DRAFT", "CONFIRMED", "CANCELLED"] },
            totalQuantity: { type: "integer" },
            totalAmount: { type: "number" }
          }
        },
        Error: {
          type: "object",
          properties: {
            message: { type: "string" }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }],
    paths: {
      "/health": {
        get: {
          security: [],
          summary: "Readiness check",
          responses: {
            "200": { description: "API and database are healthy" },
            "503": { description: "Database is unreachable" }
          }
        }
      },
      "/auth/login": {
        post: {
          security: [],
          summary: "Login and receive a JWT",
          requestBody: {
            required: true,
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } }
            }
          },
          responses: {
            "200": { description: "Authenticated" },
            "401": { description: "Invalid email or password" }
          }
        }
      },
      "/customers": {
        get: {
          summary: "List customers",
          parameters: [
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
            { name: "search", in: "query", schema: { type: "string" } },
            { name: "status", in: "query", schema: { type: "string", enum: ["LEAD", "ACTIVE", "INACTIVE"] } },
            { name: "priority", in: "query", schema: { type: "string", enum: ["HOT", "WARM", "COLD"] } },
            { name: "type", in: "query", schema: { type: "string", enum: ["RETAIL", "WHOLESALE", "DISTRIBUTOR"] } }
          ],
          responses: { "200": { description: "Paginated customers" } }
        },
        post: {
          summary: "Create customer",
          responses: { "201": { description: "Customer created" }, "403": { description: "Role not allowed" } }
        }
      },
      "/products": {
        get: {
          summary: "List products",
          parameters: [
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
            { name: "search", in: "query", schema: { type: "string" } },
            { name: "category", in: "query", schema: { type: "string" } },
            { name: "location", in: "query", schema: { type: "string" } },
            { name: "stockState", in: "query", schema: { type: "string", enum: ["HEALTHY", "LOW", "OUT"] } }
          ],
          responses: { "200": { description: "Paginated products" } }
        },
        post: {
          summary: "Create product",
          responses: { "201": { description: "Product created" }, "403": { description: "Role not allowed" } }
        }
      },
      "/challans": {
        get: {
          summary: "List sales challans",
          parameters: [
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
            { name: "search", in: "query", schema: { type: "string" } },
            { name: "status", in: "query", schema: { type: "string", enum: ["DRAFT", "CONFIRMED", "CANCELLED"] } }
          ],
          responses: { "200": { description: "Paginated challans" } }
        },
        post: {
          summary: "Create draft or confirmed challan",
          responses: {
            "201": { description: "Challan created" },
            "400": { description: "Validation or insufficient stock error" }
          }
        }
      },
      "/challans/{id}/status": {
        patch: {
          summary: "Confirm or cancel a challan",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": { description: "Status updated" },
            "400": { description: "Invalid transition or insufficient stock" }
          }
        }
      },
      "/dashboard/stats": {
        get: {
          summary: "Dashboard KPIs",
          parameters: [{ name: "period", in: "query", schema: { type: "string", enum: ["today", "week", "month"] } }],
          responses: { "200": { description: "Dashboard summary metrics" } }
        }
      },
      "/activity": {
        get: {
          summary: "Global activity log",
          parameters: [{ name: "entityType", in: "query", schema: { type: "string", enum: ["CUSTOMER", "PRODUCT", "CHALLAN", "USER", "SYSTEM"] } }],
          responses: { "200": { description: "Paginated audit events" } }
        }
      },
      "/users": {
        get: { summary: "List users", responses: { "200": { description: "Paginated users" } } },
        post: { summary: "Create user", responses: { "201": { description: "User created" }, "403": { description: "Admin only" } } }
      }
    }
  },
  apis: []
});
