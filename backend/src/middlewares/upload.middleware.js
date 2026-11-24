import multer from 'multer';
import { ApiError } from '../utils/apiError.js';

// Memory storage to hold files as Buffers for direct streaming to Cloudinary
const storage = multer.memoryStorage();

// File filter to restrict uploads to safe images and videos
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  const allowedVideoTypes = ['video/mp4', 'video/webm'];

  if (allowedImageTypes.includes(file.mimetype) || allowedVideoTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        400,
        `Unsupported file type: ${file.mimetype}. Allowed types: JPEG, PNG, WEBP, MP4.`
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB per file limit
  },
  fileFilter,
});

/**
 * Middleware for single file upload (e.g. category image)
 */
export const uploadSingle = (fieldName) => {
  return (req, res, next) => {
    const uploadMiddleware = upload.single(fieldName);
    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new ApiError(400, `File size exceeds 10MB limit.`));
        }
        return next(new ApiError(400, err.message));
      } else if (err) {
        return next(err);
      }
      next();
    });
  };
};

/**
 * Middleware for multiple files upload (e.g. up to 8 product images)
 */
export const uploadMultiple = (fieldName, maxCount = 8) => {
  return (req, res, next) => {
    const uploadMiddleware = upload.array(fieldName, maxCount);
    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new ApiError(400, `One of the files exceeds the 10MB limit.`));
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return next(new ApiError(400, `Maximum ${maxCount} files allowed.`));
        }
        return next(new ApiError(400, err.message));
      } else if (err) {
        return next(err);
      }
      next();
    });
  };
};
