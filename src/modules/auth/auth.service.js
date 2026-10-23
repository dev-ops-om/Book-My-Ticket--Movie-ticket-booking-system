import bcrypt from "bcryptjs";
import pool from "../../common/config/db.js";
import ApiError from "../../common/utils/api-error.js";
import { generateToken } from "../../common/utils/jwt.js";

export const registerUser = async ({ name, email, password }) => {
  if (!name || !email || !password) {
    throw ApiError.badRequest("Name, email, and password are required");
  }

  if (password.length < 6) {
    throw ApiError.badRequest("Password must be at least 6 characters long");
  }

  const cleanEmail = email.toLowerCase().trim();

  // Check if user already exists in PostgreSQL
  const existing = await pool.query(
    "SELECT id FROM users WHERE email = $1",
    [cleanEmail]
  );

  if (existing.rows.length > 0) {
    throw ApiError.conflict("Email is already registered");
  }

  // Hash password using bcrypt
  const passwordHash = await bcrypt.hash(password, 12);

  // Insert new user record
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, role, created_at`,
    [name.trim(), cleanEmail, passwordHash]
  );

  const user = result.rows[0];
  const token = generateToken({ id: user.id, email: user.email, role: user.role });

  return { user, token };
};

export const loginUser = async ({ email, password }) => {
  if (!email || !password) {
    throw ApiError.badRequest("Email and password are required");
  }

  const cleanEmail = email.toLowerCase().trim();

  // Fetch user including password_hash for comparison
  const result = await pool.query(
    "SELECT * FROM users WHERE email = $1",
    [cleanEmail]
  );

  if (result.rows.length === 0) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const user = result.rows[0];

  // Compare passwords
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const token = generateToken({ id: user.id, email: user.email, role: user.role });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
    },
    token,
  };
};
