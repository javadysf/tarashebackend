const cloudinary = require('cloudinary').v2;

// Load environment variables
require('dotenv').config();

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

// Configure Cloudinary only if all credentials are available
if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
  console.log('✅ Cloudinary configured successfully');
} else {
  console.warn('⚠️ Cloudinary credentials not found. Uploads will use local storage.');
  console.warn('   Missing:', {
    cloud_name: !cloudName,
    api_key: !apiKey,
    api_secret: !apiSecret
  });
}

module.exports = cloudinary;