import { Router } from "express";
import { ActivityEntityType, MovementType, Role } from "@prisma/client";
import { prisma } from "../db.js";
import { requireAuth, requireRoles } from "../auth.js";
import { asyncHandler, HttpError, routeParam } from "../http.js";
import {
  paginationQuery,
  productImageCompleteSchema,
  productImageUploadSchema,
  productListQuery,
  productSchema,
  stockMovementSchema
} from "../validators.js";
import { logActivity } from "../activity.js";
import {
  assertProductImageKey,
  createProductImageKey,
  createProductImageUploadUrl,
  deleteProductImage,
  inspectProductImage,
  MAX_PRODUCT_IMAGE_BYTES,
  productWithImageUrl
} from "../s3.js";

export const productRouter = Router();
productRouter.use(requireAuth);

// GET /products  list with search + pagination
productRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = productListQuery.parse(req.query);
    let stockFilteredIds: string[] | undefined;
    if (query.stockState) {
      const stockRows =
        query.stockState === "HEALTHY"
          ? await prisma.$queryRaw<Array<{ id: string }>>`SELECT id FROM "Product" WHERE "currentStock" > "minimumStock"`
          : query.stockState === "LOW"
            ? await prisma.$queryRaw<Array<{ id: string }>>`SELECT id FROM "Product" WHERE "currentStock" <= "minimumStock" AND "currentStock" > 0`
            : await prisma.$queryRaw<Array<{ id: string }>>`SELECT id FROM "Product" WHERE "currentStock" = 0`;
      stockFilteredIds = stockRows.map((row) => row.id);
    }
    const where = {
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" as const } },
              { sku: { contains: query.search, mode: "insensitive" as const } },
              { category: { contains: query.search, mode: "insensitive" as const } },
              { location: { contains: query.search, mode: "insensitive" as const } }
            ]
          }
        : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.location ? { location: query.location } : {}),
      ...(stockFilteredIds ? { id: { in: stockFilteredIds } } : {})
    };
    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      prisma.product.count({ where })
    ]);
    return res.json({
      items: await Promise.all(items.map((product) => productWithImageUrl(product))),
      page: query.page,
      limit: query.limit,
      total
    });
  })
);

// POST /products  create product (ADMIN, WAREHOUSE)
productRouter.post(
  "/",
  requireRoles(Role.ADMIN, Role.WAREHOUSE),
  asyncHandler(async (req, res) => {
    const body = productSchema.parse(req.body);
    const existing = await prisma.product.findUnique({ where: { sku: body.sku } });
    if (existing) throw new HttpError(409, `A product with SKU "${body.sku}" already exists`);
    const product = await prisma.product.create({ data: body });
    await logActivity({
      action: "PRODUCT_CREATED",
      entityType: ActivityEntityType.PRODUCT,
      entityId: product.id,
      title: `${product.name} added to inventory`,
      details: `${product.sku} at ${product.location}`,
      createdById: req.user!.id
    });
    return res.status(201).json(await productWithImageUrl(product));
  })
);

// POST /products/:id/image/upload-url  create a short-lived direct-to-S3 upload URL
productRouter.post(
  "/:id/image/upload-url",
  requireRoles(Role.ADMIN, Role.WAREHOUSE),
  asyncHandler(async (req, res) => {
    const id = routeParam(req.params.id, "id");
    const body = productImageUploadSchema.parse(req.body);
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new HttpError(404, "Product not found");

    const imageKey = createProductImageKey(id, body.contentType);
    const uploadUrl = await createProductImageUploadUrl(imageKey, body.contentType);
    return res.json({ imageKey, uploadUrl, expiresIn: 300, maxBytes: MAX_PRODUCT_IMAGE_BYTES });
  })
);

// POST /products/:id/image/complete  verify the uploaded object before attaching it
productRouter.post(
  "/:id/image/complete",
  requireRoles(Role.ADMIN, Role.WAREHOUSE),
  asyncHandler(async (req, res) => {
    const id = routeParam(req.params.id, "id");
    const body = productImageCompleteSchema.parse(req.body);
    assertProductImageKey(id, body.imageKey);
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new HttpError(404, "Product not found");

    try {
      await inspectProductImage(body.imageKey);
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError(400, "Uploaded image could not be verified");
    }

    const updated = await prisma.product.update({ where: { id }, data: { imageKey: body.imageKey } });
    if (product.imageKey && product.imageKey !== body.imageKey) {
      deleteProductImage(product.imageKey).catch((error) => console.warn("Unable to remove replaced product image", error));
    }
    await logActivity({
      action: "PRODUCT_IMAGE_UPDATED",
      entityType: ActivityEntityType.PRODUCT,
      entityId: updated.id,
      title: `${updated.name} product image updated`,
      details: updated.sku,
      createdById: req.user!.id
    });
    return res.json(await productWithImageUrl(updated));
  })
);

// DELETE /products/:id/image  remove the object and clear the product reference
productRouter.delete(
  "/:id/image",
  requireRoles(Role.ADMIN, Role.WAREHOUSE),
  asyncHandler(async (req, res) => {
    const id = routeParam(req.params.id, "id");
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new HttpError(404, "Product not found");
    if (product.imageKey) await deleteProductImage(product.imageKey);

    const updated = await prisma.product.update({ where: { id }, data: { imageKey: null } });
    await logActivity({
      action: "PRODUCT_IMAGE_REMOVED",
      entityType: ActivityEntityType.PRODUCT,
      entityId: updated.id,
      title: `${updated.name} product image removed`,
      details: updated.sku,
      createdById: req.user!.id
    });
    return res.json(await productWithImageUrl(updated));
  })
);

// GET /products/:id  single product with last 10 movements
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
    return res.json(await productWithImageUrl(product));
  })
);

// PUT /products/:id  update product (ADMIN, WAREHOUSE)
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
    await logActivity({
      action: "PRODUCT_UPDATED",
      entityType: ActivityEntityType.PRODUCT,
      entityId: updated.id,
      title: `${updated.name} product details updated`,
      details: `${updated.sku} stock ${updated.currentStock}, minimum ${updated.minimumStock}`,
      createdById: req.user!.id
    });
    return res.json(await productWithImageUrl(updated));
  })
);

// GET /products/:id/movements  paginated movement history
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

// POST /products/:id/movements  manual stock adjustment (ADMIN, WAREHOUSE)
productRouter.post(
  "/:id/movements",
  requireRoles(Role.ADMIN, Role.WAREHOUSE),
  asyncHandler(async (req, res) => {
    const id = routeParam(req.params.id, "id");
    const body = stockMovementSchema.parse(req.body);
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new HttpError(404, "Product not found");

    const result = await prisma.$transaction(async (tx) => {
      const updatedCount = await tx.product.updateMany({
        where:
          body.type === "OUT"
            ? { id: product.id, currentStock: { gte: body.quantity } }
            : { id: product.id },
        data: {
          currentStock: body.type === "IN" ? { increment: body.quantity } : { decrement: body.quantity }
        }
      });
      if (updatedCount.count === 0) {
        const current = await tx.product.findUnique({ where: { id: product.id } });
        throw new HttpError(
          400,
          `Insufficient stock. Available: ${current?.currentStock ?? 0}, requested OUT: ${body.quantity}`
        );
      }
      const updated = await tx.product.findUniqueOrThrow({ where: { id: product.id } });
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

    await logActivity({
      action: "STOCK_MOVEMENT_RECORDED",
      entityType: ActivityEntityType.PRODUCT,
      entityId: result.product.id,
      title: `${body.type} stock movement recorded for ${product.name}`,
      details: `${body.quantity} units. Reason: ${body.reason}`,
      createdById: req.user!.id
    });
    return res.status(201).json({ ...result, product: await productWithImageUrl(result.product) });
  })
);
