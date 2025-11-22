const multer = require('multer');
const cloudinary = require('../config/cloudinary');

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'https://api.tarasheh.net';

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 20 // Maximum 20 files
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('فقط فایل های تصویری (JPG, PNG, WEBP, GIF) مجاز هستند'), false);
    }
  },
});

const path = require('path');
const fs = require('fs');

// Local upload fallback
const uploadToLocal = async (buffer, folder = 'avatars', originalName = 'image.jpg') => {
  const uploadsDir = path.join(__dirname, '../uploads', folder);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}_${originalName}`;
  const filePath = path.join(uploadsDir, fileName);
  
  fs.writeFileSync(filePath, buffer);
  
  // Log local upload for monitoring
  console.log('📁 File saved to local storage:', {
    folder,
    fileName,
    size: buffer.length,
    path: filePath
  });
  
  return {
    secure_url: `${PUBLIC_BASE_URL}/uploads/${folder}/${fileName}`,
    public_id: fileName,
    storage_type: 'local', // Flag to indicate local storage
    warning: 'این فایل در سرور محلی ذخیره شده است. برای بهینه‌سازی بهتر، تنظیمات Cloudinary را فعال کنید.'
  };
};

// Retry mechanism for Cloudinary uploads
const uploadToCloudinaryWithRetry = async (buffer, folder, originalName, maxRetries = 2) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await new Promise((resolve, reject) => {
        const uploadOptions = {
          resource_type: 'image',
          folder: folder,
          quality: 'auto',
          fetch_format: 'auto'
        };

        // Different transformations for different folders
        if (folder === 'avatars') {
          uploadOptions.transformation = [
            { width: 300, height: 300, crop: 'fill' },
            { quality: 'auto' }
          ];
        } else if (folder === 'products') {
          uploadOptions.transformation = [
            { width: 800, height: 800, crop: 'limit' },
            { quality: 'auto' }
          ];
        }

        cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              // Check if error is retryable (network errors, timeouts)
              const isRetryable = error.http_code >= 500 || 
                                 error.http_code === 408 || 
                                 error.message?.includes('timeout') ||
                                 error.message?.includes('network');
              
              if (isRetryable && attempt < maxRetries) {
                console.log(`⚠️ Retryable error on attempt ${attempt}/${maxRetries}, retrying...`);
                reject(error); // Reject to trigger retry
              } else {
                reject(error); // Final attempt or non-retryable error
              }
            } else {
              resolve(result);
            }
          }
        ).end(buffer);
      });
    } catch (error) {
      if (attempt === maxRetries) {
        throw error; // Final attempt failed
      }
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
};

const uploadToCloudinary = async (buffer, folder = 'avatars', originalName = 'image.jpg') => {
  // Try Cloudinary first
  try {
    // Check if Cloudinary is configured
    const hasCloudName = !!process.env.CLOUDINARY_CLOUD_NAME;
    const hasApiKey = !!process.env.CLOUDINARY_API_KEY;
    const hasApiSecret = !!process.env.CLOUDINARY_API_SECRET;
    
    console.log('🔍 Cloudinary Configuration Check:', {
      CLOUDINARY_CLOUD_NAME: hasCloudName ? '✓ SET' : '✗ NOT SET',
      CLOUDINARY_API_KEY: hasApiKey ? '✓ SET' : '✗ NOT SET',
      CLOUDINARY_API_SECRET: hasApiSecret ? '✓ SET' : '✗ NOT SET',
      folder: folder,
      fileName: originalName
    });
    
    if (!hasCloudName || !hasApiKey || !hasApiSecret) {
      console.warn('⚠️ Cloudinary not fully configured, using local upload');
      console.log('💡 To use Cloudinary, add these to your .env file:');
      console.log('   CLOUDINARY_CLOUD_NAME=your_cloud_name');
      console.log('   CLOUDINARY_API_KEY=your_api_key');
      console.log('   CLOUDINARY_API_SECRET=your_api_secret');
      return uploadToLocal(buffer, folder, originalName);
    }

    console.log('☁️ Attempting Cloudinary upload...');
    
    try {
      const result = await uploadToCloudinaryWithRetry(buffer, folder, originalName);
      console.log('✅ Cloudinary upload successful:', result.secure_url);
      return {
        ...result,
        storage_type: 'cloudinary' // Flag to indicate Cloudinary storage
      };
    } catch (error) {
      console.error('❌ Cloudinary upload failed after retries:', error);
      console.error('   Error message:', error.message);
      console.error('   Error code:', error.http_code);
      console.warn('📁 Falling back to local upload');
      return uploadToLocal(buffer, folder, originalName);
    }
  } catch (error) {
    console.error('❌ Cloudinary exception, using local upload:', error);
    console.error('   Error details:', error.message);
    return uploadToLocal(buffer, folder, originalName);
  }
};

module.exports = { upload, uploadToCloudinary, uploadToLocal };