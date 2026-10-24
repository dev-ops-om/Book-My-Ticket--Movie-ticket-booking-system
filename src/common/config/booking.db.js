import pg from "pg";
import "dotenv/config";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 10,
});

export const initBookingDB = async () => {
  const client = await pool.connect();
  try {
    // 1. Create seats table
    await client.query(`
      CREATE TABLE IF NOT EXISTS seats (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        isbooked INT DEFAULT 0,
        booked_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 2. Seed 20 seats if empty
    await client.query(`
      INSERT INTO seats (name, isbooked)
      SELECT 'Seat ' || i, 0
      FROM generate_series(1, 20) AS i
      WHERE NOT EXISTS (SELECT 1 FROM seats);
    `);

    console.log(" PostgreSQL Seats Table & 20 Seats Seeded Successfully");
  } finally {
    client.release();
  }
};

export default pool;