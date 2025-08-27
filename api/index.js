// api/index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "../config/database.js";
import authRoutes from "../routes/authRoutes.js";
import projectRoutes from "../routes/projectRoutes.js";

dotenv.config();

const app = express();

app.set("trust proxy", true);

// CORS configuration
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:5174"
];

// Add from environment variable
if (process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL.split(",").forEach(url => {
    const trimmed = url.trim();
    if (trimmed && !allowedOrigins.includes(trimmed)) {
      allowedOrigins.push(trimmed);
    }
  });
}

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) {
        return cb(null, true);
      }
      console.log("Blocked CORS origin:", origin);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CRITICAL: Connect database BEFORE routes!
// For serverless, connect per request
app.use(async (req, res, next) => {
  // Skip for health check
  if (req.path === '/api/health' || req.path === '/api' || req.path === '/') {
    return next();
  }
  
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Database connection failed",
      error: error.message
    });
  }
});

// API Routes (AFTER database middleware)
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);

// Health check (no DB needed)
app.get("/api/health", (req, res) => {
  res.json({ 
    success: true,
    message: "API is healthy",
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get("/api", (req, res) => {
  res.json({ 
    success: true,
    message: "3D Portfolio Backend API", 
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      projects: "/api/projects",
      health: "/api/health"
    }
  });
});

app.get("/", (req, res) => {
  res.redirect("/api");
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: `Route ${req.method} ${req.path} not found` 
  });
});

// Error handler - IMPORTANT for debugging
app.use((err, req, res, next) => {
  console.error("Error details:", {
    message: err.message,
    stack: err.stack,
    name: err.name,
    code: err.code
  });
  
  // Multer errors
  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File too large. Maximum size is 5MB"
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`
    });
  }
  
  // MongoDB errors
  if (err.name === "MongoError" || err.name === "MongooseError") {
    return res.status(500).json({
      success: false,
      message: "Database error",
      error: process.env.NODE_ENV === "development" ? err.message : undefined
    });
  }
  
  // Default error
  res.status(err.status || 500).json({ 
    success: false, 
    message: err.message || "Internal server error"
  });
});

export default app;