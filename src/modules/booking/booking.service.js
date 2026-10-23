import pool from "../../common/config/db.js";
import ApiError from "../../common/utils/api-error.js";

// Mock movie data for the hackathon
const MOCK_MOVIES = [
  {
    id: "m-101",
    title: "Interstellar",
    genre: "Sci-Fi / Adventure",
    duration: "169 min",
    showtimes: ["14:00", "18:00", "21:30"],
    poster: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format",
  },
  {
    id: "m-102",
    title: "Inception",
    genre: "Action / Sci-Fi",
    duration: "148 min",
    showtimes: ["15:30", "19:00", "22:15"],
    poster: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format",
  },
  {
    id: "m-103",
    title: "Dune: Part Two",
    genre: "Sci-Fi / Drama",
    duration: "166 min",
    showtimes: ["13:00", "17:15", "20:45"],
    poster: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=500&auto=format",
  },
];

export const getMockMovies = () => MOCK_MOVIES;

// Get all seats from database (preserves starter code)
export const getAllSeats = async () => {
  const result = await pool.query("SELECT * FROM seats ORDER BY id ASC");
  return result.rows;
};

// Book a seat with full SQL Transaction and Concurrency Row-Level Lock
export const bookSeatWithTransaction = async ({ seatId, userId, userName, movieTitle = "Interstellar" }) => {
  if (!seatId) {
    throw ApiError.badRequest("Seat ID is required");
  }

  const client = await pool.connect();

  try {
    // 1. Begin SQL Transaction
    await client.query("BEGIN");

    // 2. Concurrency Lock: Lock the row so concurrent requests queue up
    const seatCheck = await client.query(
      "SELECT * FROM seats WHERE id = $1 AND isbooked = 0 FOR UPDATE",
      [seatId]
    );

    if (seatCheck.rowCount === 0) {
      throw ApiError.conflict("Seat is already booked or does not exist");
    }

    // 3. Update the seats table (preserves starter behavior)
    await client.query(
      "UPDATE seats SET isbooked = 1, name = $1 WHERE id = $2",
      [userName, seatId]
    );

    // 4. Create the booking entry linked to the authenticated user
    const bookingResult = await client.query(
      `INSERT INTO bookings (user_id, seat_id, movie_title)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, seat_id, movie_title, booked_at`,
      [userId, seatId, movieTitle]
    );

    // 5. Commit transaction
    await client.query("COMMIT");

    return {
      booking: bookingResult.rows[0],
      seat: { id: seatId, isbooked: 1, bookedBy: userName },
    };
  } catch (error) {
    // Rollback any changes if something fails
    await client.query("ROLLBACK");
    throw error;
  } finally {
    // Always release client connection back to pool
    client.release();
  }
};

// Get all bookings made by the logged-in user
export const getUserBookings = async (userId) => {
  const result = await pool.query(
    `SELECT b.id AS booking_id, b.seat_id, b.movie_title, b.booked_at, s.name AS seat_label
     FROM bookings b
     JOIN seats s ON b.seat_id = s.id
     WHERE b.user_id = $1
     ORDER BY b.booked_at DESC`,
    [userId]
  );
  return result.rows;
};

// Legacy starter route compatibility: PUT /:id/:name
export const legacyBookSeat = async (id, name) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      "SELECT * FROM seats WHERE id = $1 AND isbooked = 0 FOR UPDATE",
      [id]
    );

    if (result.rowCount === 0) {
      throw ApiError.conflict("Seat already booked");
    }

    const updateResult = await client.query(
      "UPDATE seats SET isbooked = 1, name = $2 WHERE id = $1 RETURNING *",
      [id, name]
    );

    await client.query("COMMIT");
    return updateResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
