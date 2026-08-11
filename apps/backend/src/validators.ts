import { z } from "zod";

const noMarkup = (label: string) =>
  z
    .string()
    .trim()
    .max(2000, `${label} must be 2000 characters or fewer`)
    .refine((value) => !/<[^>]*>/u.test(value), `${label} cannot contain HTML markup`);

export const paginationQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().optional()
});

export const customerListQuery = paginationQuery.extend({
  status: z.enum(["LEAD", "ACTIVE", "INACTIVE"]).optional(),
  priority: z.enum(["HOT", "WARM", "COLD"]).optional(),
  type: z.enum(["RETAIL", "WHOLESALE", "DISTRIBUTOR"]).optional()
});

export const productListQuery = paginationQuery.extend({
  category: z.string().trim().min(1).optional(),
  location: z.string().trim().min(1).optional(),
  stockState: z.enum(["HEALTHY", "LOW", "OUT"]).optional()
});

export const challanListQuery = paginationQuery.extend({
  status: z.enum(["DRAFT", "CONFIRMED", "CANCELLED"]).optional()
});

export const activityListQuery = paginationQuery.extend({
  entityType: z.enum(["CUSTOMER", "PRODUCT", "CHALLAN", "USER", "SYSTEM"]).optional()
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const customerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  mobile: z.string().min(7, "Mobile must be at least 7 digits").max(15),
  email: z.string().email("Invalid email address"),
  businessName: z.string().min(2, "Business name must be at least 2 characters"),
  gstNumber: z.string().trim().optional().nullable(),
  type: z.enum(["RETAIL", "WHOLESALE", "DISTRIBUTOR"]),
  address: z.string().min(3, "Address must be at least 3 characters"),
  status: z.enum(["LEAD", "ACTIVE", "INACTIVE"]),
  priority: z.enum(["HOT", "WARM", "COLD"]).default("WARM"),
  followUpDate: z.string().datetime().optional().nullable(),
  notes: noMarkup("Notes").optional().nullable()
});

export const followUpSchema = z.object({
  note: noMarkup("Follow-up note").min(2, "Note must be at least 2 characters")
});

export const productSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters"),
  sku: z.string().min(2, "SKU must be at least 2 characters").toUpperCase(),
  category: z.string().min(2, "Category must be at least 2 characters"),
  unitPrice: z.coerce.number().nonnegative("Unit price must be 0 or more"),
  currentStock: z.coerce.number().int().nonnegative("Stock must be 0 or more"),
  minimumStock: z.coerce.number().int().nonnegative("Minimum stock must be 0 or more"),
  location: z.string().min(2, "Location must be at least 2 characters")
});

export const productImageUploadSchema = z.object({
  fileName: z.string().trim().min(1).max(160),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  size: z.coerce.number().int().positive().max(5 * 1024 * 1024, "Image must be 5 MB or smaller")
});

export const productImageCompleteSchema = z.object({
  imageKey: z.string().trim().min(1).max(500)
});

export const stockMovementSchema = z.object({
  quantity: z.coerce.number().int().positive("Quantity must be a positive integer"),
  type: z.enum(["IN", "OUT"]),
  reason: noMarkup("Reason").min(2, "Reason must be at least 2 characters")
});

export const challanSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  status: z.enum(["DRAFT", "CONFIRMED"]).default("DRAFT"),
  notes: noMarkup("Notes").optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "Product is required"),
        quantity: z.coerce.number().int().positive("Quantity must be a positive integer")
      })
    )
    .min(1, "At least one product item is required")
});

export const challanStatusSchema = z.object({
  status: z.enum(["CONFIRMED", "CANCELLED"])
});

export const updateChallanNotesSchema = z.object({
  notes: noMarkup("Notes").nullable()
});

export const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(10, "Password must be at least 10 characters")
    .max(128, "Password must be 128 characters or fewer")
    .regex(/[a-z]/, "Password must include a lowercase letter")
    .regex(/[A-Z]/, "Password must include an uppercase letter")
    .regex(/[0-9]/, "Password must include a number")
    .regex(/[^A-Za-z0-9]/, "Password must include a special character"),
  role: z.enum(["ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"])
});

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(["ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"]).optional()
});
