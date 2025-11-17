const express = require('express');
const multer = require('multer');
const { auth, adminAuth } = require('../middleware/auth');
const { upload: multerUpload, uploadToCloudinary } = require('../middleware/upload');

const router = express.Router();

// Upload image endpoint with Cloudinary support
router.post('/', [auth, adminAuth], multerUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'هیچ فایلی آپلود نشده است' });
    }

    const folder = req.body.folder || 'general';
    
    // Upload to Cloudinary (with local fallback)
    const result = await uploadToCloudinary(req.file.buffer, folder, req.file.originalname);

    res.json({
      message: 'تصویر با موفقیت آپلود شد',
      imageUrl: result.secure_url,
      public_id: result.public_id
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'خطا در آپلود تصویر' });
  }
});

module.exports = router;





















