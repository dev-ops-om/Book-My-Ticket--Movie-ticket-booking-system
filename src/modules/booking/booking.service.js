import pool from "../../common/config/booking.db.js";
import ApiError from "../../common/utils/api-error.js";

// 1. Get all seats
export const getAllSeats = async () => {
  const result = await pool.query("SELECT * FROM seats ORDER BY id ASC");
  return result.rows;
};

// 2. Book seat with Row-Level Lock (FOR UPDATE)
export const bookSeatWithTransaction = async ({ seatId, userName }) => {
  const conn = await pool.connect();

  try {
    await conn.query("BEGIN");

    // Row-level lock: SELECT ... FOR UPDATE
    const sql = "SELECT * FROM seats WHERE id = $1 AND isbooked = 0 FOR UPDATE";
    const result = await conn.query(sql, [seatId]);

    if (result.rowCount === 0) {
      await conn.query("ROLLBACK");
      throw ApiError.conflict("Seat already booked");
    }

    const sqlU = "UPDATE seats SET isbooked = 1, name = $2 WHERE id = $1 RETURNING *";
    const updateResult = await conn.query(sqlU, [seatId, userName]);

    await conn.query("COMMIT");
    return updateResult.rows[0];
  } catch (ex) {
    await conn.query("ROLLBACK");
    if (ex instanceof ApiError) throw ex;
    console.error("Booking error:", ex);
    throw ApiError.internal("Internal Server Error");
  } finally {
    conn.release();
  }
};

// 3. Starter code legacy route: PUT /:id/:name
export const legacyBookSeat = async (id, name) => {
  const conn = await pool.connect();
  try {
    await conn.query("BEGIN");
    const sql = "SELECT * FROM seats WHERE id = $1 AND isbooked = 0 FOR UPDATE";
    const result = await conn.query(sql, [id]);

    if (result.rowCount === 0) {
      await conn.query("ROLLBACK");
      throw ApiError.conflict("Seat already booked");
    }

    const sqlU = "UPDATE seats SET isbooked = 1, name = $2 WHERE id = $1 RETURNING *";
    const updateResult = await conn.query(sqlU, [id, name]);

    await conn.query("COMMIT");
    return updateResult.rows[0];
  } catch (ex) {
    await conn.query("ROLLBACK");
    if (ex instanceof ApiError) throw ex;
    console.error("Booking error:", ex);
    throw ApiError.internal("Internal Server Error");
  } finally {
    conn.release();
  }
};