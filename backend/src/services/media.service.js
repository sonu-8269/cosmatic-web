import cloudinary, { isCloudinaryConfigured } from '../config/cloudinary.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

/**
 * Upload an in-memory buffer to Cloudinary using upload stream
 */
export const uploadBufferToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const { folder = 'cosmatics', resourceType = 'image' } = options;

    if (!isCloudinaryConfigured) {
      // In development fallback: generate a mock cloud URL so uploads succeed gracefully
      const mockId = `${folder}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      logger.info(`[MEDIA SIMULATOR] Simulated Cloudinary upload: ${mockId}`);
      return resolve({
        url: `https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=800&auto=format&fit=crop`,
        publicId: mockId,
        format: 'webp',
        resourceType,
      });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        transformation: [
          { quality: 'auto:good' },
          { fetch_format: 'auto' }, // Automatically serves WebP/AVIF depending on client
        ],
      },
      (error, result) => {
        if (error) {
          logger.error(`Cloudinary Upload Error: ${error.message}`);
          return reject(error);
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          resourceType: result.resource_type,
        });
      }
    );

    uploadStream.end(buffer);
  });
};

/**
 * Upload multiple file buffers in parallel
 */
export const uploadMultipleBuffers = async (files = [], options = {}) => {
  if (!files || files.length === 0) return [];
  const uploadPromises = files.map((file) =>
    uploadBufferToCloudinary(file.buffer, options)
  );
  return Promise.all(uploadPromises);
};

/**
 * Delete a media resource from Cloudinary by its publicId
 */
export const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  if (!publicId) return;

  if (!isCloudinaryConfigured) {
    logger.info(`[MEDIA SIMULATOR] Simulated media deletion for: ${publicId}`);
    return { result: 'ok' };
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return result;
  } catch (error) {
    logger.error(`Cloudinary delete error for ${publicId}: ${error.message}`);
    // Don't throw, allow parent delete operation to proceed
  }
};
