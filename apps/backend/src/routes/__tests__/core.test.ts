import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.JWT_SECRET = "test-secret";
process.env.FRONTEND_URL = "http://localhost:5173";

const prismaMock = {
  user: {
    findUnique: vi.fn()
  },
  product: {
    findUnique: vi.fn()
  },
  salesChallan: {
    count: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn()
  },
  customer: {
    count: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn()
  },
  followUpNote: { create: vi.fn() },
  $queryRaw: vi.fn(),
  $transaction: vi.fn()
};

const s3Mock = vi.hoisted(() => ({
  assertProductImageKey: vi.fn(),
  createProductImageKey: vi.fn().mockReturnValue("products/product-1/test-image.webp"),
  createProductImageUploadUrl: vi.fn().mockResolvedValue("https://signed-upload.example.test"),
  deleteProductImage: vi.fn(),
  inspectProductImage: vi.fn(),
  MAX_PRODUCT_IMAGE_BYTES: 5 * 1024 * 1024,
  productImageStorageConfigured: vi.fn().mockReturnValue(false),
  productWithImageUrl: vi.fn(async (product) => ({ ...product, imageUrl: null }))
}));

vi.mock("../../db.js", () => ({ prisma: prismaMock }));
vi.mock("../../s3.js", () => s3Mock);

const { app } = await import("../../app.js");
const { handler } = await import("../../lambda.js");

function token(role = "ADMIN") {
  return jwt.sign(
    { id: "user-1", email: "admin@test.local", name: "Admin", role },
    process.env.JWT_SECRET!
  );
}

describe("core API behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows browser requests from the API's own origin", async () => {
    const origin = "http://stockflow.test";
    const res = await request(app).get("/health").set("Host", "stockflow.test").set("Origin", origin);

    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe(origin);
  });

  it("logs in with valid credentials", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      name: "Admin",
      email: "admin@test.local",
      role: "ADMIN",
      isActive: true,
      passwordHash: await bcrypt.hash("Password@123", 10)
    });

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "admin@test.local", password: "Password@123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.role).toBe("ADMIN");
  });

  it("prevents non-admin users from creating users", async () => {
    const res = await request(app)
      .post("/users")
      .set("Authorization", `Bearer ${token("SALES")}`)
      .send({ name: "New User", email: "new@test.local", password: "Password@123", role: "SALES" });

    expect(res.status).toBe(403);
  });

  it("prevents manual OUT movement from making stock negative", async () => {
    prismaMock.product.findUnique.mockResolvedValue({
      id: "product-1",
      name: "Cable",
      currentStock: 3
    });
    prismaMock.$transaction.mockImplementation(async (callback) =>
      callback({
        product: {
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          findUnique: vi.fn().mockResolvedValue({ currentStock: 3 })
        }
      })
    );

    const res = await request(app)
      .post("/products/product-1/movements")
      .set("Authorization", `Bearer ${token("WAREHOUSE")}`)
      .send({ type: "OUT", quantity: 5, reason: "Adjustment" });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Insufficient stock");
  });

  it("creates a private S3 upload URL for warehouse users", async () => {
    prismaMock.product.findUnique.mockResolvedValue({ id: "product-1", name: "Cable", imageKey: null });

    const res = await request(app)
      .post("/products/product-1/image/upload-url")
      .set("Authorization", `Bearer ${token("WAREHOUSE")}`)
      .send({ fileName: "cable.webp", contentType: "image/webp", size: 1024 });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      imageKey: "products/product-1/test-image.webp",
      uploadUrl: "https://signed-upload.example.test",
      expiresIn: 300
    });
    expect(s3Mock.createProductImageUploadUrl).toHaveBeenCalledWith(
      "products/product-1/test-image.webp",
      "image/webp"
    );
  });

  it("rejects oversized product images before creating an upload URL", async () => {
    const res = await request(app)
      .post("/products/product-1/image/upload-url")
      .set("Authorization", `Bearer ${token("WAREHOUSE")}`)
      .send({ fileName: "large.png", contentType: "image/png", size: 5 * 1024 * 1024 + 1 });

    expect(res.status).toBe(400);
    expect(s3Mock.createProductImageUploadUrl).not.toHaveBeenCalled();
  });

  it("prevents sales users from uploading product images", async () => {
    const res = await request(app)
      .post("/products/product-1/image/upload-url")
      .set("Authorization", `Bearer ${token("SALES")}`)
      .send({ fileName: "cable.png", contentType: "image/png", size: 1024 });

    expect(res.status).toBe(403);
  });

  it("creates a validated follow-up note for a customer", async () => {
    prismaMock.customer.findUnique.mockResolvedValue({ id: "customer-1" });
    prismaMock.followUpNote.create.mockResolvedValue({
      id: "note-1",
      customerId: "customer-1",
      note: "Called to confirm delivery window.",
      createdById: "user-1"
    });

    const res = await request(app)
      .post("/customers/customer-1/follow-ups")
      .set("Authorization", `Bearer ${token("SALES")}`)
      .send({ note: "Called to confirm delivery window." });

    expect(res.status).toBe(201);
    expect(prismaMock.followUpNote.create).toHaveBeenCalledWith({
      data: {
        customerId: "customer-1",
        note: "Called to confirm delivery window.",
        createdById: "user-1"
      }
    });
  });

  it("rejects markup in follow-up notes", async () => {
    const res = await request(app)
      .post("/customers/customer-1/follow-ups")
      .set("Authorization", `Bearer ${token("SALES")}`)
      .send({ note: "<img src=x onerror=alert(1)>" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Validation failed");
  });

  it("enforces strong passwords for new user accounts", async () => {
    const res = await request(app)
      .post("/users")
      .set("Authorization", `Bearer ${token("ADMIN")}`)
      .send({ name: "New User", email: "new@test.local", password: "password123", role: "SALES" });

    expect(res.status).toBe(400);
    expect(res.body.errors.some((error: { message: string }) => error.message.includes("uppercase"))).toBe(true);
  });

  it("confirming a challan reduces stock and writes stock movement", async () => {
    const productUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
    const movementCreate = vi.fn();
    const historyCreate = vi.fn();
    const challanUpdate = vi.fn().mockResolvedValue({ id: "challan-1", status: "CONFIRMED" });

    prismaMock.$transaction.mockImplementation(async (callback) =>
      callback({
        salesChallan: {
          findUnique: vi.fn().mockResolvedValue({
            id: "challan-1",
            challanNumber: "CH-2026-00001",
            status: "DRAFT",
            items: [{ productId: "product-1", productName: "Cable", quantity: 2 }]
          }),
          findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "challan-1", status: "CONFIRMED" }),
          update: challanUpdate
        },
        product: {
          findUnique: vi.fn().mockResolvedValue({ id: "product-1", name: "Cable", currentStock: 10 }),
          updateMany: productUpdateMany
        },
        stockMovement: {
          create: movementCreate
        },
        challanStatusHistory: {
          create: historyCreate
        }
      })
    );

    const res = await request(app)
      .patch("/challans/challan-1/status")
      .set("Authorization", `Bearer ${token("ACCOUNTS")}`)
      .send({ status: "CONFIRMED" });

    expect(res.status).toBe(200);
    expect(productUpdateMany).toHaveBeenCalledWith({
      where: { id: "product-1", currentStock: { gte: 2 } },
      data: { currentStock: { decrement: 2 } }
    });
    expect(movementCreate).toHaveBeenCalled();
    expect(historyCreate).toHaveBeenCalledWith({
      data: {
        challanId: "challan-1",
        fromStatus: "DRAFT",
        toStatus: "CONFIRMED",
        note: "Stock deducted successfully during confirmation",
        changedById: "user-1"
      }
    });
    expect(challanUpdate).toHaveBeenCalled();
  });

  it("returns PDFs as base64-encoded binary responses from Lambda", async () => {
    prismaMock.salesChallan.findUnique.mockResolvedValue({
      id: "challan-1",
      challanNumber: "CH-2026-00001",
      status: "CONFIRMED",
      totalQuantity: 2,
      totalAmount: 500,
      createdAt: new Date("2026-08-11T05:06:50.000Z"),
      confirmedAt: new Date("2026-08-11T05:07:00.000Z"),
      notes: "Deliver to Aaditya Vashisth",
      customer: {
        businessName: "Vashisth Electricals Pvt Ltd",
        name: "Aaditya Vashisth",
        mobile: "9876543210",
        address: "New Delhi"
      },
      items: [
        {
          productName: "PVC Conduit Pipe 25mm",
          sku: "SKU-PVC-25",
          category: "Conduit",
          location: "Delhi Warehouse",
          quantity: 2,
          unitPrice: 250
        }
      ],
      createdBy: { name: "Accounts User", role: "ACCOUNTS" }
    });

    const result = (await handler(
      {
        version: "2.0",
        routeKey: "$default",
        rawPath: "/challans/challan-1/pdf",
        rawQueryString: "",
        headers: {
          authorization: `Bearer ${token("ACCOUNTS")}`,
          host: "stockflow.test",
          "x-forwarded-proto": "https"
        },
        requestContext: {
          accountId: "test",
          apiId: "test",
          domainName: "stockflow.test",
          domainPrefix: "stockflow",
          http: {
            method: "GET",
            path: "/challans/challan-1/pdf",
            protocol: "HTTP/1.1",
            sourceIp: "127.0.0.1",
            userAgent: "vitest"
          },
          requestId: "request-1",
          routeKey: "$default",
          stage: "$default",
          time: "11/Aug/2026:05:07:00 +0000",
          timeEpoch: 1786424820000
        },
        isBase64Encoded: false
      },
      {
        callbackWaitsForEmptyEventLoop: false,
        functionName: "stockflow-test",
        functionVersion: "$LATEST",
        invokedFunctionArn: "arn:aws:lambda:ap-south-1:123456789012:function:stockflow-test",
        memoryLimitInMB: "1024",
        awsRequestId: "request-1",
        logGroupName: "test",
        logStreamName: "test",
        getRemainingTimeInMillis: () => 30000,
        done: () => undefined,
        fail: () => undefined,
        succeed: () => undefined
      },
      () => undefined
    )) as { statusCode: number; headers: Record<string, string>; body: string; isBase64Encoded: boolean };

    expect(result.statusCode).toBe(200);
    expect(result.headers["content-type"]).toContain("application/pdf");
    expect(result.isBase64Encoded).toBe(true);

    const pdf = Buffer.from(result.body, "base64");
    expect(pdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(pdf.subarray(-20).toString("ascii")).toContain("%%EOF");
    expect(pdf.length).toBeGreaterThan(1000);
  });
});
