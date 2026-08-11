import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { rateLimit } from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import { config } from "./config.js";
import { errorHandler } from "./http.js";
import { openApiSpec } from "./openapi.js";
import { authRouter } from "./routes/auth.routes.js";
import { customerRouter } from "./routes/customer.routes.js";
import { productRouter } from "./routes/product.routes.js";
import { challanRouter } from "./routes/challan.routes.js";
import { usersRouter } from "./routes/users.routes.js";
import { dashboardRouter } from "./routes/dashboard.routes.js";
import { activityRouter } from "./routes/activity.routes.js";

export const app = express();

app.use(helmet());
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(express.json());
app.use(
  morgan((tokens, req, res) =>
    JSON.stringify({
      timestamp: new Date().toISOString(),
      method: tokens.method(req, res),
      path: tokens.url(req, res),
      status: Number(tokens.status(req, res)),
      durationMs: Number(tokens["response-time"](req, res)),
      contentLength: tokens.res(req, res, "content-length") ?? undefined
    })
  )
);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please slow down and try again shortly" }
});

// Rate-limit login attempts: max 20 per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts, please try again in 15 minutes" }
});

// Health check with DB ping
app.get("/health", async (_req, res) => {
  try {
    const { prisma } = await import("./db.js");
    await prisma.$queryRaw`SELECT 1`;
    return res.json({
      status: "ok",
      database: "connected",
      env: {
        jwtSecret: config.jwtSecret ? "configured" : "missing",
        databaseUrl: config.databaseUrl ? "configured" : "missing"
      },
      timestamp: new Date().toISOString()
    });
  } catch {
    return res.status(503).json({ status: "error", database: "unreachable" });
  }
});

app.get("/openapi.json", (_req, res) => res.json(openApiSpec));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

app.use(apiLimiter);
app.use("/auth", authLimiter, authRouter);
app.use("/customers", customerRouter);
app.use("/products", productRouter);
app.use("/challans", challanRouter);
app.use("/users", usersRouter);
app.use("/dashboard", dashboardRouter);
app.use("/activity", activityRouter);
app.use(errorHandler);
