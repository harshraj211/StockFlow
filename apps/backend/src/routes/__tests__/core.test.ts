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
    findFirst: vi.fn()
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
});
