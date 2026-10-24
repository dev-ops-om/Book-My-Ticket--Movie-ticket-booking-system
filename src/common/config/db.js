import dns from "node:dns";
import pg from "pg";
import "dotenv/config";

// Fallback DNS resolver to bypass local Wi-Fi DNS restrictions
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
    rejectUnauthorized: false,
  },
  max: 10,
});

// Initialize PostgreSQL schema matching ER diagram
export const initDB = async () => {
  const client = await pool.connect();
  try {
    // 1. Users table (ER diagram compliant)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        reset_token VARCHAR(255),
        reset_token_expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Clean up users columns to match ER diagram exactly
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
      ALTER TABLE users DROP COLUMN IF EXISTS password_hash;
    `);

    // 2. Movies table
    await client.query(`
      CREATE TABLE IF NOT EXISTS movies (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) UNIQUE NOT NULL,
        language VARCHAR(100) DEFAULT 'English',
        duration INT DEFAULT 150,
        poster_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 3. Seats table
    await client.query(`
      CREATE TABLE IF NOT EXISTS seats (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        isbooked INT DEFAULT 0,
        user_id INT REFERENCES users(id) ON DELETE SET NULL,
        booked_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Ensure seats columns exist (migrations)
    await client.query(`
      ALTER TABLE seats ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE seats ADD COLUMN IF NOT EXISTS booked_at TIMESTAMP;
      ALTER TABLE seats ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    `);

    // 4. Bookings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        seat_id INT REFERENCES seats(id) ON DELETE CASCADE,
        movie_id INT REFERENCES movies(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'booked',
        booked_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Ensure bookings columns exist (migrations)
    await client.query(`
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS movie_id INT REFERENCES movies(id) ON DELETE CASCADE;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'booked';
    `);

    // 5. Seed starter seats (20 seats) if table is empty
    await client.query(`
      INSERT INTO seats (name, isbooked)
      SELECT 'Seat ' || i, 0
      FROM generate_series(1, 20) AS i
      WHERE NOT EXISTS (SELECT 1 FROM seats);
    `);

    // 6. Seed mock movies if table is empty
    await client.query(`
      INSERT INTO movies (title, language, duration, poster_url)
      VALUES
        ('Interstellar', 'English', 169, 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format'),
        ('Inception', 'English', 148, 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format'),
        ('Dune: Part Two', 'English', 166, 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=600&auto=format'),
        ('The Dark Knight', 'English', 152, 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format')
      ON CONFLICT (title) DO NOTHING;
    `);

    console.log("PostgreSQL schema matching ER diagram initialized successfully.");
  } finally {
    client.release();
  }
};

export default pool;
