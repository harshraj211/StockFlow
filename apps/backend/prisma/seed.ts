import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Password@123", 10);
  const users = [
    { name: "Admin User", email: "admin@fundsroom.test", role: Role.ADMIN },
    { name: "Sales User", email: "sales@fundsroom.test", role: Role.SALES },
    { name: "Warehouse User", email: "warehouse@fundsroom.test", role: Role.WAREHOUSE },
    { name: "Accounts User", email: "accounts@fundsroom.test", role: Role.ACCOUNTS }
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: { ...user, passwordHash }
    });
  }

  const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@fundsroom.test" } });

  await prisma.customer.upsert({
    where: { id: "seed-customer-1" },
    update: {},
    create: {
      id: "seed-customer-1",
      name: "Rohan Traders",
      mobile: "9876543210",
      email: "billing@rohantraders.test",
      businessName: "Rohan Traders Pvt Ltd",
      gstNumber: "27ABCDE1234F1Z5",
      type: "WHOLESALE",
      address: "Andheri East, Mumbai",
      status: "ACTIVE",
      followUpDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      notes: "Prefers monthly purchase cycles.",
      createdById: admin.id
    }
  });

  await prisma.product.upsert({
    where: { sku: "SKU-LED-9W" },
    update: {},
    create: {
      name: "LED Bulb 9W",
      sku: "SKU-LED-9W",
      category: "Electrical",
      unitPrice: 120,
      currentStock: 250,
      minimumStock: 50,
      location: "Mumbai Warehouse A"
    }
  });

  await prisma.product.upsert({
    where: { sku: "SKU-WIRE-90M" },
    update: {},
    create: {
      name: "Copper Wire Roll 90m",
      sku: "SKU-WIRE-90M",
      category: "Electrical",
      unitPrice: 1450,
      currentStock: 38,
      minimumStock: 25,
      location: "Mumbai Warehouse B"
    }
  });

  console.log("Seed data created. Login password for all roles: Password@123");
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    process.exit(1);
  });
