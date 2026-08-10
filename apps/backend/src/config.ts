import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET ?? "development-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "1d",
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173"
};

if (!config.databaseUrl) {
  throw new Error("DATABASE_URL is required");
}
