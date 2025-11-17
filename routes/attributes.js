const express = require('express');
const Attribute = require('../models/Attribute');
const CategoryAttribute = require('../models/CategoryAttribute');
const ProductAttribute = require('../models/ProductAttribute');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/attributes
// @desc    Get all attributes
// @access  Public
router.get('/', async (req, res) => {
  try {
    const attributes = await Attribute.find().sort({ name: 1 });
    res.json(attributes);
  } catch (error) {
    console.error('Get attributes error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   GET /api/attributes/:id
// @desc    Get single attribute
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const attribute = await Attribute.findById(req.params.id);
    
    if (!attribute) {
      return res.status(404).json({ message: 'ویژگی یافت نشد' });
    }
    
    res.json(attribute);
  } catch (error) {
    console.error('Get attribute error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   POST /api/attributes
// @desc    Create attribute
// @access  Private/Admin
router.post('/', [auth, adminAuth], async (req, res) => {
  try {
    const attribute = new Attribute(req.body);
    await attribute.save();
    
    res.status(201).json({
      message: 'ویژگی با موفقیت ایجاد شد',
      attribute
    });
  } catch (error) {
    console.error('Create attribute error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   GET /api/attributes/category/:categoryId
// @desc    Get attributes for a category
// @access  Public
router.get('/category/:categoryId', async (req, res) => {
  try {
    const categoryAttributes = await CategoryAttribute.find({ 
      category: req.params.categoryId 
    })
    .populate('attribute')
    .sort({ order: 1 });
    
    // Return the full CategoryAttribute objects with populated attribute
    res.json(categoryAttributes);
  } catch (error) {
    console.error('Get category attributes error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   POST /api/attributes/assign
// @desc    Assign single attribute to category
// @access  Private/Admin
router.post('/assign', [auth, adminAuth], async (req, res) => {
  try {
    const { categoryId, attributeId } = req.body;
    
    const existing = await CategoryAttribute.findOne({
      category: categoryId,
      attribute: attributeId
    });
    
    if (existing) {
      return res.status(400).json({ message: 'این ویژگی قبلاً به این دسته اختصاص داده شده' });
    }
    
    const categoryAttribute = new CategoryAttribute({
      category: categoryId,
      attribute: attributeId
    });
    
    await categoryAttribute.save();
    
    res.json({ message: 'ویژگی با موفقیت به دسته اختصاص داده شد' });
  } catch (error) {
    console.error('Assign attribute error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   POST /api/attributes/remove
// @desc    Remove attribute from category
// @access  Private/Admin
router.post('/remove', [auth, adminAuth], async (req, res) => {
  try {
    const { categoryId, attributeId } = req.body;
    
    await CategoryAttribute.deleteOne({
      category: categoryId,
      attribute: attributeId
    });
    
    res.json({ message: 'ویژگی از دسته حذف شد' });
  } catch (error) {
    console.error('Remove attribute error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   PUT /api/attributes/:id
// @desc    Update attribute
// @access  Private/Admin
router.put('/:id', [auth, adminAuth], async (req, res) => {
  try {
    const attribute = await Attribute.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    if (!attribute) {
      return res.status(404).json({ message: 'ویژگی یافت نشد' });
    }
    
    res.json({
      message: 'ویژگی با موفقیت بروزرسانی شد',
      attribute
    });
  } catch (error) {
    console.error('Update attribute error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   DELETE /api/attributes/:id
// @desc    Delete attribute
// @access  Private/Admin
router.delete('/:id', [auth, adminAuth], async (req, res) => {
  try {
    const attribute = await Attribute.findById(req.params.id);
    
    if (!attribute) {
      return res.status(404).json({ message: 'ویژگی یافت نشد' });
    }
    
    // حذف ارتباطات با دسته بندی ها
    await CategoryAttribute.deleteMany({ attribute: req.params.id });
    
    // حذف ارتباطات با محصولات
    await ProductAttribute.deleteMany({ attribute: req.params.id });
    
    // حذف ویژگی
    await Attribute.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'ویژگی با موفقیت حذف شد' });
  } catch (error) {
    console.error('Delete attribute error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

module.exports = router;