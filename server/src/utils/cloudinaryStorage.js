import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config/env.js';

const PLACEHOLDERS = [
  'your_cloudinary_cloud_name',
  'your_cloudinary_api_key',
  'your_cloudinary_api_secret'
];

export const isCloudinaryConfigured =
  Boolean(config.cloudinary?.cloudName && config.cloudinary?.apiKey && config.cloudinary?.apiSecret) &&
  !PLACEHOLDERS.some((placeholder) => Object.values(config.cloudinary).includes(placeholder));

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true
  });
  console.log('Cloudinary storage initialized.');
} else {
  console.warn('Cloudinary credentials missing - using local fallback where applicable.');
}

/**
 * Uploads an in-memory image buffer to Cloudinary and returns its public HTTPS URL.
 *
 * Required for anything embedded in an email body: Gmail, Outlook and most other
 * clients strip `data:` URIs from HTML, so inline base64 images render as a broken
 * placeholder. A public https:// URL is the only reliably supported way to show an
 * image in an email.
 *
 * @returns {Promise<string|null>} secure_url, or null when unavailable/failed.
 */
export async function uploadImageBuffer(buffer, { folder, filename }) {
  if (!isCloudinaryConfigured) {
    console.warn('⚠️  [Cloudinary] Skipping upload — storage is not configured.');
    return null;
  }

  try {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: filename,
          resource_type: 'image',
          overwrite: true,
          transformation: [{ quality: 'auto', fetch_format: 'auto' }]
        },
        (error, uploadResult) => {
          if (error) reject(error);
          else resolve(uploadResult);
        }
      );
      stream.end(buffer);
    });

    return result.secure_url;
  } catch (error) {
    console.error('❌ [Cloudinary] Upload failed:', error.message);
    return null;
  }
}
