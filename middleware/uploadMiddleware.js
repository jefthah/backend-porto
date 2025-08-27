// middleware/uploadMiddleware.js
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// HAPUS INI - Jangan buat folder uploads!
// import fs from 'fs';
// import path from 'path';
// const uploadDir = path.join(process.cwd(), 'uploads');
// if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Konfigurasi Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Setup storage untuk Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'portfolio-projects',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [{ width: 1200, height: 630, crop: 'limit' }],
    public_id: (req, file) => {
      const name = `project-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      return name;
    },
  },
});

export const upload = multer({ 
  storage, // Pakai Cloudinary storage, BUKAN local!
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP and GIF are allowed'));
    }
  }
});

export const deleteFromCloudinary = async (imageUrl) => {
  try {
    if (!imageUrl || !imageUrl.includes('cloudinary')) return;
    
    const urlParts = imageUrl.split('/');
    const filename = urlParts[urlParts.length - 1];
    const publicId = `portfolio-projects/${filename.split('.')[0]}`;
    
    await cloudinary.uploader.destroy(publicId);
    console.log('Image deleted from Cloudinary:', publicId);
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
  }
};