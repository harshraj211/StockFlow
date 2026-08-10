import type { ActivityEntityType } from "@prisma/client";
import { prisma } from "./db.js";

type ActivityInput = {
  action: string;
  entityType: ActivityEntityType;
  entityId?: string | null;
  title: string;
  details?: string | null;
  createdById?: string | null;
};

export async function logActivity(input: ActivityInput) {
  try {
    await prisma.activityLog.create({
      data: {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        title: input.title,
        details: input.details ?? null,
        createdById: input.createdById ?? null
      }
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      console.warn("Activity log skipped:", error);
    }
  }
}
