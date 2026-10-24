import { Router } from "express";
import * as controller from "./booking.controller.js";
import { authenticate } from "../../common/middleware/auth.middleware.js";

const router = Router();

// Preserved starter routes
router.get("/", controller.serveIndexHtml);
router.get("/seats", controller.getSeats);
router.put("/:id/:name", controller.legacyBookSeat);

// Protected booking endpoint
router.post("/api/bookings", authenticate, controller.bookSeat);

export default router;