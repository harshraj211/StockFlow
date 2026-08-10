import { z } from "zod";

export const paginationQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().optional()
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const customerSchema = z.object({
  name: z.string().min(2),
  mobile: z.string().min(7),
  email: z.string().email(),
  businessName: z.string().min(2),
  gstNumber: z.string().trim().optional().nullable(),
  type: z.enum(["RETAIL", "WHOLESALE", "DISTRIBUTOR"]),
  address: z.string().min(3),
  status: z.enum(["LEAD", "ACTIVE", "INACTIVE"]),
  followUpDate: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable()
});

export const followUpSchema = z.object({
  note: z.string().min(2)
});

export const productSchema = z.object({
  name: z.string().min(2),
  sku: z.string().min(2),
  category: z.string().min(2),
  unitPrice: z.coerce.number().nonnegative(),
  currentStock: z.coerce.number().int().nonnegative(),
  minimumStock: z.coerce.number().int().nonnegative(),
  location: z.string().min(2)
});

export const stockMovementSchema = z.object({
  quantity: z.coerce.number().int().positive(),
  type: z.enum(["IN", "OUT"]),
  reason: z.string().min(2)
});

export const challanSchema = z.object({
  customerId: z.string().min(1),
  status: z.enum(["DRAFT", "CONFIRMED"]).default("DRAFT"),
  items: z.array(
    z.object({
      productId: z.string().min(1),
      quantity: z.coerce.number().int().positive()
    })
  ).min(1)
});

export const challanStatusSchema = z.object({
  status: z.enum(["CONFIRMED", "CANCELLED"])
});
