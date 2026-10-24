import dns from "node:dns";
import mongoose from "mongoose";
// Resolve Atlas SRV records reliably across all Wi-Fi networks
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const connectAuthDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(` MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  }
};

export default connectAuthDB;