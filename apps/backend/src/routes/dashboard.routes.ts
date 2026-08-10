import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../auth.js";
import { asyncHandler } from "../http.js";

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

// GET /dashboard/stats — aggregate KPIs for the dashboard
dashboardRouter.get(
  "/stats",
  asyncHandler(async (_req, res) => {
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
      upcomingFollowUps
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: { status: "ACTIVE" } }),
      prisma.customer.count({ where: { status: "LEAD" } }),
      prisma.customer.count({ where: { status: "INACTIVE" } }),
      prisma.product.count(),
      prisma.salesChallan.count(),
      prisma.salesChallan.count({ where: { status: "DRAFT" } }),
      prisma.salesChallan.count({ where: { status: "CONFIRMED" } }),
      prisma.salesChallan.count({ where: { status: "CANCELLED" } }),
      prisma.salesChallan.aggregate({
        _sum: { totalAmount: true },
        where: { status: "CONFIRMED" }
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
        lowStock: lowStockList.length
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
