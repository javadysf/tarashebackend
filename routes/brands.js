const express = require('express');
const Brand = require('../models/Brand');
const { auth, adminAuth } = require('../middleware/auth');
const { upload, uploadToCloudinary } = require('../middleware/upload');
const { mockBrands } = require('../mock-data');

const router = express.Router();

// Get all brands
router.get('/', async (req, res) => {
  try {
    const brands = await Brand.find({ isActive: true }).sort({ name: 1 });
    res.json(brands);
  } catch (error) {
    console.error('Get brands error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// Create brand
router.post('/', [auth, adminAuth, upload.single('image')], async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'نام برند الزامی است' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'تصویر برند الزامی است' });
    }

    // Check if brand with same name already exists
    const existingBrand = await Brand.findOne({ 
      name: name.trim(),
      isActive: true 
    });
    
    if (existingBrand) {
      return res.status(400).json({ 
        message: `برند "${name.trim()}" قبلاً ثبت شده است` 
      });
    }

    // Upload image to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, 'brands', req.file.originalname);

    const brand = new Brand({
      name: name.trim(),
      description: description?.trim() || '',
      image: {
        url: result.secure_url,
        alt: name.trim(),
        public_id: result.public_id,
        storage_type: result.storage_type || 'unknown'
      }
    });

    await brand.save();
    
    const response = { 
      message: 'برند با موفقیت ایجاد شد', 
      brand 
    };

    // Add warning if saved locally
    if (result.storage_type === 'local') {
      response.warning = result.warning || 'تصویر برند در سرور محلی ذخیره شده است.';
      console.warn('⚠️ Brand image saved to local storage');
    }

    res.status(201).json(response);
  } catch (error) {
    console.error('Create brand error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: `برند "${req.body.name}" قبلاً ثبت شده است` 
      });
    }
    res.status(500).json({ message: 'خطا در ایجاد برند' });
  }
});

// Update brand
router.put('/:id', [auth, adminAuth, upload.single('image')], async (req, res) => {
  try {
    const { name, description } = req.body;
    const brand = await Brand.findById(req.params.id);

    if (!brand) {
      return res.status(404).json({ message: 'برند یافت نشد' });
    }

    // Check if name is being changed and if it conflicts with another brand
    if (name && name.trim() !== brand.name) {
      const existingBrand = await Brand.findOne({ 
        name: name.trim(),
        isActive: true,
        _id: { $ne: req.params.id } // Exclude current brand
      });
      
      if (existingBrand) {
        return res.status(400).json({ 
          message: `برند "${name.trim()}" قبلاً ثبت شده است` 
        });
      }
    }

    let imageData = brand.image;

    if (req.file) {
      // Upload new image
      const result = await uploadToCloudinary(req.file.buffer, 'brands', req.file.originalname);
      imageData = {
        storage_type: result.storage_type || 'unknown',
        url: result.secure_url,
        alt: name?.trim() || brand.name,
        public_id: result.public_id
      };
    }

    const updateData = {
      ...(name && { name: name.trim() }),
      ...(description !== undefined && { description: description?.trim() || '' }),
      image: imageData
    };

    const updatedBrand = await Brand.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    const response = { 
      message: 'برند با موفقیت بهروزرسانی شد', 
      brand: updatedBrand 
    };

    // Add warning if image was saved locally
    if (req.file && imageData && imageData.storage_type === 'local') {
      response.warning = 'تصویر برند در سرور محلی ذخیره شده است. برای بهینه‌سازی بهتر، تنظیمات Cloudinary را فعال کنید.';
      console.warn('⚠️ Brand image saved to local storage');
    }

    res.json(response);
  } catch (error) {
    console.error('Update brand error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: `برند "${req.body.name}" قبلاً ثبت شده است` 
      });
    }
    res.status(500).json({ message: 'خطا در بهروزرسانی برند' });
  }
});

// Delete brand
router.delete('/:id', [auth, adminAuth], async (req, res) => {
  try {
    const brand = await Brand.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!brand) {
      return res.status(404).json({ message: 'برند یافت نشد' });
    }

    res.json({ message: 'برند با موفقیت حذف شد' });
  } catch (error) {
    console.error('Delete brand error:', error);
    res.status(500).json({ message: 'خطا در حذف برند' });
  }
});

module.exports = router;