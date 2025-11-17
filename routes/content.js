const express = require('express');
const Content = require('../models/Content');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Admin routes (must come before public routes to avoid conflicts)
// @route   GET /api/content/admin/all
// @desc    Get all content for admin
// @access  Private/Admin
router.get('/admin/all', [auth, adminAuth], async (req, res) => {
  try {
    const content = await Content.find().sort({ createdAt: -1 });
    res.json({ content });
  } catch (error) {
    console.error('Get all content error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   GET /api/content/admin/:page
// @desc    Get content by page for admin
// @access  Private/Admin
router.get('/admin/:page', [auth, adminAuth], async (req, res) => {
  try {
    const content = await Content.findOne({ page: req.params.page });
    
    if (!content) {
      return res.status(404).json({ message: 'محتوای صفحه یافت نشد' });
    }
    
    res.json({ content });
  } catch (error) {
    console.error('Get content by page error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   POST /api/content/admin
// @desc    Create new content
// @access  Private/Admin
router.post('/admin', [auth, adminAuth], async (req, res) => {
  try {
    const content = new Content(req.body);
    await content.save();
    
    res.status(201).json({
      message: 'محتوا با موفقیت ایجاد شد',
      content
    });
  } catch (error) {
    console.error('Create content error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'محتوای این صفحه قبلاً وجود دارد' });
    }
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   PUT /api/content/admin/:page
// @desc    Update content
// @access  Private/Admin
router.put('/admin/:page', [auth, adminAuth], async (req, res) => {
  try {
    console.log('Updating content for page:', req.params.page);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const content = await Content.findOneAndUpdate(
      { page: req.params.page },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!content) {
      return res.status(404).json({ message: 'محتوای صفحه یافت نشد' });
    }
    
    res.json({
      message: 'محتوا با موفقیت بروزرسانی شد',
      content
    });
  } catch (error) {
    console.error('Update content error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'خطا در اعتبارسنجی داده‌ها',
        errors: errors
      });
    }
    
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   DELETE /api/content/admin/:page
// @desc    Delete content
// @access  Private/Admin
router.delete('/admin/:page', [auth, adminAuth], async (req, res) => {
  try {
    const content = await Content.findOneAndDelete({ page: req.params.page });
    
    if (!content) {
      return res.status(404).json({ message: 'محتوای صفحه یافت نشد' });
    }
    
    res.json({ message: 'محتوا با موفقیت حذف شد' });
  } catch (error) {
    console.error('Delete content error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// Public routes
// @route   GET /api/content
// @desc    Get all content
// @access  Public
router.get('/', async (req, res) => {
  try {
    const content = await Content.find({ isActive: true });
    res.json({ content });
  } catch (error) {
    console.error('Get content error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   GET /api/content/:page
// @desc    Get content by page
// @access  Public
router.get('/:page', async (req, res) => {
  try {
    const content = await Content.findOne({ page: req.params.page, isActive: true });
    
    if (!content) {
      return res.status(404).json({ message: 'محتوای صفحه یافت نشد' });
    }
    
    res.json({ content });
  } catch (error) {
    console.error('Get content by page error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

module.exports = router;
