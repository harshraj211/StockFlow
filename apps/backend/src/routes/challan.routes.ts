import { Router } from "express";
import { ChallanStatus, MovementType, Role } from "@prisma/client";
import { prisma } from "../db.js";
import { requireAuth, requireRoles } from "../auth.js";
import { asyncHandler, HttpError, routeParam } from "../http.js";
import { challanSchema, challanStatusSchema, paginationQuery } from "../validators.js";

export const challanRouter = Router();
challanRouter.use(requireAuth);

async function nextChallanNumber() {
  const count = await prisma.salesChallan.count();
  return `CH-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;
}

async function confirmChallan(challanId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const challan = await tx.salesChallan.findUnique({
      where: { id: challanId },
      include: { items: true }
    });
    if (!challan) throw new HttpError(404, "Challan not found");
    if (challan.status === ChallanStatus.CONFIRMED) return challan;
    if (challan.status === ChallanStatus.CANCELLED) throw new HttpError(400, "Cancelled challan cannot be confirmed");

    for (const item of challan.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new HttpError(404, `Product ${item.productName} not found`);
      if (product.currentStock < item.quantity) {
        throw new HttpError(400, `Insufficient stock for ${product.name}. Available: ${product.currentStock}`);
      }
    }

    for (const item of challan.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { currentStock: { decrement: item.quantity } }
      });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          quantity: item.quantity,
          type: MovementType.OUT,
          reason: `Sales challan ${challan.challanNumber}`,
          createdById: userId
        }
      });
    }

    return tx.salesChallan.update({
      where: { id: challanId },
      data: { status: ChallanStatus.CONFIRMED },
      include: { customer: true, items: true, createdBy: { select: { name: true, role: true } } }
    });
  });
}

challanRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = paginationQuery.parse(req.query);
    const where = query.search
      ? {
          OR: [
            { challanNumber: { contains: query.search, mode: "insensitive" as const } },
            { customer: { name: { contains: query.search, mode: "insensitive" as const } } },
            { customer: { businessName: { contains: query.search, mode: "insensitive" as const } } }
          ]
        }
      : {};
    const [items, total] = await Promise.all([
      prisma.salesChallan.findMany({
        where,
        include: { customer: true, items: true, createdBy: { select: { name: true, role: true } } },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      prisma.salesChallan.count({ where })
    ]);
    return res.json({ items, page: query.page, limit: query.limit, total });
  })
);

challanRouter.post(
  "/",
  requireRoles(Role.ADMIN, Role.SALES),
  asyncHandler(async (req, res) => {
    const body = challanSchema.parse(req.body);
    const customer = await prisma.customer.findUnique({ where: { id: body.customerId } });
    if (!customer) throw new HttpError(404, "Customer not found");

    const productIds = body.items.map((item) => item.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
    if (products.length !== productIds.length) throw new HttpError(400, "One or more products are invalid");

    const productMap = new Map(products.map((product) => [product.id, product]));
    const totalQuantity = body.items.reduce((sum, item) => sum + item.quantity, 0);

    for (const item of body.items) {
      const product = productMap.get(item.productId)!;
      if (body.status === "CONFIRMED" && product.currentStock < item.quantity) {
        throw new HttpError(400, `Insufficient stock for ${product.name}. Available: ${product.currentStock}`);
      }
    }

    const challan = await prisma.salesChallan.create({
      data: {
        challanNumber: await nextChallanNumber(),
        customerId: body.customerId,
        totalQuantity,
        status: ChallanStatus.DRAFT,
        createdById: req.user!.id,
        items: {
          create: body.items.map((item) => {
            const product = productMap.get(item.productId)!;
            return {
              productId: product.id,
              productName: product.name,
              sku: product.sku,
              category: product.category,
              unitPrice: product.unitPrice,
              location: product.location,
              quantity: item.quantity
            };
          })
        }
      },
      include: { customer: true, items: true }
    });

    if (body.status === "CONFIRMED") {
      const confirmed = await confirmChallan(challan.id, req.user!.id);
      return res.status(201).json(confirmed);
    }

    return res.status(201).json(challan);
  })
);

challanRouter.patch(
  "/:id/status",
  requireRoles(Role.ADMIN, Role.SALES, Role.ACCOUNTS),
  asyncHandler(async (req, res) => {
    const id = routeParam(req.params.id, "id");
    const body = challanStatusSchema.parse(req.body);
    if (body.status === "CONFIRMED") {
      const confirmed = await confirmChallan(id, req.user!.id);
      return res.json(confirmed);
    }
    const updated = await prisma.salesChallan.update({
      where: { id },
      data: { status: ChallanStatus.CANCELLED },
      include: { customer: true, items: true }
    });
    return res.json(updated);
  })
);
