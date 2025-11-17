const express = require('express');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users
// @access  Private/Admin
router.get('/', [auth, adminAuth], async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private/Admin
router.put('/:id', [auth, adminAuth], async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'کاربر یافت نشد' });
    }
    
    res.json({
      message: 'کاربر بروزرسانی شد',
      user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private/Admin
router.delete('/:id', [auth, adminAuth], async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'کاربر یافت نشد' });
    }
    
    res.json({ message: 'کاربر حذف شد' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// Likes
// @route   POST /api/users/me/likes/:productId
// @desc    Like a product
// @access  Private
router.post('/me/likes/:productId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) return res.status(404).json({ message: 'کاربر یافت نشد' })

    const productId = req.params.productId
    if (!user.likedProducts.some(id => String(id) === String(productId))) {
      user.likedProducts.push(productId)
      await user.save()
    }

    res.json({ message: 'محصول به پسندیده‌ها اضافه شد', likedProducts: user.likedProducts })
  } catch (error) {
    console.error('Like product error:', error)
    res.status(500).json({ message: 'خطا در سرور' })
  }
})

// @route   DELETE /api/users/me/likes/:productId
// @desc    Unlike a product
// @access  Private
router.delete('/me/likes/:productId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) return res.status(404).json({ message: 'کاربر یافت نشد' })

    const productId = req.params.productId
    user.likedProducts = user.likedProducts.filter(id => String(id) !== String(productId))
    await user.save()

    res.json({ message: 'محصول از پسندیده‌ها حذف شد', likedProducts: user.likedProducts })
  } catch (error) {
    console.error('Unlike product error:', error)
    res.status(500).json({ message: 'خطا در سرور' })
  }
})

// @route   GET /api/users/me/likes
// @desc    Get liked products (paginated)
// @access  Private
router.get('/me/likes', auth, async (req, res) => {
  try {
    const page = Number(req.query.page || 1)
    const limit = Number(req.query.limit || 10)

    const user = await User.findById(req.user._id).select('likedProducts')
    if (!user) return res.status(404).json({ message: 'کاربر یافت نشد' })

    const ids = (user.likedProducts || []).map(id => String(id))
    const total = ids.length

    if (total === 0) {
      return res.json({ products: [], pagination: { currentPage: page, totalPages: 0, totalProducts: 0, hasNext: false, hasPrev: false } })
    }

    const skip = (page - 1) * limit
    const Product = require('../models/Product')
    const products = await Product.find({ _id: { $in: ids } })
      .select('name price images category brand createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    res.json({
      products,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalProducts: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    })
  } catch (error) {
    console.error('Get liked products error:', error)
    res.status(500).json({ message: 'خطا در سرور' })
  }
})

module.exports = router;