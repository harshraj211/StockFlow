import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../auth.js";
import { asyncHandler } from "../http.js";

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

function periodStart(period: unknown) {
  const now = new Date();
  const start = new Date(now);
  if (period === "today") {
    start.setHours(0, 0, 0, 0);
    return start;
  }
  if (period === "week") {
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return start;
}

// GET /dashboard/stats  aggregate KPIs for the dashboard
dashboardRouter.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const startDate = periodStart(req.query.period);
    const challanPeriodWhere = { createdAt: { gte: startDate } };
    const confirmedPeriodWhere = { status: "CONFIRMED" as const, confirmedAt: { gte: startDate } };
    const [
      totalCustomers,
      activeCustomers,
      leadCustomers,
      inactiveCustomers,
      totalProducts,
      totalChallans,
      draftChallans,
      confirmedChallans,
      cancelledChallans,
      revenueResult,
      recentChallans,
      lowStockList,
      stockHealth,
      upcomingFollowUps
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: { status: "ACTIVE" } }),
      prisma.customer.count({ where: { status: "LEAD" } }),
      prisma.customer.count({ where: { status: "INACTIVE" } }),
      prisma.product.count(),
      prisma.salesChallan.count({ where: challanPeriodWhere }),
      prisma.salesChallan.count({ where: { ...challanPeriodWhere, status: "DRAFT" } }),
      prisma.salesChallan.count({ where: { ...challanPeriodWhere, status: "CONFIRMED" } }),
      prisma.salesChallan.count({ where: { ...challanPeriodWhere, status: "CANCELLED" } }),
      prisma.salesChallan.aggregate({
        _sum: { totalAmount: true },
        where: confirmedPeriodWhere
      }),
      prisma.salesChallan.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { name: true, businessName: true } },
          createdBy: { select: { name: true, role: true } },
          items: { select: { productName: true, quantity: true, unitPrice: true } }
        }
      }),
      // Products where currentStock <= minimumStock using raw query for correctness
      prisma.$queryRaw<
        Array<{
          id: string;
          name: string;
          sku: string;
          currentStock: number;
          minimumStock: number;
          location: string;
        }>
      >`
        SELECT id, name, sku, "currentStock", "minimumStock", location
        FROM "Product"
        WHERE "currentStock" <= "minimumStock"
        ORDER BY "currentStock" ASC
        LIMIT 10
      `,
      prisma.$queryRaw<Array<{ healthy: bigint; low: bigint; out: bigint }>>`
        SELECT
          COUNT(*) FILTER (WHERE "currentStock" > "minimumStock") AS healthy,
          COUNT(*) FILTER (WHERE "currentStock" <= "minimumStock" AND "currentStock" > 0) AS low,
          COUNT(*) FILTER (WHERE "currentStock" = 0) AS out
        FROM "Product"
      `,
      prisma.customer.findMany({
        where: {
          followUpDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        },
        orderBy: { followUpDate: "asc" },
        take: 5,
        select: {
          id: true,
          name: true,
          businessName: true,
          followUpDate: true,
          status: true,
          priority: true,
          mobile: true
        }
      })
    ]);

    return res.json({
      customers: {
        total: totalCustomers,
        active: activeCustomers,
        leads: leadCustomers,
        inactive: inactiveCustomers
      },
      products: {
        total: totalProducts,
        healthyStock: Number(stockHealth[0]?.healthy ?? 0),
        lowStock: Number(stockHealth[0]?.low ?? 0),
        outOfStock: Number(stockHealth[0]?.out ?? 0)
      },
      challans: {
        total: totalChallans,
        draft: draftChallans,
        confirmed: confirmedChallans,
        cancelled: cancelledChallans
      },
      revenue: {
        confirmedTotal: revenueResult._sum.totalAmount ?? 0
      },
      recentChallans,
      lowStockList,
      upcomingFollowUps
    });
  })
);
