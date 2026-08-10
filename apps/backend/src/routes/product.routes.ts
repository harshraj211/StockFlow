import { Router } from "express";
import { MovementType, Role } from "@prisma/client";
import { prisma } from "../db.js";
import { requireAuth, requireRoles } from "../auth.js";
import { asyncHandler, HttpError, routeParam } from "../http.js";
import { paginationQuery, productSchema, stockMovementSchema } from "../validators.js";

export const productRouter = Router();
productRouter.use(requireAuth);

productRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = paginationQuery.parse(req.query);
    const where = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" as const } },
            { sku: { contains: query.search, mode: "insensitive" as const } },
            { category: { contains: query.search, mode: "insensitive" as const } },
            { location: { contains: query.search, mode: "insensitive" as const } }
          ]
        }
      : {};
    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      prisma.product.count({ where })
    ]);
    return res.json({ items, page: query.page, limit: query.limit, total });
  })
);

productRouter.post(
  "/",
  requireRoles(Role.ADMIN, Role.WAREHOUSE),
  asyncHandler(async (req, res) => {
    const body = productSchema.parse(req.body);
    const product = await prisma.product.create({ data: body });
    return res.status(201).json(product);
  })
);

productRouter.put(
  "/:id",
  requireRoles(Role.ADMIN, Role.WAREHOUSE),
  asyncHandler(async (req, res) => {
    const id = routeParam(req.params.id, "id");
    const body = productSchema.parse(req.body);
    const product = await prisma.product.update({ where: { id }, data: body });
    return res.json(product);
  })
);

productRouter.get(
  "/:id/movements",
  asyncHandler(async (req, res) => {
    const id = routeParam(req.params.id, "id");
    const movements = await prisma.stockMovement.findMany({
      where: { productId: id },
      include: { createdBy: { select: { name: true, role: true } } },
      orderBy: { createdAt: "desc" }
    });
    return res.json(movements);
  })
);

productRouter.post(
  "/:id/movements",
  requireRoles(Role.ADMIN, Role.WAREHOUSE),
  asyncHandler(async (req, res) => {
    const id = routeParam(req.params.id, "id");
    const body = stockMovementSchema.parse(req.body);
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new HttpError(404, "Product not found");

    const nextStock = body.type === "IN" ? product.currentStock + body.quantity : product.currentStock - body.quantity;
    if (nextStock < 0) throw new HttpError(400, "Stock cannot go negative");

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id: product.id },
        data: { currentStock: nextStock }
      });
      const movement = await tx.stockMovement.create({
        data: {
          productId: product.id,
          quantity: body.quantity,
          type: body.type as MovementType,
          reason: body.reason,
          createdById: req.user!.id
        }
      });
      return { product: updated, movement };
    });

    return res.status(201).json(result);
  })
);
