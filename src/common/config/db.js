import dns from "node:dns";
import pg from "pg";
import "dotenv/config";

// DNS Fallback: Resolves ENOTFOUND when local Wi-Fi / ISP DNS servers
// fail to resolve Neon dynamic AWS cloud domains (*.aws.neon.tech)
const resolver = new dns.Resolver();
resolver.setServers(["8.8.8.8", "1.1.1.1"]);
const originalLookup = dns.lookup;
dns.lookup = (hostname, options, callback) => {
  if (typeof options === "function") {
    callback = options;
    options = {};
  }
  resolver.resolve4(hostname, (err, addresses) => {
    if (!err && addresses && addresses.length > 0) {
      if (options && options.all) {
        return callback(null, addresses.map((a) => ({ address: a, family: 4 })));
      }
      return callback(null, addresses[0], 4);
    }
    originalLookup(hostname, options, callback);
  });
};

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for cloud providers like Neon/Supabase/Render
  },
  max: 10,
});

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
