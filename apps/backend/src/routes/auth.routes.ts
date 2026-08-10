import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../db.js";
import { asyncHandler, HttpError } from "../http.js";
import { loginSchema } from "../validators.js";
import { signToken } from "../auth.js";

export const authRouter = Router();

// POST /auth/login
authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });

    // Use same error for both wrong email and wrong password (prevents user enumeration)
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      throw new HttpError(401, "Invalid email or password");
    }

    if (!user.isActive) {
      throw new HttpError(403, "Your account has been deactivated. Contact your administrator.");
    }

    const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role };
    return res.json({ token: signToken(safeUser), user: safeUser });
  })
);
