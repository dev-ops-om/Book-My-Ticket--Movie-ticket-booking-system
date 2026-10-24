import path from "path";
import { fileURLToPath } from "url";
import * as bookingService from "./booking.service.js";
import ApiResponse from "../../common/utils/api-response.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../../../public");

export const serveIndexHtml = (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
};

export const getSeats = async (req, res, next) => {
  try {
    const seats = await bookingService.getAllSeats();
    res.json(seats);
  } catch (error) {
    next(error);
  }
};

export const bookSeat = async (req, res, next) => {
  try {
    const { seatId } = req.body;
    // req.user was verified and attached by authenticate middleware
    const seat = await bookingService.bookSeatWithTransaction({
      seatId: Number(seatId),
      userName: req.user.name,
    });

    return ApiResponse.created(res, "Seat booked successfully!", seat);
  } catch (error) {
    next(error);
  }
};

export const legacyBookSeat = async (req, res, next) => {
  try {
    const { id, name } = req.params;
    const result = await bookingService.legacyBookSeat(id, name);
    res.json(result);
  } catch (error) {
    next(error);
  }
};