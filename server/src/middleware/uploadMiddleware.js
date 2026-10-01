import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { isCloudinaryConfigured, uploadImageBuffer } from '../utils/cloudinaryStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
          const secureUrl = await uploadImageBuffer(req.file.buffer, {
            folder: 'resqtag/receipts'
          });

          if (secureUrl) {
            req.file.path = secureUrl;
            req.file.secure_url = secureUrl;
          } else {
            throw new Error('Cloudinary upload returned no URL.');
          }
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
