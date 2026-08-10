import { Router } from "express";
import { CustomerStatus, CustomerType, Role } from "@prisma/client";
import { prisma } from "../db.js";
import { requireAuth, requireRoles } from "../auth.js";
import { asyncHandler, HttpError, routeParam } from "../http.js";
import { customerSchema, followUpSchema, paginationQuery } from "../validators.js";

export const customerRouter = Router();
customerRouter.use(requireAuth);

customerRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = paginationQuery.parse(req.query);
    const where = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" as const } },
            { mobile: { contains: query.search, mode: "insensitive" as const } },
            { email: { contains: query.search, mode: "insensitive" as const } },
            { businessName: { contains: query.search, mode: "insensitive" as const } }
          ]
        }
      : {};
    const [items, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      prisma.customer.count({ where })
    ]);
    return res.json({ items, page: query.page, limit: query.limit, total });
  })
);

customerRouter.post(
  "/",
  requireRoles(Role.ADMIN, Role.SALES),
  asyncHandler(async (req, res) => {
    const body = customerSchema.parse(req.body);
    const customer = await prisma.customer.create({
      data: {
        ...body,
        gstNumber: body.gstNumber || null,
        notes: body.notes || null,
        followUpDate: body.followUpDate ? new Date(body.followUpDate) : null,
        type: body.type as CustomerType,
        status: body.status as CustomerStatus,
        createdById: req.user!.id
      }
    });
    return res.status(201).json(customer);
  })
);

customerRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = routeParam(req.params.id, "id");
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: { followUps: { include: { createdBy: { select: { name: true, role: true } } }, orderBy: { createdAt: "desc" } } }
    });
    if (!customer) throw new HttpError(404, "Customer not found");
    return res.json(customer);
  })
);

customerRouter.put(
  "/:id",
  requireRoles(Role.ADMIN, Role.SALES),
  asyncHandler(async (req, res) => {
    const id = routeParam(req.params.id, "id");
    const body = customerSchema.parse(req.body);
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...body,
        gstNumber: body.gstNumber || null,
        notes: body.notes || null,
        followUpDate: body.followUpDate ? new Date(body.followUpDate) : null
      }
    });
    return res.json(customer);
  })
);

customerRouter.post(
  "/:id/follow-ups",
  requireRoles(Role.ADMIN, Role.SALES),
  asyncHandler(async (req, res) => {
    const id = routeParam(req.params.id, "id");
    const body = followUpSchema.parse(req.body);
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new HttpError(404, "Customer not found");
    const note = await prisma.followUpNote.create({
      data: { customerId: id, note: body.note, createdById: req.user!.id }
    });
    return res.status(201).json(note);
  })
);
