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

// penting di balik proxy (Vercel/Cloudflare)
app.set("trust proxy", true);

/* =========================
   CORS (aman untuk Vercel)
   ========================= */
const STATIC_ALLOW = new Set([
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:5174",
]);

// FRONTEND_URLS = "https://3d-portfolio-spline.vercel.app,https://your-domain.com"
if (process.env.FRONTEND_URLS) {
  process.env.FRONTEND_URLS.split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((url) => STATIC_ALLOW.add(url));
}

function isAllowedOrigin(origin) {
  if (!origin) return true; // Postman/cURL
  try {
    const u = new URL(origin);
    // localhost selalu ok
    if (u.hostname === "localhost") return true;
    // allowlist eksplisit (harus match skema + host + port)
    if (STATIC_ALLOW.has(origin)) return true;
    // izinkan semua preview vercel (https://*.vercel.app)
    if (u.protocol === "https:" && u.hostname.endsWith(".vercel.app")) return true;
    return false;
  } catch {
    return false;
  }
}

const corsOptions = {
  origin: (origin, cb) => {
    const ok = isAllowedOrigin(origin);
    if (!ok) console.log("[CORS] Blocked origin:", origin);
    // jangan lempar error → kalau false, browser yang block; server tidak jadi 500
    return cb(null, ok);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

/* =========================
   Body parser
   ========================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   DB connect per request
   (skip untuk endpoint yang
   tidak butuh DB)
   ========================= */
const SKIP_DB_PATHS = new Set(["/", "/api", "/api/health", "/api/contact"]);
app.use(async (req, res, next) => {
  if (SKIP_DB_PATHS.has(req.path)) return next();
  try {
    await connectDB();
    return next();
  } catch (error) {
    console.error("Database connection error:", error);
    return res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message,
    });
  }
});

/* =========================
   Routes
   ========================= */
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/contact", contactRoutes); // tidak butuh DB

// Health check & root
app.get("/api/health", (_req, res) =>
  res.json({ success: true, message: "API healthy", ts: new Date().toISOString() })
);

app.get("/api", (_req, res) =>
  res.json({
    success: true,
    message: "3D Portfolio Backend API",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      projects: "/api/projects",
      contact: "/api/contact",
      health: "/api/health",
    },
  })
);

app.get("/", (_req, res) => res.redirect("/api"));

/* =========================
   404 & Error handler
   ========================= */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  });
});

app.use((err, _req, res, _next) => {
  console.error("Error details:", {
    message: err.message,
    stack: err.stack,
    name: err.name,
    code: err.code,
  });

  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File too large. Maximum size is 5MB",
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
    });
  }

  if (err.name === "MongoError" || err.name === "MongooseError") {
    return res.status(500).json({
      success: false,
      message: "Database error",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }

  return res
    .status(err.status || 500)
    .json({ success: false, message: err.message || "Internal server error" });
});

export default app;
