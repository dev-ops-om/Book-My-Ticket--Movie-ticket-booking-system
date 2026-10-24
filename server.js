import dns from "node:dns";
// Resolve cloud SRV records reliably on local Wi-Fi networks
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import "dotenv/config";
import app from "./src/app.js";
import connectAuthDB from "./src/common/config/auth.db.js";
import pool, { initBookingDB } from "./src/common/config/booking.db.js";

const PORT = process.env.PORT || 8080;

const startServer = async () => {
  try {
    // 1. Connect MongoDB Atlas (Auth & Users)
    await connectAuthDB();

    // 2. Initialize Supabase PostgreSQL (Seats Table & Seed)
    await initBookingDB();

    // 3. Start Express server
    app.listen(PORT, () => {
      console.log(` Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
};

startServer();