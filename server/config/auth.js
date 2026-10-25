import crypto from "node:crypto";

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be configured in production.");
}

export const jwtSecret = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");
