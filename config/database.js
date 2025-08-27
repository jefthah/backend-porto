import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const URI = process.env.MONGODB_URI || process.env.MONGODB_URL;
const DB_NAME = process.env.MONGODB_DB || "portofolio";

// Cache koneksi untuk serverless
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export default async function connectDB() {
  // Return cached connection if exists
  if (cached.conn) {
    console.log("📦 Using cached database connection");
    return cached.conn;
  }

  if (!cached.promise) {
    if (!URI) {
      throw new Error("Missing MONGODB_URI or MONGODB_URL in environment variables");
    }

    const opts = {
      dbName: DB_NAME,
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    };

    console.log("🔄 Attempting to connect to MongoDB...");
    
    cached.promise = mongoose.connect(URI, opts).then((mongoose) => {
      return mongoose.connection;
    });
  }

  try {
    cached.conn = await cached.promise;
    console.log(`📊 Connected to database: ${cached.conn.name}`);
    return cached.conn;
  } catch (err) {
    cached.promise = null;
    console.error("❌ Database connection error:", err.message);
    throw err;
  }
}
