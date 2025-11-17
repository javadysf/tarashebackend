const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { logActivity } = require('../utils/activityLogger');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

// Helper function to get type label
function getTypeLabel(type) {
  const labels = {
    orders: 'Orders',
    products: 'Products',
    users: 'Users',
    financial: 'Financial'
  };
  return labels[type] || type;
}

/**
 * @route   GET /api/reports/financial
 * @desc    Get advanced financial reports
 * @access  Private/Admin
 */
router.get('/financial', [auth, adminAuth], async (req, res) => {
  try {
    const { 
      period = 'month', 
      startDate, 
      endDate,
      groupBy = 'day' // day, week, month
    } = req.query;

    // Calculate date range
    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      const now = new Date();
      switch (period) {
        case 'week':
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
          end = now;
          break;
        case 'month':
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = now;
          break;
        case 'year':
          start = new Date(now.getFullYear(), 0, 1);
          end = now;
          break;
        default:
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = now;
      }
    }

    // Get orders in date range
    // Include all orders with payment status 'paid' or orders that are confirmed/processing/shipped/delivered
    // (some orders might not have paymentStatus set but are still valid)
    const orders = await Order.find({
      createdAt: { $gte: start, $lte: end },
      $or: [
        { paymentStatus: 'paid' },
        { paymentStatus: { $exists: false }, status: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] } },
        { status: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] } }
      ]
    })
    .populate('user', 'name email')
    .populate('items.product', 'name category')
    .sort({ createdAt: 1 });
    
    logger.info('Financial report query', { 
      start: start.toISOString(), 
      end: end.toISOString(), 
      ordersCount: orders.length 
    });

    // Calculate financial metrics
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // Revenue by status
    const revenueByStatus = {};
    orders.forEach(order => {
      if (!revenueByStatus[order.status]) {
        revenueByStatus[order.status] = { count: 0, revenue: 0 };
      }
      revenueByStatus[order.status].count++;
      revenueByStatus[order.status].revenue += order.totalAmount;
    });

    // Revenue by payment method
    const revenueByPayment = {};
    orders.forEach(order => {
      const method = order.paymentMethod || 'online';
      if (!revenueByPayment[method]) {
        revenueByPayment[method] = { count: 0, revenue: 0 };
      }
      revenueByPayment[method].count++;
      revenueByPayment[method].revenue += order.totalAmount;
    });

    // Group by time period
    const revenueByPeriod = {};
    orders.forEach(order => {
      let key;
      const date = new Date(order.createdAt);
      
      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const week = getWeekNumber(date);
        key = `${date.getFullYear()}-W${week}`;
      } else if (groupBy === 'month') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
      
      if (!revenueByPeriod[key]) {
        revenueByPeriod[key] = { date: key, revenue: 0, orders: 0 };
      }
      revenueByPeriod[key].revenue += order.totalAmount;
      revenueByPeriod[key].orders++;
    });

    // Top customers
    const customerMap = {};
    orders.forEach(order => {
      if (order.user && order.user._id) {
        const userId = order.user._id.toString();
        if (!customerMap[userId]) {
          customerMap[userId] = {
            userId,
            name: order.user.name || 'نامشخص',
            email: order.user.email || '',
            orders: 0,
            revenue: 0
          };
        }
        customerMap[userId].orders++;
        customerMap[userId].revenue += order.totalAmount || 0;
      }
    });
    const topCustomers = Object.values(customerMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Top products by revenue
    const productMap = {};
    orders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const productId = item.product?._id?.toString() || item.product?.toString() || 'unknown';
          const productName = item.product?.name || item.name || 'Unknown';
          const itemPrice = item.price || 0;
          const itemQuantity = item.quantity || 0;
          
          if (!productMap[productId]) {
            productMap[productId] = {
              productId,
              name: productName,
              quantity: 0,
              revenue: 0
            };
          }
          productMap[productId].quantity += itemQuantity;
          productMap[productId].revenue += itemPrice * itemQuantity;
        });
      }
    });
    const topProducts = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Log activity
    await logActivity({
      user: req.user,
      action: 'view',
      entity: 'system',
      description: 'مشاهده گزارش مالی',
      metadata: { period, startDate: start, endDate: end },
      req
    });

    // Get recent orders for the report
    const recentOrders = await Order.find({
      createdAt: { $gte: start, $lte: end }
    })
    .populate('user', 'name email')
    .populate('items.product', 'name')
    .sort({ createdAt: -1 })
    .limit(10)
    .select('_id totalAmount status createdAt items user');

    const recentOrdersFormatted = recentOrders.map(order => ({
      id: order._id.toString(),
      date: order.createdAt.toISOString(),
      customer: order.user?.name || 'نامشخص',
      email: order.user?.email || '',
      items: order.items.map((item) => ({
        quantity: item.quantity,
        name: item.product?.name || item.name || 'نامشخص'
      })),
      status: order.status,
      total: order.totalAmount
    }));

    res.json({
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
        groupBy
      },
      summary: {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        revenueByStatus,
        revenueByPayment
      },
      revenueByPeriod: Object.values(revenueByPeriod).sort((a, b) => 
        a.date.localeCompare(b.date)
      ),
      topCustomers,
      topProducts,
      recentOrders: recentOrdersFormatted
    });
  } catch (error) {
    logger.error('Financial report error', { error: error.message });
    res.status(500).json({ message: 'خطا در تولید گزارش مالی' });
  }
});

/**
 * Helper function to get week number
 */
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Export functionality removed - all export functions deleted

module.exports = router;

