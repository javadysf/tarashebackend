const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { auth, adminAuth } = require('../middleware/auth');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { logActivity } = require('../utils/activityLogger');

const router = express.Router();

const cartItemValidators = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('لیست آیتم‌های سبد خرید الزامی است'),
  body('items.*.id')
    .optional({ nullable: true })
    .isMongoId()
    .withMessage('شناسه محصول معتبر نیست'),
  body('items.*.product')
    .optional({ nullable: true })
    .isMongoId()
    .withMessage('شناسه محصول معتبر نیست'),
  body('items.*')
    .custom((item) => {
      if (!item) {
        throw new Error('ساختار آیتم سبد خرید معتبر نیست');
      }
      if (!item.id && !item.product) {
        throw new Error('شناسه محصول هر آیتم الزامی است');
      }
      return true;
    }),
  body('items.*.quantity')
    .isInt({ min: 1, max: 100 })
    .withMessage('تعداد هر آیتم باید بین 1 تا 100 باشد')
    .toInt(),
  body('items.*.accessories')
    .optional({ nullable: true })
    .isArray()
    .withMessage('متعلقات محصول باید به صورت آرایه ارسال شود'),
  body('items.*.accessories.*.accessoryId')
    .optional({ nullable: true })
    .isMongoId()
    .withMessage('شناسه متعلق معتبر نیست'),
  body('items.*.accessories.*.quantity')
    .optional({ nullable: true })
    .isInt({ min: 1, max: 100 })
    .withMessage('تعداد متعلق باید بین 1 تا 100 باشد')
    .toInt(),
];

const shippingAddressValidators = [
  body('shippingAddress')
    .exists()
    .withMessage('اطلاعات ارسال سفارش الزامی است')
    .custom((address) => typeof address === 'object' && address !== null)
    .withMessage('ساختار آدرس ارسال معتبر نیست'),
  body('shippingAddress.name')
    .trim()
    .notEmpty()
    .withMessage('نام گیرنده الزامی است')
    .isLength({ min: 2, max: 100 })
    .withMessage('نام گیرنده باید بین 2 تا 100 کاراکتر باشد'),
  body('shippingAddress.phone')
    .trim()
    .matches(/^09\d{9}$/)
    .withMessage('شماره تماس گیرنده باید به فرمت 09123456789 باشد'),
  body('shippingAddress.street')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('آدرس باید حداقل 5 کاراکتر باشد'),
  body('shippingAddress.city')
    .trim()
    .notEmpty()
    .withMessage('شهر الزامی است'),
  body('shippingAddress.state')
    .trim()
    .notEmpty()
    .withMessage('استان الزامی است'),
  body('shippingAddress.postalCode')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^\d{10}$/)
    .withMessage('کد پستی باید 10 رقم باشد'),
];

const createOrderValidators = [
  ...cartItemValidators,
  ...shippingAddressValidators,
  body('paymentMethod')
    .trim()
    .notEmpty()
    .withMessage('روش پرداخت الزامی است')
    .isIn(['online', 'cod'])
    .withMessage('روش پرداخت معتبر نیست'),
];

// @route   POST /api/orders/validate-cart
// @desc    Validate cart items and return correct prices
// @access  Public
router.post('/validate-cart', validate(cartItemValidators), async (req, res) => {
  try {
    const { items } = req.body;
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ message: 'آیتمهای سبد خرید ارسال نشده' });
    }

    const validatedItems = [];
    let totalPrice = 0;

    for (const item of items) {
      const product = await Product.findById(item.id).select('name price originalPrice stock images');
      
      if (!product) {
        return res.status(400).json({ message: `محصول ${item.name} یافت نشد` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `موجودی ${product.name} کافی نیست` });
      }

      const validatedItem = {
        id: product._id,
        name: product.name,
        price: product.price,
        originalPrice: product.originalPrice,
        quantity: Math.max(1, Math.min(item.quantity, product.stock)),
        image: product.images[0]?.url || '',
        accessories: []
      };

      // Validate accessories if any
      if (item.accessories && item.accessories.length > 0) {
        for (const acc of item.accessories) {
          const accessory = await Product.findById(acc.accessoryId).select('name price stock');
          if (accessory && accessory.stock >= acc.quantity) {
            validatedItem.accessories.push({
              accessoryId: accessory._id,
              name: accessory.name,
              price: accessory.price,
              originalPrice: accessory.price,
              discountedPrice: accessory.price,
              quantity: acc.quantity
            });
          }
        }
      }

      validatedItems.push(validatedItem);
      totalPrice += validatedItem.price * validatedItem.quantity;
      totalPrice += validatedItem.accessories.reduce((sum, acc) => sum + (acc.discountedPrice * acc.quantity), 0);
    }

    res.json({
      items: validatedItems,
      totalPrice,
      isValid: true
    });
  } catch (error) {
    console.error('Validate cart error:', error);
    res.status(500).json({ message: 'خطا در اعتبارسنجی سبد خرید' });
  }
});

// @route   POST /api/orders
// @desc    Create order
// @access  Private
router.post('/', auth, validate(createOrderValidators), async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod } = req.body;
    
    // Server-side validation of cart items
    let totalAmount = 0;
    const validatedItems = [];
    
    for (const item of items) {
      const product = await Product.findById(item.id || item.product);
      if (!product) {
        return res.status(404).json({ message: `محصول ${item.name} یافت نشد` });
      }
      
      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          message: `محصول ${product.name} به اندازه کافی موجود نیست. موجودی: ${product.stock}` 
        });
      }
      
      // Use server-side price, not client-side
      const validatedItem = {
        product: product._id,
        name: product.name,
        price: product.price, // Always use server price
        quantity: item.quantity,
        image: product.images[0]?.url || ''
      };
      
      validatedItems.push(validatedItem);
      totalAmount += product.price * item.quantity;
      
      // Update stock
      await Product.findByIdAndUpdate(product._id, {
        $inc: { stock: -item.quantity }
      });
    }
    
    const order = new Order({
      user: req.user._id,
      items: validatedItems,
      shippingAddress,
      paymentMethod,
      totalAmount, // Server-calculated total
      status: 'pending'
    });
    
    await order.save();
    
    const populatedOrder = await Order.findById(order._id)
      .populate('user', 'name lastName email phone')
      .populate('items.product', 'name price images');
    
    res.status(201).json({
      message: 'سفارش با موفقیت ثبت شد',
      order: populatedOrder
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   GET /api/orders
// @desc    Get user orders or all orders (admin)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    const {
      userId,
      status,
      dateFrom,
      dateTo,
      minAmount,
      maxAmount,
      search,
      page = 1,
      limit = 10,
      sort = 'createdAt-desc'
    } = req.query;

    // Access control / user filter
    if (req.user.role !== 'admin') {
      query.user = req.user._id;
    } else if (userId) {
      query.user = userId;
    }

    // Status filter
    if (status) {
      query.status = status;
    }

    // Date range
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // Amount range
    if (minAmount || maxAmount) {
      query.totalAmount = {};
      if (minAmount) query.totalAmount.$gte = Number(minAmount);
      if (maxAmount) query.totalAmount.$lte = Number(maxAmount);
    }

    // Search by user name/email (admin only)
    if (search && req.user.role === 'admin') {
      const User = require('../models/User');
      const matchingUsers = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      const userIds = matchingUsers.map(u => u._id);
      if (userIds.length > 0) {
        query.$or = [{ user: { $in: userIds } }];
      }
    }

    // Sorting
    let sortOption = { createdAt: -1 };
    switch (sort) {
      case 'createdAt-asc':
        sortOption = { createdAt: 1 }; break;
      case 'amount-asc':
        sortOption = { totalAmount: 1 }; break;
      case 'amount-desc':
        sortOption = { totalAmount: -1 }; break;
      case 'status':
        sortOption = { status: 1, createdAt: -1 }; break;
      default:
        sortOption = { createdAt: -1 };
    }

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('user', 'name lastName email phone')
        .populate('items.product', 'name price images')
        .sort(sortOption)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Order.countDocuments(query)
    ]);

    res.json({
      orders,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalOrders: total,
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   GET /api/orders/:id
// @desc    Get single order
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    let query = { _id: req.params.id };
    
    // If not admin, only show user's order
    if (req.user.role !== 'admin') {
      query.user = req.user._id;
    }
    
    const order = await Order.findOne(query)
      .populate('user', 'name lastName email phone address postalCode')
      .populate('items.product', 'name price images');
    
    if (!order) {
      return res.status(404).json({ message: 'سفارش یافت نشد' });
    }
    
    res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order status
// @access  Private/Admin
router.put('/:id/status', [auth, adminAuth], async (req, res) => {
  try {
    const { status } = req.body;
    
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('user', 'name lastName email phone address postalCode')
     .populate('items.product', 'name price images');
    
    if (!order) {
      return res.status(404).json({ message: 'سفارش یافت نشد' });
    }
    
    // Log activity
    await logActivity({
      user: req.user,
      action: 'order_status_change',
      entity: 'order',
      entityId: order._id,
      description: `تغییر وضعیت سفارش ${order._id} به ${status}`,
      metadata: { orderId: order._id, oldStatus: order.status, newStatus: status },
      req
    });
    
    res.json({
      message: 'وضعیت سفارش بروزرسانی شد',
      order
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   GET /api/orders/stats/sales
// @desc    Get sales statistics for admin
// @access  Private/Admin
router.get('/stats/sales', [auth, adminAuth], async (req, res) => {
  try {
    const { period = 'week' } = req.query; // week, month, year
    
    // Calculate date range
    const now = new Date();
    let startDate;
    switch (period) {
      case 'week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    }
    
    // Get all orders in the period
    const orders = await Order.find({
      createdAt: { $gte: startDate },
      status: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] }
    })
    .populate('user', 'name lastName email phone')
    .populate('items.product', 'name')
    .sort({ createdAt: -1 });
    
    // Calculate statistics
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // Top products
    const productMap = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        if (productMap[item.product._id]) {
          productMap[item.product._id].quantity += item.quantity;
          productMap[item.product._id].revenue += item.price * item.quantity;
        } else {
          productMap[item.product._id] = {
            name: item.product.name,
            quantity: item.quantity,
            revenue: item.price * item.quantity
          };
        }
      });
    });
    
    const topProducts = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
    
    // Top customers
    const customerMap = {};
    orders.forEach(order => {
      if (customerMap[order.user._id]) {
        customerMap[order.user._id].orders += 1;
        customerMap[order.user._id].total += order.totalAmount;
      } else {
        customerMap[order.user._id] = {
          name: order.user.name,
          email: order.user.email,
          orders: 1,
          total: order.totalAmount
        };
      }
    });
    
    const topCustomers = Object.values(customerMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
    
    // Daily breakdown for charts
    const dailyBreakdown = {};
    orders.forEach(order => {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      if (dailyBreakdown[dateKey]) {
        dailyBreakdown[dateKey].revenue += order.totalAmount;
        dailyBreakdown[dateKey].orders += 1;
      } else {
        dailyBreakdown[dateKey] = {
          date: dateKey,
          revenue: order.totalAmount,
          orders: 1
        };
      }
    });
    
    const dailyChart = Object.values(dailyBreakdown)
      .sort((a, b) => a.date.localeCompare(b.date));
    
    res.json({
      period,
      stats: {
        totalRevenue,
        totalOrders,
        averageOrderValue
      },
      topProducts,
      topCustomers,
      dailyChart,
      recentOrders: orders.slice(0, 20).map(order => ({
        id: order._id,
        date: order.createdAt,
        customer: order.user.name,
        email: order.user.email,
        items: order.items.map(item => ({
          name: item.product.name,
          quantity: item.quantity,
          price: item.price
        })),
        total: order.totalAmount,
        status: order.status
      }))
    });
  } catch (error) {
    console.error('Sales stats error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

module.exports = router;