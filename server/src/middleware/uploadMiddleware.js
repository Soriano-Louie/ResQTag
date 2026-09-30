import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Cloudinary if credentials exist
const isCloudinaryConfigured = Boolean(
  config.cloudinary?.cloudName &&
  config.cloudinary?.apiKey &&
  config.cloudinary?.apiSecret &&
  config.cloudinary.cloudName !== 'your_cloudinary_cloud_name'
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true
  });
  console.log('☁️ Cloudinary storage initialized for receipt uploads.');
} else {
  console.log('📁 Using local disk storage fallback for receipt uploads.');
}

// Ensure local fallback directory exists
const localUploadDir = path.join(__dirname, '../../public/uploads/receipts');
if (!fs.existsSync(localUploadDir)) {
  fs.mkdirSync(localUploadDir, { recursive: true });
}

// Memory storage for inspecting and uploading buffers
const storage = multer.memoryStorage();

// File filter (accept images only)
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WebP image files are allowed for receipt uploads.'), false);
  }
};

// Base multer upload instance (max 5MB)
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

/**
 * Middleware that handles file upload and stores to Cloudinary (or local fallback)
 */
export function handleReceiptUpload(fieldName = 'receipt') {
  const multerSingle = upload.single(fieldName);

  return (req, res, next) => {
    multerSingle(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ message: err.message || 'File upload failed.' });
      }

      // If no file was provided in request, continue
      if (!req.file) {
        return next();
      }

      try {
        if (isCloudinaryConfigured) {
          // Upload memory buffer directly to Cloudinary
          const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                folder: 'resqtag/receipts',
                resource_type: 'image',
                transformation: [{ quality: 'auto', fetch_format: 'auto' }]
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            );
            uploadStream.end(req.file.buffer);
          });

          // Attach permanent Cloudinary HTTPS URL
          req.file.path = uploadResult.secure_url;
          req.file.filename = uploadResult.public_id;
          req.file.secure_url = uploadResult.secure_url;
        } else {
          // Local fallback: write buffer to public/uploads/receipts
          const ext = path.extname(req.file.originalname).toLowerCase() || '.png';
          const filename = `gcash-receipt-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
          const filePath = path.join(localUploadDir, filename);

          fs.writeFileSync(filePath, req.file.buffer);

          req.file.path = `/uploads/receipts/${filename}`;
          req.file.filename = filename;
          req.file.secure_url = `/uploads/receipts/${filename}`;
        }

        next();
      } catch (uploadErr) {
        console.error('Receipt upload processing error:', uploadErr);
        return res.status(500).json({
          message: 'Failed to process and store receipt image.',
          error: uploadErr.message
        });
      }
    });
  };
}
