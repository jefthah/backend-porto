// api/index.js - Entry point untuk Vercel
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
  "https://your-frontend.vercel.app" // Ganti dengan URL frontend Anda
];

// Add dynamic origins from env
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
      // Allow requests with no origin (Postman, server-to-server)
      if (!origin) return cb(null, true);
      
      if (allowedOrigins.includes(origin)) {
        return cb(null, true);
      }
      
      // Log untuk debugging
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

// Database middleware - connect per request untuk serverless
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Database connection failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ 
    success: true,
    message: "API is healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development"
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

// Root redirect
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

// Error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  
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
      message: err.message
    });
  }
  
  // Validation errors
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: Object.values(err.errors).map(e => e.message)
    });
  }
  
  // MongoDB duplicate key error
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: "Duplicate field value"
    });
  }
  
  // Default error
  res.status(err.status || 500).json({ 
    success: false, 
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { 
      stack: err.stack,
      details: err
    })
  });
});

// Export untuk Vercel
export default app;