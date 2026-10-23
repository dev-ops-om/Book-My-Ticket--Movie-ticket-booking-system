import "dotenv/config";
import app from "./src/app.js";
import { initDB } from "./src/common/config/db.js";

const PORT = process.env.PORT || 8080;

const startServer = async () => {
  try {
    // 1. Initialize PostgreSQL tables and verify connection
    await initDB();

    // 2. Start HTTP listener
    app.listen(PORT, () => {
      console.log(`Server started successfully on port: ${PORT}`);
      console.log(`Open http://localhost:${PORT} in your browser to view seats`);
    });
  } catch (error) {
    console.error("Failed to start server due to database error:", error.message);
    process.exit(1);
  }
};

startServer();
