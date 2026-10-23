import express from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.routes.js";
import bookingRoutes from "./modules/booking/booking.routes.js";
import { errorHandler } from "./common/middleware/error.middleware.js";
import ApiResponse from "./common/utils/api-response.js";

const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get("/health", (req, res) => {
  return ApiResponse.ok(res, "Book My Ticket API is running", {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Feature Routes
app.use("/api/auth", authRoutes);
app.use("/", bookingRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;
