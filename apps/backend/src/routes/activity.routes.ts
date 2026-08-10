import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../auth.js";
import { asyncHandler } from "../http.js";
import { paginationQuery } from "../validators.js";

export const activityRouter = Router();
activityRouter.use(requireAuth);

activityRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = paginationQuery.parse(req.query);
    const where = query.search
      ? {
          OR: [
            { action: { contains: query.search, mode: "insensitive" as const } },
            { title: { contains: query.search, mode: "insensitive" as const } },
            { details: { contains: query.search, mode: "insensitive" as const } }
          ]
        }
      : {};
    const [items, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: { createdBy: { select: { name: true, role: true } } },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      prisma.activityLog.count({ where })
    ]);
    return res.json({ items, page: query.page, limit: query.limit, total });
  })
);
