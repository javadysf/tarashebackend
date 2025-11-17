const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const User = require('../models/User');
const { logActivity } = require('../utils/activityLogger');
const logger = require('../utils/logger');

/**
 * @route   POST /api/bulk/products/update
 * @desc    Bulk update products
 * @access  Private/Admin
 */
router.post('/products/update', [auth, adminAuth], async (req, res) => {
  try {
    const { productIds, updates } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ message: 'لیست شناسه محصولات الزامی است' });
    }

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'اطلاعات بروزرسانی الزامی است' });
    }

    // Validate allowed fields
    const allowedFields = ['price', 'originalPrice', 'stock', 'isActive', 'category', 'brand'];
    const updateFields = Object.keys(updates);
    const invalidFields = updateFields.filter(field => !allowedFields.includes(field));
    
    if (invalidFields.length > 0) {
      return res.status(400).json({ 
        message: `فیلدهای غیرمجاز: ${invalidFields.join(', ')}` 
      });
    }

    const result = await Product.updateMany(
      { _id: { $in: productIds } },
      { $set: updates }
    );

    // Log activity
    await logActivity({
      user: req.user,
      action: 'bulk_update',
      entity: 'product',
      description: `بروزرسانی دسته‌جمعی ${result.modifiedCount} محصول`,
      metadata: { 
        productIds, 
        updates, 
        modifiedCount: result.modifiedCount 
      },
      req
    });

    res.json({
      message: `${result.modifiedCount} محصول با موفقیت بروزرسانی شد`,
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount
    });
  } catch (error) {
    logger.error('Bulk update products error', { error: error.message });
    res.status(500).json({ message: 'خطا در بروزرسانی دسته‌جمعی محصولات' });
  }
});

/**
 * @route   POST /api/bulk/products/delete
 * @desc    Bulk delete products
 * @access  Private/Admin
 */
router.post('/products/delete', [auth, adminAuth], async (req, res) => {
  try {
    const { productIds } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ message: 'لیست شناسه محصولات الزامی است' });
    }

    const result = await Product.deleteMany({ _id: { $in: productIds } });

    // Log activity
    await logActivity({
      user: req.user,
      action: 'bulk_delete',
      entity: 'product',
      description: `حذف دسته‌جمعی ${result.deletedCount} محصول`,
      metadata: { 
        productIds, 
        deletedCount: result.deletedCount 
      },
      req
    });

    res.json({
      message: `${result.deletedCount} محصول با موفقیت حذف شد`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    logger.error('Bulk delete products error', { error: error.message });
    res.status(500).json({ message: 'خطا در حذف دسته‌جمعی محصولات' });
  }
});

/**
 * @route   POST /api/bulk/orders/update-status
 * @desc    Bulk update order status
 * @access  Private/Admin
 */
router.post('/orders/update-status', [auth, adminAuth], async (req, res) => {
  try {
    const { orderIds, status } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ message: 'لیست شناسه سفارشات الزامی است' });
    }

    if (!status || !['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'وضعیت معتبر نیست' });
    }

    const result = await Order.updateMany(
      { _id: { $in: orderIds } },
      { $set: { status } }
    );

    // Log activity
    await logActivity({
      user: req.user,
      action: 'bulk_update',
      entity: 'order',
      description: `بروزرسانی وضعیت ${result.modifiedCount} سفارش به ${status}`,
      metadata: { 
        orderIds, 
        status, 
        modifiedCount: result.modifiedCount 
      },
      req
    });

    res.json({
      message: `وضعیت ${result.modifiedCount} سفارش با موفقیت بروزرسانی شد`,
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount
    });
  } catch (error) {
    logger.error('Bulk update orders error', { error: error.message });
    res.status(500).json({ message: 'خطا در بروزرسانی دسته‌جمعی سفارشات' });
  }
});

/**
 * @route   POST /api/bulk/users/update
 * @desc    Bulk update users
 * @access  Private/Admin
 */
router.post('/users/update', [auth, adminAuth], async (req, res) => {
  try {
    const { userIds, updates } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'لیست شناسه کاربران الزامی است' });
    }

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'اطلاعات بروزرسانی الزامی است' });
    }

    // Validate allowed fields
    const allowedFields = ['isActive', 'role'];
    const updateFields = Object.keys(updates);
    const invalidFields = updateFields.filter(field => !allowedFields.includes(field));
    
    if (invalidFields.length > 0) {
      return res.status(400).json({ 
        message: `فیلدهای غیرمجاز: ${invalidFields.join(', ')}` 
      });
    }

    // Prevent changing admin role
    if (updates.role && updates.role !== 'admin') {
      const adminUsers = await User.find({ 
        _id: { $in: userIds }, 
        role: 'admin' 
      });
      if (adminUsers.length > 0) {
        return res.status(400).json({ 
          message: 'نمی‌توان نقش مدیر را تغییر داد' 
        });
      }
    }

    const result = await User.updateMany(
      { _id: { $in: userIds } },
      { $set: updates }
    );

    // Log activity
    await logActivity({
      user: req.user,
      action: 'bulk_update',
      entity: 'user',
      description: `بروزرسانی دسته‌جمعی ${result.modifiedCount} کاربر`,
      metadata: { 
        userIds, 
        updates, 
        modifiedCount: result.modifiedCount 
      },
      req
    });

    res.json({
      message: `${result.modifiedCount} کاربر با موفقیت بروزرسانی شد`,
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount
    });
  } catch (error) {
    logger.error('Bulk update users error', { error: error.message });
    res.status(500).json({ message: 'خطا در بروزرسانی دسته‌جمعی کاربران' });
  }
});

/**
 * @route   POST /api/bulk/categories/update
 * @desc    Bulk update categories
 * @access  Private/Admin
 */
router.post('/categories/update', [auth, adminAuth], async (req, res) => {
  try {
    const { categoryIds, updates } = req.body;

    if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
      return res.status(400).json({ message: 'لیست شناسه دسته‌بندی‌ها الزامی است' });
    }

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'اطلاعات بروزرسانی الزامی است' });
    }

    // Validate allowed fields
    const allowedFields = ['isActive', 'parent'];
    const updateFields = Object.keys(updates);
    const invalidFields = updateFields.filter(field => !allowedFields.includes(field));
    
    if (invalidFields.length > 0) {
      return res.status(400).json({ 
        message: `فیلدهای غیرمجاز: ${invalidFields.join(', ')}` 
      });
    }

    const result = await Category.updateMany(
      { _id: { $in: categoryIds } },
      { $set: updates }
    );

    // Log activity
    await logActivity({
      user: req.user,
      action: 'bulk_update',
      entity: 'category',
      description: `بروزرسانی دسته‌جمعی ${result.modifiedCount} دسته‌بندی`,
      metadata: { 
        categoryIds, 
        updates, 
        modifiedCount: result.modifiedCount 
      },
      req
    });

    res.json({
      message: `${result.modifiedCount} دسته‌بندی با موفقیت بروزرسانی شد`,
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount
    });
  } catch (error) {
    logger.error('Bulk update categories error', { error: error.message });
    res.status(500).json({ message: 'خطا در بروزرسانی دسته‌جمعی دسته‌بندی‌ها' });
  }
});

module.exports = router;

