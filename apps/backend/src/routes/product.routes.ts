import { Router } from "express";
import { MovementType, Role } from "@prisma/client";
import { prisma } from "../db.js";
import { requireAuth, requireRoles } from "../auth.js";
import { asyncHandler, HttpError, routeParam } from "../http.js";
import { paginationQuery, productSchema, stockMovementSchema } from "../validators.js";

export const productRouter = Router();
productRouter.use(requireAuth);

// GET /products — list with search + pagination
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

// POST /products — create product (ADMIN, WAREHOUSE)
productRouter.post(
  "/",
  requireRoles(Role.ADMIN, Role.WAREHOUSE),
  asyncHandler(async (req, res) => {
    const body = productSchema.parse(req.body);
    const existing = await prisma.product.findUnique({ where: { sku: body.sku } });
    if (existing) throw new HttpError(409, `A product with SKU "${body.sku}" already exists`);
    const product = await prisma.product.create({ data: body });
    return res.status(201).json(product);
  })
);

// GET /products/:id — single product with last 10 movements
productRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = routeParam(req.params.id, "id");
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        _count: { select: { movements: true, challanItems: true } },
        movements: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { createdBy: { select: { name: true, role: true } } }
        }
      }
    });
    if (!product) throw new HttpError(404, "Product not found");
    return res.json(product);
  })
);

// PUT /products/:id — update product (ADMIN, WAREHOUSE)
productRouter.put(
  "/:id",
  requireRoles(Role.ADMIN, Role.WAREHOUSE),
  asyncHandler(async (req, res) => {
    const id = routeParam(req.params.id, "id");
    const body = productSchema.parse(req.body);
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new HttpError(404, "Product not found");
    // Guard SKU uniqueness on edit
    if (body.sku !== product.sku) {
      const conflict = await prisma.product.findUnique({ where: { sku: body.sku } });
      if (conflict) throw new HttpError(409, `A product with SKU "${body.sku}" already exists`);
    }
    const updated = await prisma.product.update({ where: { id }, data: body });
    return res.json(updated);
  })
);

// GET /products/:id/movements — paginated movement history
productRouter.get(
  "/:id/movements",
  asyncHandler(async (req, res) => {
    const id = routeParam(req.params.id, "id");
    const query = paginationQuery.parse(req.query);
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new HttpError(404, "Product not found");

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where: { productId: id },
        include: { createdBy: { select: { name: true, role: true } } },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      prisma.stockMovement.count({ where: { productId: id } })
    ]);
    return res.json({ items: movements, page: query.page, limit: query.limit, total });
  })
);

// POST /products/:id/movements — manual stock adjustment (ADMIN, WAREHOUSE)
productRouter.post(
  "/:id/movements",
  requireRoles(Role.ADMIN, Role.WAREHOUSE),
  asyncHandler(async (req, res) => {
    const id = routeParam(req.params.id, "id");
    const body = stockMovementSchema.parse(req.body);
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new HttpError(404, "Product not found");

    const nextStock =
      body.type === "IN"
        ? product.currentStock + body.quantity
        : product.currentStock - body.quantity;
    if (nextStock < 0)
      throw new HttpError(
        400,
        `Insufficient stock. Available: ${product.currentStock}, requested OUT: ${body.quantity}`
      );

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
        },
        include: { createdBy: { select: { name: true, role: true } } }
      });
      return { product: updated, movement };
    });

    return res.status(201).json(result);
  })
);
