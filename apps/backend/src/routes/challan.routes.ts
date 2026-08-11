import { Router } from "express";
import { ActivityEntityType, ChallanStatus, MovementType, Prisma, Role } from "@prisma/client";
import PDFDocument from "pdfkit";
import { prisma } from "../db.js";
import { requireAuth, requireRoles } from "../auth.js";
import { asyncHandler, HttpError, routeParam } from "../http.js";
import { challanListQuery, challanSchema, challanStatusSchema, updateChallanNotesSchema } from "../validators.js";
import { logActivity } from "../activity.js";

export const challanRouter = Router();
challanRouter.use(requireAuth);

/** Generates the next sequential challan number: CH-2026-00001 */
async function nextChallanNumber(tx: Prisma.TransactionClient) {
  const year = new Date().getFullYear();
  const prefix = `CH-${year}-`;
  const latest = await tx.salesChallan.findFirst({
    where: { challanNumber: { startsWith: prefix } },
    orderBy: { challanNumber: "desc" },
    select: { challanNumber: true }
  });
  const latestSequence = latest ? Number(latest.challanNumber.slice(prefix.length)) : 0;
  return `${prefix}${String(latestSequence + 1).padStart(5, "0")}`;
}

async function createDraftChallanWithRetry(
  data: Omit<Prisma.SalesChallanCreateInput, "challanNumber" | "statusHistory"> & {
    customer: Prisma.CustomerCreateNestedOneWithoutChallansInput;
    createdBy: Prisma.UserCreateNestedOneWithoutChallansInput;
    items: Prisma.SalesChallanItemCreateNestedManyWithoutChallanInput;
  },
  changedById: string,
  initialHistoryNote: string
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const challanNumber = await nextChallanNumber(tx);
        const challan = await tx.salesChallan.create({
          data: {
            ...data,
            challanNumber,
            status: ChallanStatus.DRAFT
          },
          include: {
            customer: true,
            items: true,
            createdBy: { select: { name: true, role: true } },
            statusHistory: {
              include: { changedBy: { select: { name: true, role: true } } },
              orderBy: { createdAt: "asc" }
            }
          }
        });
        await tx.challanStatusHistory.create({
          data: {
            challanId: challan.id,
            fromStatus: null,
            toStatus: ChallanStatus.DRAFT,
            note: initialHistoryNote,
            changedById
          }
        });
        return challan;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        attempt < 2
      ) {
        continue;
      }
      throw error;
    }
  }
  throw new HttpError(500, "Could not generate a unique challan number");
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

    // Ensure each product still exists before attempting conditional decrements.
    for (const item of challan.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new HttpError(404, `Product "${item.productName}" no longer exists`);
    }

    // Deduct stock with an atomic stock guard per row to avoid overselling under concurrency.
    for (const item of challan.items) {
      const updated = await tx.product.updateMany({
        where: {
          id: item.productId,
          currentStock: { gte: item.quantity }
        },
        data: { currentStock: { decrement: item.quantity } }
      });
      if (updated.count === 0) {
        const currentProduct = await tx.product.findUnique({ where: { id: item.productId } });
        throw new HttpError(
          400,
          `Insufficient stock for "${item.productName}". Available: ${currentProduct?.currentStock ?? 0}, required: ${item.quantity}`
        );
      }
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

    await tx.salesChallan.update({
      where: { id: challanId },
      data: { status: ChallanStatus.CONFIRMED, confirmedAt: new Date() }
    });
    await tx.challanStatusHistory.create({
      data: {
        challanId,
        fromStatus: challan.status,
        toStatus: ChallanStatus.CONFIRMED,
        note: "Stock deducted successfully during confirmation",
        changedById: userId
      }
    });
    return tx.salesChallan.findUniqueOrThrow({
      where: { id: challanId },
      include: {
        customer: true,
        items: true,
        createdBy: { select: { name: true, role: true } },
        statusHistory: {
          include: { changedBy: { select: { name: true, role: true } } },
          orderBy: { createdAt: "asc" }
        }
      }
    });
  });
}

// GET /challans  paginated list with search
challanRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = challanListQuery.parse(req.query);
    const where = {
      ...(query.search
        ? {
            OR: [
              { challanNumber: { contains: query.search, mode: "insensitive" as const } },
              { customer: { name: { contains: query.search, mode: "insensitive" as const } } },
              { customer: { businessName: { contains: query.search, mode: "insensitive" as const } } }
            ]
          }
        : {}),
      ...(query.status ? { status: query.status as ChallanStatus } : {})
    };
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

// POST /challans  create challan (ADMIN, SALES)
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

    const challan = await createDraftChallanWithRetry(
      {
        customer: { connect: { id: body.customerId } },
        totalQuantity,
        totalAmount,
        notes: body.notes ?? null,
        createdBy: { connect: { id: req.user!.id } },
        items: {
          create: body.items.map((item) => {
            const product = productMap.get(item.productId)!;
            return {
              product: { connect: { id: product.id } },
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
      req.user!.id,
      body.status === "CONFIRMED" ? "Challan created before confirmation" : "Draft challan created"
    );

    if (body.status === "CONFIRMED") {
      const confirmed = await confirmChallan(challan.id, req.user!.id);
      await logActivity({
        action: "CHALLAN_CREATED_CONFIRMED",
        entityType: ActivityEntityType.CHALLAN,
        entityId: confirmed.id,
        title: `${confirmed.challanNumber} created and confirmed`,
        details: `Stock deducted for ${confirmed.totalQuantity} units`,
        createdById: req.user!.id
      });
      return res.status(201).json(confirmed);
    }

    await logActivity({
      action: "CHALLAN_CREATED",
      entityType: ActivityEntityType.CHALLAN,
      entityId: challan.id,
      title: `${challan.challanNumber} draft challan created`,
      details: `${challan.customer.businessName}, ${challan.totalQuantity} units`,
      createdById: req.user!.id
    });
    return res.status(201).json(challan);
  })
);

// GET /challans/:id  full challan detail
challanRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = routeParam(req.params.id, "id");
    const challan = await prisma.salesChallan.findUnique({
      where: { id },
      include: {
        customer: true,
        items: true,
        createdBy: { select: { id: true, name: true, role: true } },
        statusHistory: {
          include: { changedBy: { select: { name: true, role: true } } },
          orderBy: { createdAt: "asc" }
        }
      }
    });
    if (!challan) throw new HttpError(404, "Challan not found");
    return res.json(challan);
  })
);

// GET /challans/:id/pdf  server-generated challan PDF
challanRouter.get(
  "/:id/pdf",
  asyncHandler(async (req, res) => {
    const id = routeParam(req.params.id, "id");
    const challan = await prisma.salesChallan.findUnique({
      where: { id },
      include: {
        customer: true,
        items: true,
        createdBy: { select: { name: true, role: true } }
      }
    });
    if (!challan) throw new HttpError(404, "Challan not found");

    const doc = new PDFDocument({ margin: 42, size: "A4" });
    const filename = `${challan.challanNumber}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    doc.pipe(res);

    doc.fontSize(20).text("Sales Challan", { align: "left" });
    doc.fontSize(11).fillColor("#555").text(`${challan.challanNumber} - ${challan.status}`);
    doc.moveDown();

    doc.fillColor("#111").fontSize(12).text("Customer", { underline: true });
    doc.text(challan.customer.businessName);
    doc.text(`${challan.customer.name} - ${challan.customer.mobile}`);
    doc.text(challan.customer.address);
    doc.moveDown();

    doc.text(`Created: ${challan.createdAt.toLocaleString()}`);
    doc.text(`Created by: ${challan.createdBy.name} (${challan.createdBy.role})`);
    if (challan.confirmedAt) doc.text(`Confirmed: ${challan.confirmedAt.toLocaleString()}`);
    if (challan.notes) doc.text(`Notes: ${challan.notes}`);
    doc.moveDown();

    const startY = doc.y + 8;
    const columns = [42, 76, 260, 350, 410, 480];
    doc.fontSize(10).font("Helvetica-Bold");
    doc.text("#", columns[0], startY);
    doc.text("Product", columns[1], startY);
    doc.text("Location", columns[2], startY);
    doc.text("Qty", columns[3], startY);
    doc.text("Rate", columns[4], startY);
    doc.text("Amount", columns[5], startY);
    doc.moveTo(42, startY + 16).lineTo(552, startY + 16).stroke();

    doc.font("Helvetica");
    let y = startY + 26;
    challan.items.forEach((item, index) => {
      const amount = Number(item.unitPrice) * item.quantity;
      if (y > 730) {
        doc.addPage();
        y = 42;
      }
      doc.text(String(index + 1), columns[0], y);
      doc.text(`${item.productName}\n${item.sku} - ${item.category}`, columns[1], y, { width: 170 });
      doc.text(item.location, columns[2], y, { width: 80 });
      doc.text(String(item.quantity), columns[3], y);
      doc.text(Number(item.unitPrice).toFixed(2), columns[4], y);
      doc.text(amount.toFixed(2), columns[5], y);
      y += 42;
    });

    doc.moveTo(42, y).lineTo(552, y).stroke();
    doc.font("Helvetica-Bold").fontSize(13).text(`Total Quantity: ${challan.totalQuantity}`, 330, y + 16);
    doc.text(`Total Amount: Rs. ${Number(challan.totalAmount).toFixed(2)}`, 330, y + 36);
    doc.end();
  })
);

// PATCH /challans/:id/notes  update notes on a DRAFT challan (ADMIN, SALES)
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
      include: {
        customer: true,
        items: true,
        statusHistory: {
          include: { changedBy: { select: { name: true, role: true } } },
          orderBy: { createdAt: "asc" }
        }
      }
    });
    await prisma.challanStatusHistory.create({
      data: {
        challanId: updated.id,
        fromStatus: challan.status,
        toStatus: challan.status,
        note: `Notes updated${body.notes ? `: ${body.notes}` : ""}`,
        changedById: req.user!.id
      }
    });
    await logActivity({
      action: "CHALLAN_NOTES_UPDATED",
      entityType: ActivityEntityType.CHALLAN,
      entityId: updated.id,
      title: `${updated.challanNumber} notes updated`,
      details: body.notes,
      createdById: req.user!.id
    });
    return res.json(updated);
  })
);

// PATCH /challans/:id/status  confirm or cancel (ADMIN, SALES, ACCOUNTS)
challanRouter.patch(
  "/:id/status",
  requireRoles(Role.ADMIN, Role.SALES, Role.ACCOUNTS),
  asyncHandler(async (req, res) => {
    const id = routeParam(req.params.id, "id");
    const body = challanStatusSchema.parse(req.body);

    if (body.status === "CONFIRMED") {
      const confirmed = await confirmChallan(id, req.user!.id);
      await logActivity({
        action: "CHALLAN_CONFIRMED",
        entityType: ActivityEntityType.CHALLAN,
        entityId: confirmed.id,
        title: `${confirmed.challanNumber} confirmed`,
        details: `Stock deducted for ${confirmed.totalQuantity} units`,
        createdById: req.user!.id
      });
      return res.json(confirmed);
    }

    // Cancel  only allowed from DRAFT state
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
        createdBy: { select: { name: true, role: true } },
        statusHistory: {
          include: { changedBy: { select: { name: true, role: true } } },
          orderBy: { createdAt: "asc" }
        }
      }
    });
    await prisma.challanStatusHistory.create({
      data: {
        challanId: updated.id,
        fromStatus: challan.status,
        toStatus: ChallanStatus.CANCELLED,
        note: "Draft challan cancelled",
        changedById: req.user!.id
      }
    });
    await logActivity({
      action: "CHALLAN_CANCELLED",
      entityType: ActivityEntityType.CHALLAN,
      entityId: updated.id,
      title: `${updated.challanNumber} cancelled`,
      details: `${updated.customer.businessName}, no stock deducted`,
      createdById: req.user!.id
    });
    return res.json(updated);
  })
);
