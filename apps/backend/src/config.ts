import dotenv from "dotenv";

dotenv.config();

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: requiredEnv("DATABASE_URL"),
  jwtSecret: requiredEnv("JWT_SECRET"),
  // Short-lived access tokens limit exposure if a browser token is compromised.
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173"
};
