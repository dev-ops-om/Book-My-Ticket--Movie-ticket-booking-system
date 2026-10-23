import path from "path";
import { fileURLToPath } from "url";
import * as bookingService from "./booking.service.js";
import ApiResponse from "../../common/utils/api-response.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../../../public");

// 1. Serve starter HTML page
export const serveIndexHtml = (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
};

// 2. GET /seats (Starter route preserved)
export const getSeats = async (req, res, next) => {
  try {
    const seats = await bookingService.getAllSeats();
    res.json(seats);
  } catch (error) {
    next(error);
  }
};

// 3. GET /api/movies (Mock movie list)
export const getMovies = (req, res) => {
  const movies = bookingService.getMockMovies();
  return ApiResponse.ok(res, "Mock movies fetched successfully", movies);
};

// 4. POST /api/bookings (Protected booking endpoint)
export const bookSeat = async (req, res, next) => {
  try {
    const { seatId, movieTitle } = req.body;
    const result = await bookingService.bookSeatWithTransaction({
      seatId: Number(seatId),
      userId: req.user.id,
      userName: req.user.name,
      movieTitle: movieTitle || "Interstellar",
    });

    return ApiResponse.created(res, "Seat booked successfully!", result);
  } catch (error) {
    next(error);
  }
};

// 5. GET /api/bookings/my-bookings (User's booked seats)
export const getMyBookings = async (req, res, next) => {
  try {
    const bookings = await bookingService.getUserBookings(req.user.id);
    return ApiResponse.ok(res, "User bookings retrieved successfully", bookings);
  } catch (error) {
    next(error);
  }
};

// 6. PUT /:id/:name (Legacy starter route preserved)
export const legacyBookSeat = async (req, res, next) => {
  try {
    const { id, name } = req.params;
    const result = await bookingService.legacyBookSeat(id, name);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
