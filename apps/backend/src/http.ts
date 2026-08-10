import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

export function routeParam(value: string | string[] | undefined, name: string) {
  if (!value || Array.isArray(value)) {
    throw new HttpError(400, `${name} route parameter is invalid`);
  }
  return value;
}

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: "Validation failed",
      errors: err.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }))
    });
  }

  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  console.error(err);
  return res.status(500).json({ message: "Internal server error" });
}
