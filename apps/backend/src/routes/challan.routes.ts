import { Router } from "express";
import { ChallanStatus, MovementType, Role } from "@prisma/client";
import { prisma } from "../db.js";
import { requireAuth, requireRoles } from "../auth.js";
import { asyncHandler, HttpError, routeParam } from "../http.js";
import { challanSchema, challanStatusSchema, paginationQuery, updateChallanNotesSchema } from "../validators.js";

export const challanRouter = Router();
challanRouter.use(requireAuth);

/** Generates the next sequential challan number: CH-2026-00001 */
async function nextChallanNumber() {
  const count = await prisma.salesChallan.count();
  return `CH-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;
}

/** Core transaction: deducts stock and marks challan CONFIRMED */
async function confirmChallan(challanId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const challan = await tx.salesChallan.findUnique({
      where: { id: challanId },
      include: { items: true }
    });
    if (!challan) throw new HttpError(404, "Challan not found");
    if (challan.status === ChallanStatus.CONFIRMED) return challan;
    if (challan.status === ChallanStatus.CANCELLED)
      throw new HttpError(400, "A cancelled challan cannot be confirmed");

    // Check stock for all items atomically before touching anything
    for (const item of challan.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new HttpError(404, `Product "${item.productName}" no longer exists`);
      if (product.currentStock < item.quantity)
        throw new HttpError(
          400,
          `Insufficient stock for "${product.name}". Available: ${product.currentStock}, required: ${item.quantity}`
        );
    }

    // Deduct stock and log movements
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
      data: { status: ChallanStatus.CONFIRMED, confirmedAt: new Date() },
      include: {
        customer: true,
        items: true,
        createdBy: { select: { name: true, role: true } }
      }
    });
  });
}

// GET /challans — paginated list with search
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
        include: {
          customer: { select: { id: true, name: true, businessName: true, mobile: true } },
          items: true,
          createdBy: { select: { name: true, role: true } }
        },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      prisma.salesChallan.count({ where })
    ]);
    return res.json({ items, page: query.page, limit: query.limit, total });
  })
);

// POST /challans — create challan (ADMIN, SALES)
challanRouter.post(
  "/",
  requireRoles(Role.ADMIN, Role.SALES),
  asyncHandler(async (req, res) => {
    const body = challanSchema.parse(req.body);
    const customer = await prisma.customer.findUnique({ where: { id: body.customerId } });
    if (!customer) throw new HttpError(404, "Customer not found");

    const productIds = body.items.map((item) => item.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
    if (products.length !== productIds.length)
      throw new HttpError(400, "One or more product IDs are invalid");

    const productMap = new Map(products.map((p) => [p.id, p]));
    const totalQuantity = body.items.reduce((sum, item) => sum + item.quantity, 0);

    // Calculate total amount from unit prices
    const totalAmount = body.items.reduce((sum, item) => {
      const product = productMap.get(item.productId)!;
      return sum + Number(product.unitPrice) * item.quantity;
    }, 0);

    // Validate stock if creating as CONFIRMED
    if (body.status === "CONFIRMED") {
      for (const item of body.items) {
        const product = productMap.get(item.productId)!;
        if (product.currentStock < item.quantity)
          throw new HttpError(
            400,
            `Insufficient stock for "${product.name}". Available: ${product.currentStock}, required: ${item.quantity}`
          );
      }
    }

    const challan = await prisma.salesChallan.create({
      data: {
        challanNumber: await nextChallanNumber(),
        customerId: body.customerId,
        totalQuantity,
        totalAmount,
        notes: body.notes ?? null,
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
      include: {
        customer: true,
        items: true,
        createdBy: { select: { name: true, role: true } }
      }
    });

    if (body.status === "CONFIRMED") {
      const confirmed = await confirmChallan(challan.id, req.user!.id);
      return res.status(201).json(confirmed);
    }

    return res.status(201).json(challan);
  })
);

// GET /challans/:id — full challan detail
challanRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = routeParam(req.params.id, "id");
    const challan = await prisma.salesChallan.findUnique({
      where: { id },
      include: {
        customer: true,
        items: true,
        createdBy: { select: { id: true, name: true, role: true } }
      }
    });
    if (!challan) throw new HttpError(404, "Challan not found");
    return res.json(challan);
  })
);

// PATCH /challans/:id/notes — update notes on a DRAFT challan (ADMIN, SALES)
challanRouter.patch(
  "/:id/notes",
  requireRoles(Role.ADMIN, Role.SALES),
  asyncHandler(async (req, res) => {
    const id = routeParam(req.params.id, "id");
    const body = updateChallanNotesSchema.parse(req.body);
    const challan = await prisma.salesChallan.findUnique({ where: { id } });
    if (!challan) throw new HttpError(404, "Challan not found");
    if (challan.status !== ChallanStatus.DRAFT)
      throw new HttpError(400, "Notes can only be updated on a DRAFT challan");

    const updated = await prisma.salesChallan.update({
      where: { id },
      data: { notes: body.notes },
      include: { customer: true, items: true }
    });
    return res.json(updated);
  })
);

// PATCH /challans/:id/status — confirm or cancel (ADMIN, SALES, ACCOUNTS)
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

    // Cancel — only allowed from DRAFT state
    const challan = await prisma.salesChallan.findUnique({ where: { id } });
    if (!challan) throw new HttpError(404, "Challan not found");
    if (challan.status === ChallanStatus.CONFIRMED)
      throw new HttpError(400, "A confirmed challan cannot be cancelled. Contact admin.");
    if (challan.status === ChallanStatus.CANCELLED)
      throw new HttpError(400, "Challan is already cancelled");

    const updated = await prisma.salesChallan.update({
      where: { id },
      data: { status: ChallanStatus.CANCELLED },
      include: {
        customer: true,
        items: true,
        createdBy: { select: { name: true, role: true } }
      }
    });
    return res.json(updated);
  })
);
