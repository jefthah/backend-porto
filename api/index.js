// api/index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "../config/database.js";
import authRoutes from "../routes/authRoutes.js";
import projectRoutes from "../routes/projectRoutes.js";
import contactRoutes from "../routes/contactRoutes.js";

dotenv.config();

const app = express();

app.set("trust proxy", true);

// CORS configuration
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:5174",
  "http://localhost:4173", // Vite preview
  "https://3d-portfolio-spline.vercel.app", // Your production frontend
  "https://portfolio-spline.vercel.app", // Alternative if you change domain
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

// Log allowed origins for debugging
console.log("Allowed Origins:", allowedOrigins);

// Configure CORS
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or Postman)
      if (!origin) return callback(null, true);
      
      // Check if the origin is allowed
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Log blocked origin for debugging
      console.log("Blocked CORS origin:", origin);
      return callback(new Error(`CORS Error: Origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type", 
      "Authorization", 
      "X-Requested-With",
      "Accept",
      "Origin"
    ],
    exposedHeaders: ["X-Total-Count", "X-Page", "X-Per-Page"],
    maxAge: 86400, // 24 hours
    optionsSuccessStatus: 200 // Some legacy browsers choke on 204
  })
);

// Add headers middleware for additional CORS support
app.use((req, res, next) => {
  // Get origin from request
  const origin = req.headers.origin;
  
  // If origin is in allowed list, set headers
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.sendStatus(200);
  }
  
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CRITICAL: Connect database BEFORE routes!
// For serverless, connect per request
app.use(async (req, res, next) => {
  // Skip for health check and static endpoints
  const skipPaths = ['/api/health', '/api', '/', '/api/contact'];
  if (skipPaths.includes(req.path)) {
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
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error"
    });
  }
});

// API Routes (AFTER database middleware)
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/contact", contactRoutes);

// Health check (no DB needed)
app.get("/api/health", (req, res) => {
  res.json({ 
    success: true,
    message: "API is healthy",
    timestamp: new Date().toISOString(),
    cors: {
      allowedOrigins: process.env.NODE_ENV === "development" ? allowedOrigins : "configured"
    }
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
      health: "/api/health",
      contact: "/api/contact"
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
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    name: err.name,
    code: err.code
  });
  
  // CORS errors
  if (err.message && err.message.includes("CORS")) {
    return res.status(403).json({
      success: false,
      message: "CORS policy violation",
      error: process.env.NODE_ENV === "development" ? err.message : "Access denied"
    });
  }
  
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