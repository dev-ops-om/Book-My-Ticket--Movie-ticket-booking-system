import { Router } from "express";
import * as controller from "./booking.controller.js";
import { authenticate } from "../../common/middleware/auth.middleware.js";

const router = Router();

// Preserved starter routes
router.get("/", controller.serveIndexHtml);
router.get("/seats", controller.getSeats);
router.put("/:id/:name", controller.legacyBookSeat);

// New & Protected API routes
router.get("/api/movies", controller.getMovies);
router.post("/api/bookings", authenticate, controller.bookSeat);
router.get("/api/bookings/my-bookings", authenticate, controller.getMyBookings);

export default router;
