import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Opt-in only: TEST_DATABASE_URL must point to a dedicated database with migrations applied.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const runIntegration = process.env.RUN_INTEGRATION_TESTS === "true";

if (runIntegration && !testDatabaseUrl) throw new Error("TEST_DATABASE_URL is required when RUN_INTEGRATION_TESTS=true");
if (testDatabaseUrl) process.env.DATABASE_URL = testDatabaseUrl;
process.env.JWT_SECRET ??= "integration-test-secret";
process.env.FRONTEND_URL ??= "http://localhost:5173";

const { app } = await import("../../app.js");
const { prisma } = await import("../../db.js");

const suffix = `integration-${Date.now()}`;
const email = `${suffix}@stockflow.test`;
let userId = "";
let customerId = "";
let productId = "";

function authToken() {
  return jwt.sign({ id: userId, email, name: "Integration Admin", role: "ADMIN" }, process.env.JWT_SECRET!, { expiresIn: "5m" });
}

describe.runIf(runIntegration)("stock safety against real Postgres", () => {
  beforeAll(async () => {
    const user = await prisma.user.create({ data: { name: "Integration Admin", email, passwordHash: await bcrypt.hash("Integration@123", 10), role: "ADMIN" } });
    userId = user.id;
    const customer = await prisma.customer.create({
      data: { name: "Integration Customer", mobile: "9999999999", email: `customer-${email}`, businessName: "Integration Customer Co", type: "RETAIL", status: "ACTIVE", address: "Test location", createdById: userId }
    });
    customerId = customer.id;
    const product = await prisma.product.create({
      data: { name: "Integration Product", sku: `TEST-${Date.now()}`, category: "Testing", unitPrice: 100, currentStock: 5, minimumStock: 1, location: "Test warehouse" }
    });
    productId = product.id;
  });

  afterAll(async () => {
    if (userId) {
      await prisma.activityLog.deleteMany({ where: { createdById: userId } });
      await prisma.stockMovement.deleteMany({ where: { createdById: userId } });
      await prisma.followUpNote.deleteMany({ where: { createdById: userId } });
      await prisma.challanStatusHistory.deleteMany({ where: { changedById: userId } });
      await prisma.salesChallan.deleteMany({ where: { createdById: userId } });
      await prisma.customer.deleteMany({ where: { createdById: userId } });
      await prisma.product.deleteMany({ where: { id: productId } });
      await prisma.user.delete({ where: { id: userId } });
    }
    await prisma.$disconnect();
  });

  it("rejects confirmation when the requested quantity exceeds persisted stock", async () => {
    const create = await request(app).post("/challans").set("Authorization", `Bearer ${authToken()}`).send({ customerId, status: "DRAFT", items: [{ productId, quantity: 10 }] });
    expect(create.status).toBe(201);

    const confirm = await request(app).patch(`/challans/${create.body.id}/status`).set("Authorization", `Bearer ${authToken()}`).send({ status: "CONFIRMED" });
    expect(confirm.status).toBe(400);
    expect(confirm.body.message).toContain("Insufficient stock");

    const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    expect(product.currentStock).toBe(5);
  });
});
