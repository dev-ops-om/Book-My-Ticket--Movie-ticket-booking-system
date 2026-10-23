import ApiError from "../utils/api-error.js";
import { verifyToken } from "../utils/jwt.js";
import pool from "../config/db.js";

export const authenticate = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (!token) {
      throw ApiError.unauthorized("Authentication token required");
    }

    const decoded = verifyToken(token);

    // Verify user exists in PostgreSQL
    const result = await pool.query(
      "SELECT id, name, email, role FROM users WHERE id = $1",
      [decoded.id]
    );

    if (result.rows.length === 0) {
      throw ApiError.unauthorized("User account no longer exists");
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      next(ApiError.unauthorized("Invalid or expired authentication token"));
    } else {
      next(error);
    }
  }
};
