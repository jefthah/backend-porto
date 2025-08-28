// app.js

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

import connectDB from "./config/database.js";
import authRoutes from "./routes/authRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import contactRoutes from './routes/contactRoutes.js'; 
const app = express();

// Penting di balik proxy (Vercel/Cloudflare)
app.set("trust proxy", true);

// CORS configuration
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173,http://localhost:3000")
  .split(",")
  .map((s) => s.trim());

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // Postman/curl
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json());

// Static files (tidak akan work di Vercel - read only)
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use('/api/contact', contactRoutes); // Pindahkan ke sini, hapus baris 49-50

// Healthcheck
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.get("/", (_req, res) => res.json({ message: "API is running!" }));



// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ 
    success: false, 
    message: err.message || "Server error" 
  });
});

// PENTING: Untuk Vercel, jangan panggil app.listen()
// Vercel akan handle ini otomatis
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const startServer = async () => {
    try {
      await connectDB();
      console.log("✅ Database connected successfully!");
      
      const PORT = process.env.PORT || 5000;
      app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
      });
    } catch (error) {
      console.error("❌ Failed to connect to database:", error.message);
      process.exit(1);
    }
  };
  
  startServer();
}

export default app;