const express = require('express');
const router = express.Router();
const Slider = require('../models/Slider');
const { auth, adminAuth } = require('../middleware/auth');

// Get all sliders (public endpoint)
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    let query = { isActive: true };
    
    // Filter by type if provided
    if (type && (type === 'main' || type === 'promo')) {
      query.type = type;
    }
    
    const sliders = await Slider.find(query).sort({ displayOrder: 1 });
    
    // Ensure all sliders have type field set to 'main' if missing (for backward compatibility)
    const slidersWithType = sliders.map(slider => {
      const sliderObj = slider.toObject();
      if (!sliderObj.type) {
        sliderObj.type = 'main';
      }
      return sliderObj;
    });
    
    res.json({ sliders: slidersWithType });
  } catch (error) {
    console.error('Error fetching sliders:', error);
    res.status(500).json({ message: 'خطا در دریافت اسلایدرها' });
  }
});

// Get all sliders for admin (admin only)
router.get('/admin/all', [auth, adminAuth], async (req, res) => {
  try {
    const { type } = req.query;
    let query = {};
    
    // Filter by type if provided
    if (type && (type === 'main' || type === 'promo')) {
      query.type = type;
    }
    
    const sliders = await Slider.find(query).sort({ displayOrder: 1 });
    
    // Ensure all sliders have type field set to 'main' if missing (for backward compatibility)
    const slidersWithType = sliders.map(slider => {
      const sliderObj = slider.toObject();
      if (!sliderObj.type) {
        sliderObj.type = 'main';
      }
      return sliderObj;
    });
    
    res.json({ sliders: slidersWithType });
  } catch (error) {
    console.error('Error fetching sliders for admin:', error);
    res.status(500).json({ message: 'خطا در دریافت اسلایدرها' });
  }
});

// Get single slider (public endpoint)
router.get('/:id', async (req, res) => {
  try {
    const slider = await Slider.findById(req.params.id);
    
    if (!slider) {
      return res.status(404).json({ message: 'اسلایدر یافت نشد' });
    }
    
    res.json({ slider });
  } catch (error) {
    console.error('Error fetching slider:', error);
    res.status(500).json({ message: 'خطا در دریافت اسلایدر' });
  }
});

// Create slider (admin only)
router.post('/', [auth, adminAuth], async (req, res) => {
  try {
    const sliderData = {
      ...req.body,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      displayOrder: req.body.displayOrder !== undefined ? req.body.displayOrder : 0
    };

    const slider = new Slider(sliderData);
    await slider.save();
    
    res.status(201).json({ 
      message: 'اسلایدر با موفقیت ایجاد شد',
      slider 
    });
  } catch (error) {
    console.error('Error creating slider:', error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: errors.join(', ') });
    }
    res.status(500).json({ message: 'خطا در ایجاد اسلایدر' });
  }
});

// Update slider (admin only)
router.put('/:id', [auth, adminAuth], async (req, res) => {
  try {
    const slider = await Slider.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!slider) {
      return res.status(404).json({ message: 'اسلایدر یافت نشد' });
    }
    
    res.json({ 
      message: 'اسلایدر با موفقیت به‌روزرسانی شد',
      slider 
    });
  } catch (error) {
    console.error('Error updating slider:', error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: errors.join(', ') });
    }
    res.status(500).json({ message: 'خطا در به‌روزرسانی اسلایدر' });
  }
});

// Delete slider (admin only)
router.delete('/:id', [auth, adminAuth], async (req, res) => {
  try {
    const slider = await Slider.findByIdAndDelete(req.params.id);
    
    if (!slider) {
      return res.status(404).json({ message: 'اسلایدر یافت نشد' });
    }
    
    res.json({ message: 'اسلایدر با موفقیت حذف شد' });
  } catch (error) {
    console.error('Error deleting slider:', error);
    res.status(500).json({ message: 'خطا در حذف اسلایدر' });
  }
});

// Reorder sliders (admin only)
router.put('/reorder', [auth, adminAuth], async (req, res) => {
  try {
    const { sliderIds } = req.body;
    
    if (!Array.isArray(sliderIds)) {
      return res.status(400).json({ message: 'لیست شناسه‌های اسلایدر نامعتبر است' });
    }

    // Update display order for each slider
    const updatePromises = sliderIds.map((id, index) => 
      Slider.findByIdAndUpdate(id, { displayOrder: index + 1 })
    );
    
    await Promise.all(updatePromises);
    
    res.json({ message: 'ترتیب اسلایدرها با موفقیت به‌روزرسانی شد' });
  } catch (error) {
    console.error('Error reordering sliders:', error);
    res.status(500).json({ message: 'خطا در تغییر ترتیب اسلایدرها' });
  }
});

module.exports = router;
