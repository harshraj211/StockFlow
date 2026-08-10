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
  const warehouse = await prisma.user.findUniqueOrThrow({ where: { email: "warehouse@fundsroom.test" } });
  const accounts = await prisma.user.findUniqueOrThrow({ where: { email: "accounts@fundsroom.test" } });
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
      priority: "HOT" as const,
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
      priority: "WARM" as const,
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
      priority: "HOT" as const,
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
      priority: "WARM" as const,
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
      priority: "COLD" as const,
      address: "Navrangpura, Ahmedabad, Gujarat - 380009",
      status: "INACTIVE" as const,
      followUpDate: null,
      notes: "Paused orders due to warehouse relocation."
    },
    {
      id: "seed-customer-6",
      name: "Sameer Khan",
      mobile: "9898987654",
      email: "sameer@khanelectrical.test",
      businessName: "Khan Electrical Depot",
      gstNumber: "27EFGHI5678J5D9",
      type: "WHOLESALE" as const,
      priority: "HOT" as const,
      address: "Bhiwandi, Maharashtra - 421302",
      status: "LEAD" as const,
      followUpDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      notes: "Comparing rates with two suppliers. Needs fast quote."
    },
    {
      id: "seed-customer-7",
      name: "Meera Iyer",
      mobile: "9845012345",
      email: "meera@iyerprojects.test",
      businessName: "Iyer Project Supplies",
      gstNumber: "29FGHIJ6789K6E1",
      type: "DISTRIBUTOR" as const,
      priority: "WARM" as const,
      address: "Peenya, Bengaluru, Karnataka - 560058",
      status: "ACTIVE" as const,
      followUpDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
      notes: "Project-based buyer. Often needs mixed SKU challans."
    },
    {
      id: "seed-customer-8",
      name: "Harish Patel",
      mobile: "9723456789",
      email: "orders@patelmart.test",
      businessName: "Patel Electrical Mart",
      gstNumber: "24GHIJK7890L7F2",
      type: "RETAIL" as const,
      priority: "COLD" as const,
      address: "Maninagar, Ahmedabad, Gujarat - 380008",
      status: "ACTIVE" as const,
      followUpDate: null,
      notes: "Small recurring orders. Prefers phone confirmation."
    },
    {
      id: "seed-customer-9",
      name: "Farah Siddiqui",
      mobile: "9810012345",
      email: "farah@metroinfra.test",
      businessName: "Metro Infra Electricals",
      gstNumber: "07HIJKL8901M8G3",
      type: "WHOLESALE" as const,
      priority: "HOT" as const,
      address: "Okhla Industrial Area, New Delhi - 110020",
      status: "LEAD" as const,
      followUpDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      notes: "Overdue follow-up. Asked for switchgear availability."
    },
    {
      id: "seed-customer-10",
      name: "Amit Verma",
      mobile: "9930011223",
      email: "amit@vermaagencies.test",
      businessName: "Verma Agencies",
      gstNumber: "09IJKLM9012N9H4",
      type: "DISTRIBUTOR" as const,
      priority: "WARM" as const,
      address: "Hazratganj, Lucknow, Uttar Pradesh - 226001",
      status: "ACTIVE" as const,
      followUpDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      notes: "Asked for credit-period extension before next order."
    }
  ];

  for (const c of customerSeed) {
    const { id, ...customerData } = c;
    await prisma.customer.upsert({
      where: { id },
      update: customerData,
      create: { id, ...customerData, createdById: admin.id }
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
    },
    {
      sku: "SKU-DB-8WAY",
      name: "Distribution Board 8-Way",
      category: "Switchgear",
      unitPrice: 4850,
      currentStock: 8,
      minimumStock: 12,
      location: "Mumbai Warehouse B"
    },
    {
      sku: "SKU-CABLE-2C-100M",
      name: "Flexible Cable 2 Core 100m",
      category: "Wiring",
      unitPrice: 2650,
      currentStock: 0,
      minimumStock: 15,
      location: "Delhi Transit Stock"
    },
    {
      sku: "SKU-SWITCH-16A",
      name: "16A Modular Switch",
      category: "Accessories",
      unitPrice: 180,
      currentStock: 220,
      minimumStock: 60,
      location: "Mumbai Warehouse A"
    },
    {
      sku: "SKU-ELCB-40A",
      name: "ELCB 40A Double Pole",
      category: "Switchgear",
      unitPrice: 1750,
      currentStock: 22,
      minimumStock: 20,
      location: "Bengaluru Warehouse"
    },
    {
      sku: "SKU-BATTEN-LED",
      name: "LED Batten 20W",
      category: "Lighting",
      unitPrice: 360,
      currentStock: 64,
      minimumStock: 40,
      location: "Delhi Transit Stock"
    },
    {
      sku: "SKU-REG-FAN",
      name: "Fan Regulator 5-Step",
      category: "Fans",
      unitPrice: 240,
      currentStock: 11,
      minimumStock: 25,
      location: "Mumbai Warehouse A"
    },
    {
      sku: "SKU-CONDUIT-25MM",
      name: "PVC Conduit Pipe 25mm",
      category: "Wiring",
      unitPrice: 95,
      currentStock: 310,
      minimumStock: 100,
      location: "Bengaluru Warehouse"
    }
  ];

  const createdProducts: Record<string, string> = {};
  for (const p of productSeed) {
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: p,
      create: p
    });
    createdProducts[p.sku] = product.id;
  }
  console.log("Products seeded");

  const movementSeed = [
    {
      id: "seed-movement-1",
      sku: "SKU-TUBE-LED-4FT",
      quantity: 25,
      type: "IN" as const,
      reason: "Opening stock correction"
    },
    {
      id: "seed-movement-2",
      sku: "SKU-SOCKET-6A",
      quantity: 12,
      type: "OUT" as const,
      reason: "Manual warehouse issue"
    },
    {
      id: "seed-movement-3",
      sku: "SKU-CABLE-2C-100M",
      quantity: 15,
      type: "OUT" as const,
      reason: "Emergency project dispatch"
    },
    {
      id: "seed-movement-4",
      sku: "SKU-REG-FAN",
      quantity: 18,
      type: "OUT" as const,
      reason: "Retail replacement batch"
    }
  ];

  for (const movement of movementSeed) {
    await prisma.stockMovement.upsert({
      where: { id: movement.id },
      update: {
        quantity: movement.quantity,
        type: movement.type,
        reason: movement.reason,
        createdById: warehouse.id
      },
      create: {
        id: movement.id,
        productId: createdProducts[movement.sku],
        quantity: movement.quantity,
        type: movement.type,
        reason: movement.reason,
        createdById: warehouse.id
      }
    });
  }
  console.log("Stock movements seeded");

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
  await prisma.followUpNote.upsert({
    where: { id: "seed-note-3" },
    update: {},
    create: {
      id: "seed-note-3",
      customerId: "seed-customer-6",
      note: "Sent best-price quote for LED battens and switches.",
      createdById: sales.id
    }
  });
  await prisma.followUpNote.upsert({
    where: { id: "seed-note-4" },
    update: {},
    create: {
      id: "seed-note-4",
      customerId: "seed-customer-9",
      note: "Missed call. Needs urgent callback for switchgear stock.",
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

  const challan1 = await prisma.salesChallan.upsert({
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

  const challan2 = await prisma.salesChallan.upsert({
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

  const historySeed = [
    {
      id: "seed-history-1",
      challanId: challan1.id,
      fromStatus: null,
      toStatus: "DRAFT" as const,
      note: "Draft challan created",
      changedById: sales.id
    },
    {
      id: "seed-history-2",
      challanId: challan1.id,
      fromStatus: "DRAFT" as const,
      toStatus: "CONFIRMED" as const,
      note: "Stock deducted successfully during confirmation",
      changedById: accounts.id
    },
    {
      id: "seed-history-3",
      challanId: challan2.id,
      fromStatus: null,
      toStatus: "DRAFT" as const,
      note: "Draft challan created and waiting for confirmation",
      changedById: sales.id
    }
  ];

  for (const history of historySeed) {
    const { id, ...historyData } = history;
    await prisma.challanStatusHistory.upsert({
      where: { id },
      update: historyData,
      create: { id, ...historyData }
    });
  }
  console.log("Challan status history seeded");

  const activitySeed = [
    {
      id: "seed-activity-1",
      action: "CUSTOMER_CREATED",
      entityType: "CUSTOMER" as const,
      entityId: "seed-customer-6",
      title: "Khan Electrical Depot added as hot lead",
      details: "Needs fast quote for lighting and accessories.",
      createdById: sales.id
    },
    {
      id: "seed-activity-2",
      action: "STOCK_MOVEMENT_RECORDED",
      entityType: "PRODUCT" as const,
      entityId: createdProducts["SKU-CABLE-2C-100M"],
      title: "Emergency stock movement recorded",
      details: "Flexible Cable 2 Core 100m moved out for project dispatch.",
      createdById: warehouse.id
    },
    {
      id: "seed-activity-3",
      action: "CHALLAN_CREATED",
      entityType: "CHALLAN" as const,
      entityId: null,
      title: "CH-2026-00002 draft challan created",
      details: "Sharma Distributors, 5 units pending confirmation.",
      createdById: sales.id
    },
    {
      id: "seed-activity-4",
      action: "USER_REVIEWED",
      entityType: "USER" as const,
      entityId: accounts.id,
      title: "Accounts role available for challan review",
      details: "Accounts can confirm or cancel draft challans for billing workflow.",
      createdById: admin.id
    },
    {
      id: "seed-activity-5",
      action: "FOLLOW_UP_ADDED",
      entityType: "CUSTOMER" as const,
      entityId: "seed-customer-9",
      title: "Metro Infra follow-up marked urgent",
      details: "Overdue callback for switchgear availability.",
      createdById: sales.id
    }
  ];

  for (const activity of activitySeed) {
    const { id, ...activityData } = activity;
    await prisma.activityLog.upsert({
      where: { id },
      update: activityData,
      create: { id, ...activityData }
    });
  }
  console.log("Activity logs seeded");

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
