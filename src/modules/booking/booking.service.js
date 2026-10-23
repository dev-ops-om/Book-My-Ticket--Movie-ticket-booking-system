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

// Equivalent to Seats.find() in mongoose
export const getAllSeats = async () => {
  const result = await pool.query("SELECT * FROM seats ORDER BY id ASC");
  return result.rows;
};

// Book a seat: exact transaction & row-level locking logic from class
export const bookSeatWithTransaction = async ({ seatId, userId, userName, movieTitle = "Interstellar" }) => {
  if (!seatId) {
    throw ApiError.badRequest("Seat ID is required");
  }

  // pick a connection from the pool
  const conn = await pool.connect();

  try {
    // begin transaction
    // KEEP THE TRANSACTION AS SMALL AS POSSIBLE
    await conn.query("BEGIN");

    // getting the row to make sure it is not booked
    // $1 is a variable which we are passing in the array as the second parameter of query function,
    // Why do we use $1? -> this is to avoid SQL INJECTION
    // (If you do ${id} directly in the query string,
    // then it can be manipulated by the user to execute malicious SQL code)
    const sql = "SELECT * FROM seats where id = $1 and isbooked = 0 FOR UPDATE";
    const result = await conn.query(sql, [seatId]);

    // if no rows found then the operation should fail can't book
    // This shows we Do not have the current seat available for booking
    if (result.rowCount === 0) {
      await conn.query("ROLLBACK");
      conn.release();
      throw ApiError.conflict("Seat already booked");
    }

    // if we get the row, we are safe to update
    const sqlU = "update seats set isbooked = 1, name = $2 where id = $1";
    await conn.query(sqlU, [seatId, userName]);

    // Insert record in bookings table linking to the authenticated user
    const sqlB = `INSERT INTO bookings (user_id, seat_id, movie_title)
                  VALUES ($1, $2, $3)
                  RETURNING id, user_id, seat_id, movie_title, booked_at`;
    const bookingResult = await conn.query(sqlB, [userId, seatId, movieTitle]);

    // end transaction by committing
    await conn.query("COMMIT");
    // release the connection back to the pool (so we do not keep the connection open unnecessarily)
    conn.release();

    return {
      booking: bookingResult.rows[0],
      seat: { id: seatId, isbooked: 1, name: userName },
    };
  } catch (ex) {
    await conn.query("ROLLBACK"); // Roll back if any error occurs
    if (ex instanceof ApiError) {
      throw ex;
    }
    console.error("Booking error:", ex);
    throw ApiError.internal("Internal Server Error");
  } finally {
    // ALWAYS release the connection back to the pool
    try {
      conn.release();
    } catch (e) {
      // already released
    }
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

// Legacy starter route compatibility: PUT /:id/:name (matching tutor's original code)
export const legacyBookSeat = async (id, name) => {
  const conn = await pool.connect();
  try {
    await conn.query("BEGIN");
    const sql = "SELECT * FROM seats where id = $1 and isbooked = 0 FOR UPDATE";
    const result = await conn.query(sql, [id]);

    if (result.rowCount === 0) {
      await conn.query("ROLLBACK");
      conn.release();
      throw ApiError.conflict("Seat already booked");
    }

    const sqlU = "update seats set isbooked = 1, name = $2 where id = $1 RETURNING *";
    const updateResult = await conn.query(sqlU, [id, name]);

    await conn.query("COMMIT");
    conn.release();
    return updateResult.rows[0];
  } catch (ex) {
    await conn.query("ROLLBACK");
    if (ex instanceof ApiError) {
      throw ex;
    }
    console.error("Booking error:", ex);
    throw ApiError.internal("Internal Server Error");
  } finally {
    try {
      conn.release();
    } catch (e) {}
  }
};
