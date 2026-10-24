import pool from "../../common/config/db.js";
import ApiError from "../../common/utils/api-error.js";

// 1. Get all movies from PostgreSQL
export const getAllMovies = async () => {
  const result = await pool.query("SELECT * FROM movies ORDER BY id ASC");
  return result.rows;
};

// 2. Get all seats from PostgreSQL (matching starter GET /seats)
export const getAllSeats = async () => {
  const result = await pool.query(
    "SELECT id, name, isbooked, user_id, booked_at FROM seats ORDER BY id ASC"
  );
  return result.rows;
};

// 3. Book a seat with Row-Level Lock & Transaction (ER diagram compliant)
export const bookSeatWithTransaction = async ({ seatId, movieId, userId, userName }) => {
  if (!seatId) {
    throw ApiError.badRequest("Seat ID is required");
  }

  // Pick a connection from the pool
  const conn = await pool.connect();

  try {
    // Begin transaction (KEEP THE TRANSACTION AS SMALL AS POSSIBLE)
    await conn.query("BEGIN");

    // 1. Row-level lock: ensure seat is not booked
    // $1 placeholder prevents SQL injection
    const seatSql = "SELECT * FROM seats WHERE id = $1 AND isbooked = 0 FOR UPDATE";
    const seatResult = await conn.query(seatSql, [seatId]);

    if (seatResult.rowCount === 0) {
      await conn.query("ROLLBACK");
      conn.release();
      throw ApiError.conflict("Seat is already booked");
    }

    // 2. Verify movie exists or fallback to first movie
    let targetMovieId = movieId;
    if (!targetMovieId) {
      const firstMovie = await conn.query("SELECT id FROM movies LIMIT 1");
      targetMovieId = firstMovie.rows[0]?.id;
    }

    // 3. Update seats table: set isbooked = 1, user_id, name, booked_at
    const updateSeatSql = `
      UPDATE seats
      SET isbooked = 1, user_id = $2, name = $3, booked_at = NOW(), updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const updatedSeat = await conn.query(updateSeatSql, [seatId, userId, userName]);

    // 4. Insert into bookings table (linking user_id, seat_id, movie_id)
    const bookingSql = `
      INSERT INTO bookings (user_id, seat_id, movie_id, status, booked_at)
      VALUES ($1, $2, $3, 'booked', NOW())
      RETURNING id, user_id, seat_id, movie_id, status, booked_at
    `;
    const bookingResult = await conn.query(bookingSql, [userId, seatId, targetMovieId]);

    // Commit transaction
    await conn.query("COMMIT");
    conn.release();

    return {
      booking: bookingResult.rows[0],
      seat: updatedSeat.rows[0],
    };
  } catch (ex) {
    await conn.query("ROLLBACK");
    if (ex instanceof ApiError) throw ex;
    console.error("Booking error:", ex);
    throw ApiError.internal("Internal Server Error");
  } finally {
    try {
      conn.release();
    } catch (e) {}
  }
};

// 4. Get all bookings for the authenticated user
export const getUserBookings = async (userId) => {
  const result = await pool.query(
    `SELECT
       b.id AS booking_id,
       b.status,
       b.booked_at,
       s.id AS seat_id,
       s.name AS seat_name,
       m.id AS movie_id,
       m.title AS movie_title,
       m.language AS movie_language,
       m.duration AS movie_duration,
       m.poster_url AS movie_poster
     FROM bookings b
     JOIN seats s ON b.seat_id = s.id
     JOIN movies m ON b.movie_id = m.id
     WHERE b.user_id = $1
     ORDER BY b.booked_at DESC`,
    [userId]
  );
  return result.rows;
};

// 5. Starter code backward-compatibility: PUT /:id/:name
export const legacyBookSeat = async (id, name) => {
  const conn = await pool.connect();
  try {
    await conn.query("BEGIN");
    const sql = "SELECT * FROM seats WHERE id = $1 AND isbooked = 0 FOR UPDATE";
    const result = await conn.query(sql, [id]);

    if (result.rowCount === 0) {
      await conn.query("ROLLBACK");
      conn.release();
      throw ApiError.conflict("Seat already booked");
    }

    const sqlU = `
      UPDATE seats
      SET isbooked = 1, name = $2, booked_at = NOW(), updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const updateResult = await conn.query(sqlU, [id, name]);

    await conn.query("COMMIT");
    conn.release();
    return updateResult.rows[0];
  } catch (ex) {
    await conn.query("ROLLBACK");
    if (ex instanceof ApiError) throw ex;
    console.error("Booking error:", ex);
    throw ApiError.internal("Internal Server Error");
  } finally {
    try {
      conn.release();
    } catch (e) {}
  }
};
