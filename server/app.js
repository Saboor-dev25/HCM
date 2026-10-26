import express from "express";
import cors from "cors";
import morgan from "morgan";
import initializeDatabase from "#config/initializeDatabase";
import authRoutes from "#routes/authRoutes";
import adminRoutes from "#routes/adminRoutes";
import attendanceRoutes from "#routes/attendanceRoutes";
import superAdminRoutes from "#routes/superAdminRoutes";
import hrRoutes from "#routes/hrRoutes";
import { authLimiter } from "#middleware/rateLimit";
const app = express();

app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
const clientOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(cors({
  origin: (origin, callback) => callback(null, !origin || clientOrigins.includes(origin)),
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));
app.use(async (req, res, next) => {
  try {
    await initializeDatabase();
    next();
  } catch (error) {
    next(error);
  }
});

app.get("/api/health", (req, res) => res.json({ message: "API is working" }));
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/super-admin", superAdminRoutes);
app.use("/api/hr", hrRoutes);
app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.code === 11000 ? 409 : error.status || 500).json({
    message: error.code === 11000
      ? "That email or company code is already in use."
      : error.message || "Something went wrong",
  });
});

export default app;



