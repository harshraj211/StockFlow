import { Router } from "express";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "../db.js";
import { requireAuth, requireRoles } from "../auth.js";
import { asyncHandler, HttpError, routeParam } from "../http.js";
import { createUserSchema, paginationQuery, updateUserSchema } from "../validators.js";

export const usersRouter = Router();
usersRouter.use(requireAuth);
usersRouter.use(requireRoles(Role.ADMIN));

// GET /users  list all users (admin only)
usersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = paginationQuery.parse(req.query);
    const where = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" as const } },
            { email: { contains: query.search, mode: "insensitive" as const } }
          ]
        }
      : {};
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, updatedAt: true },
        orderBy: { createdAt: "asc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      prisma.user.count({ where })
    ]);
    return res.json({ items, page: query.page, limit: query.limit, total });
  })
);

// POST /users  create user (admin only)
usersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = createUserSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) throw new HttpError(409, "A user with this email already exists");

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        passwordHash,
        role: body.role as Role
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true }
    });
    return res.status(201).json(user);
  })
);

// PUT /users/:id  update name / role (admin only)
usersRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = routeParam(req.params.id, "id");
    if (id === req.user!.id) throw new HttpError(400, "Cannot edit your own account via this endpoint");

    const body = updateUserSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new HttpError(404, "User not found");

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: body.name ?? user.name,
        role: (body.role as Role) ?? user.role
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, updatedAt: true }
    });
    return res.json(updated);
  })
);

// PATCH /users/:id/deactivate  soft-delete (admin only)
usersRouter.patch(
  "/:id/deactivate",
  asyncHandler(async (req, res) => {
    const id = routeParam(req.params.id, "id");
    if (id === req.user!.id) throw new HttpError(400, "Cannot deactivate your own account");

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new HttpError(404, "User not found");

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: { id: true, name: true, email: true, role: true, isActive: true }
    });
    return res.json(updated);
  })
);

// PATCH /users/:id/activate  re-activate (admin only)
usersRouter.patch(
  "/:id/activate",
  asyncHandler(async (req, res) => {
    const id = routeParam(req.params.id, "id");
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new HttpError(404, "User not found");

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: true },
      select: { id: true, name: true, email: true, role: true, isActive: true }
    });
    return res.json(updated);
  })
);
