import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./modules/auth/auth.routes.js";
import bookingRoutes from "./modules/booking/booking.routes.js";
import { errorHandler } from "./common/middleware/error.middleware.js";
import ApiResponse from "./common/utils/api-response.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.resolve(__dirname, "../public")));

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
