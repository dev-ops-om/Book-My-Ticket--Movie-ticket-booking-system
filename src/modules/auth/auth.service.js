import crypto from "crypto";
import bcrypt from "bcryptjs";
import pool from "../../common/config/db.js";
import ApiError from "../../common/utils/api-error.js";
import { generateToken } from "../../common/utils/jwt.js";

// 1. Register User (matching ER diagram: users table)
export const registerUser = async ({ name, email, password }) => {
  if (!name || !email || !password) {
    throw ApiError.badRequest("Name, email, and password are required");
  }

  if (password.length < 6) {
    throw ApiError.badRequest("Password must be at least 6 characters long");
  }

  const cleanEmail = email.toLowerCase().trim();

  // Check if email already exists
  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [cleanEmail]);
  if (existing.rows.length > 0) {
    throw ApiError.conflict("Email is already registered");
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Insert user
  const result = await pool.query(
    `INSERT INTO users (name, email, password)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, created_at`,
    [name.trim(), cleanEmail, passwordHash]
  );

  const user = result.rows[0];
  const token = generateToken({ id: user.id, name: user.name, email: user.email });

  return { user, token };
};

// 2. Login User
export const loginUser = async ({ email, password }) => {
  if (!email || !password) {
    throw ApiError.badRequest("Email and password are required");
  }

  const cleanEmail = email.toLowerCase().trim();

  const result = await pool.query(
    `SELECT id, name, email, password, created_at
     FROM users
     WHERE email = $1`,
    [cleanEmail]
  );

  if (result.rows.length === 0) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const user = result.rows[0];

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const token = generateToken({ id: user.id, name: user.name, email: user.email });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at,
    },
    token,
  };
};

// 3. Forgot Password (generates reset_token and 15-minute expiry)
export const forgotPassword = async (email) => {
  if (!email) {
    throw ApiError.badRequest("Email is required");
  }

  const cleanEmail = email.toLowerCase().trim();
  const rawToken = crypto.randomBytes(20).toString("hex");

  const result = await pool.query(
    `UPDATE users
     SET reset_token = $1, reset_token_expires_at = NOW() + INTERVAL '15 minutes', updated_at = NOW()
     WHERE email = $2
     RETURNING id, email`,
    [rawToken, cleanEmail]
  );

  if (result.rows.length === 0) {
    throw ApiError.notFound("No account found with that email");
  }

  return {
    message: "Password reset token generated (valid for 15 minutes)",
    resetToken: rawToken,
  };
};

// 4. Reset Password using token
export const resetPassword = async ({ token, newPassword }) => {
  if (!token || !newPassword) {
    throw ApiError.badRequest("Token and new password are required");
  }

  if (newPassword.length < 6) {
    throw ApiError.badRequest("New password must be at least 6 characters long");
  }

  // Verify token is valid and not expired
  const result = await pool.query(
    `SELECT id FROM users
     WHERE reset_token = $1 AND reset_token_expires_at > NOW()`,
    [token]
  );

  if (result.rows.length === 0) {
    throw ApiError.badRequest("Invalid or expired reset token");
  }

  const userId = result.rows[0].id;
  const passwordHash = await bcrypt.hash(newPassword, 12);

  await pool.query(
    `UPDATE users
     SET password = $1, reset_token = NULL, reset_token_expires_at = NULL, updated_at = NOW()
     WHERE id = $2`,
    [passwordHash, userId]
  );

  return { message: "Password reset successful. Please log in with your new password." };
};

// 5. Get current profile
export const getMe = async (userId) => {
  const result = await pool.query(
    "SELECT id, name, email, created_at FROM users WHERE id = $1",
    [userId]
  );
  if (result.rows.length === 0) {
    throw ApiError.notFound("User not found");
  }
  return result.rows[0];
};
