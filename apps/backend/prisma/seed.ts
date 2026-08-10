import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");
  const passwordHash = await bcrypt.hash("Password@123", 10);

  // Users
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
  const sales = await prisma.user.findUniqueOrThrow({ where: { email: "sales@fundsroom.test" } });
  console.log("Users seeded");

  // Customers
  const customerSeed = [
    {
      id: "seed-customer-1",
      name: "Rohan Mehta",
      mobile: "9876543210",
      email: "billing@rohantraders.test",
      businessName: "Rohan Traders Pvt Ltd",
      gstNumber: "27ABCDE1234F1Z5",
      type: "WHOLESALE" as const,
      address: "Andheri East, Mumbai, Maharashtra - 400069",
      status: "ACTIVE" as const,
      followUpDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      notes: "Prefers monthly purchase cycles. Pays via NEFT."
    },
    {
      id: "seed-customer-2",
      name: "Priya Sharma",
      mobile: "9823456780",
      email: "priya@sharmadistrib.test",
      businessName: "Sharma Distributors",
      gstNumber: "29BCDEF2345G2A6",
      type: "DISTRIBUTOR" as const,
      address: "Whitefield, Bengaluru, Karnataka - 560066",
      status: "ACTIVE" as const,
      followUpDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      notes: "Interested in bulk pricing for Q3. Send updated rate card."
    },
    {
      id: "seed-customer-3",
      name: "Anita Shah",
      mobile: "9876501234",
      email: "anita@shahretail.test",
      businessName: "Shah Retail Stores",
      gstNumber: null,
      type: "RETAIL" as const,
      address: "Karol Bagh, New Delhi - 110005",
      status: "LEAD" as const,
      followUpDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      notes: "Visited showroom last week. Needs demo before ordering."
    },
    {
      id: "seed-customer-4",
      name: "Vikram Nair",
      mobile: "9911223344",
      email: "vikram@nairelec.test",
      businessName: "Nair Electricals",
      gstNumber: "32CDEFG3456H3B7",
      type: "WHOLESALE" as const,
      address: "MG Road, Kochi, Kerala - 682016",
      status: "ACTIVE" as const,
      followUpDate: null,
      notes: "Regular buyer. Credit limit: 5,00,000."
    },
    {
      id: "seed-customer-5",
      name: "Deepa Joshi",
      mobile: "9700112233",
      email: "deepa@joshisupply.test",
      businessName: "Joshi Supply Chain",
      gstNumber: "24DEFGH4567I4C8",
      type: "DISTRIBUTOR" as const,
      address: "Navrangpura, Ahmedabad, Gujarat - 380009",
      status: "INACTIVE" as const,
      followUpDate: null,
      notes: "Paused orders due to warehouse relocation."
    }
  ];

  for (const c of customerSeed) {
    await prisma.customer.upsert({
      where: { id: c.id },
      update: {},
      create: { ...c, createdById: admin.id }
    });
  }
  console.log("Customers seeded");

  // Products
  const productSeed = [
    {
      sku: "SKU-LED-9W",
      name: "LED Bulb 9W",
      category: "Lighting",
      unitPrice: 120,
      currentStock: 250,
      minimumStock: 50,
      location: "Mumbai Warehouse A"
    },
    {
      sku: "SKU-WIRE-90M",
      name: "Copper Wire Roll 90m",
      category: "Wiring",
      unitPrice: 1450,
      currentStock: 38,
      minimumStock: 25,
      location: "Mumbai Warehouse B"
    },
    {
      sku: "SKU-MCB-32A",
      name: "MCB 32A Single Pole",
      category: "Switchgear",
      unitPrice: 385,
      currentStock: 120,
      minimumStock: 30,
      location: "Mumbai Warehouse A"
    },
    {
      sku: "SKU-FAN-1200",
      name: "Ceiling Fan 1200mm",
      category: "Fans",
      unitPrice: 2200,
      currentStock: 40,
      minimumStock: 10,
      location: "Bengaluru Warehouse"
    },
    {
      sku: "SKU-SOCKET-6A",
      name: "6A 3-Pin Socket",
      category: "Accessories",
      unitPrice: 95,
      currentStock: 18,
      minimumStock: 20,
      location: "Mumbai Warehouse A"
    },
    {
      sku: "SKU-PANEL-4W",
      name: "Distribution Panel 4-Way",
      category: "Switchgear",
      unitPrice: 3200,
      currentStock: 15,
      minimumStock: 5,
      location: "Mumbai Warehouse B"
    },
    {
      sku: "SKU-TUBE-LED-4FT",
      name: "LED Tube Light 4ft 18W",
      category: "Lighting",
      unitPrice: 280,
      currentStock: 5,
      minimumStock: 30,
      location: "Bengaluru Warehouse"
    }
  ];

  const createdProducts: Record<string, string> = {};
  for (const p of productSeed) {
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: p
    });
    createdProducts[p.sku] = product.id;
  }
  console.log("Products seeded");

  // Follow-up Notes
  await prisma.followUpNote.upsert({
    where: { id: "seed-note-1" },
    update: {},
    create: {
      id: "seed-note-1",
      customerId: "seed-customer-1",
      note: "Called and confirmed Q3 order. Awaiting PO.",
      createdById: sales.id
    }
  });
  await prisma.followUpNote.upsert({
    where: { id: "seed-note-2" },
    update: {},
    create: {
      id: "seed-note-2",
      customerId: "seed-customer-2",
      note: "Shared updated rate card via email. Follow up in 2 days.",
      createdById: sales.id
    }
  });
  console.log("Follow-up notes seeded");

  // Challans
  const ch1Items = [
    { sku: "SKU-LED-9W", qty: 50 },
    { sku: "SKU-MCB-32A", qty: 10 }
  ];
  const ch1Amount = ch1Items.reduce((sum, i) => {
    const p = productSeed.find((p) => p.sku === i.sku)!;
    return sum + p.unitPrice * i.qty;
  }, 0);

  await prisma.salesChallan.upsert({
    where: { challanNumber: "CH-2026-00001" },
    update: {},
    create: {
      challanNumber: "CH-2026-00001",
      customerId: "seed-customer-1",
      totalQuantity: ch1Items.reduce((s, i) => s + i.qty, 0),
      totalAmount: ch1Amount,
      status: "CONFIRMED",
      confirmedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      notes: "Urgent delivery required.",
      createdById: sales.id,
      items: {
        create: ch1Items.map((i) => {
          const p = productSeed.find((p) => p.sku === i.sku)!;
          return {
            productId: createdProducts[i.sku],
            productName: p.name,
            sku: p.sku,
            category: p.category,
            unitPrice: p.unitPrice,
            location: p.location,
            quantity: i.qty
          };
        })
      }
    }
  });

  const ch2Items = [{ sku: "SKU-FAN-1200", qty: 5 }];
  const ch2Amount = ch2Items.reduce((sum, i) => {
    const p = productSeed.find((p) => p.sku === i.sku)!;
    return sum + p.unitPrice * i.qty;
  }, 0);

  await prisma.salesChallan.upsert({
    where: { challanNumber: "CH-2026-00002" },
    update: {},
    create: {
      challanNumber: "CH-2026-00002",
      customerId: "seed-customer-2",
      totalQuantity: 5,
      totalAmount: ch2Amount,
      status: "DRAFT",
      notes: null,
      createdById: sales.id,
      items: {
        create: ch2Items.map((i) => {
          const p = productSeed.find((p) => p.sku === i.sku)!;
          return {
            productId: createdProducts[i.sku],
            productName: p.name,
            sku: p.sku,
            category: p.category,
            unitPrice: p.unitPrice,
            location: p.location,
            quantity: i.qty
          };
        })
      }
    }
  });
  console.log("Challans seeded");

  console.log("\nSeed complete. Login password for all roles: Password@123");
  console.log("   admin@fundsroom.test | sales@fundsroom.test | warehouse@fundsroom.test | accounts@fundsroom.test");
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
