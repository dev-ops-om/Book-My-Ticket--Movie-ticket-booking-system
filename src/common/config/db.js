import pg from "pg";
import "dotenv/config";

const isProduction = process.env.NODE_ENV === "production";
const connectionString = process.env.DATABASE_URL;

const poolConfig = connectionString
  ? {
      connectionString,
      ssl: connectionString.includes("sslmode=require") || isProduction
        ? { rejectUnauthorized: false }
        : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    }
  : {
      host: process.env.PGHOST || "localhost",
      port: Number(process.env.PGPORT) || 5432,
      user: process.env.PGUSER || "postgres",
      password: process.env.PGPASSWORD || "postgres",
      database: process.env.PGDATABASE || "book_my_ticket",
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

const pool = new pg.Pool(poolConfig);

// Automatically initialize tables and seed starter seats on startup
export const initDB = async () => {
  const client = await pool.connect();
  try {
    // 1. Seats table (from starter code)
    await client.query(`
      CREATE TABLE IF NOT EXISTS seats (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        isbooked INT DEFAULT 0
      );
    `);

    // 2. Seed 20 seats if table is empty
    await client.query(`
      INSERT INTO seats (isbooked)
      SELECT 0
      FROM generate_series(1, 20)
      WHERE NOT EXISTS (SELECT 1 FROM seats);
    `);

    // 3. Users table (for authentication)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role VARCHAR(50) DEFAULT 'customer',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 4. Bookings table (associating logged-in users with booked seats)
    await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        seat_id INTEGER NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
        movie_title VARCHAR(255) DEFAULT 'Interstellar (Mock)',
        booked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    console.log("PostgreSQL database tables verified and initialized.");
  } finally {
    client.release();
  }
};

export default pool;
