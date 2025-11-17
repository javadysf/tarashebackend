const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Order = require('../models/Order');
const paymentGateway = require('../utils/payment');
const logger = require('../utils/logger');

/**
 * @route   POST /api/payment/create
 * @desc    Create payment request
 * @access  Private
 */
router.post('/create', auth, async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: 'شناسه سفارش الزامی است' });
    }

    // Find order
    const order = await Order.findById(orderId).populate('user', 'name email phone');

    if (!order) {
      return res.status(404).json({ message: 'سفارش یافت نشد' });
    }

    // Check if order belongs to user
    if (order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'دسترسی غیرمجاز' });
    }

    // Check if order is already paid
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'این سفارش قبلاً پرداخت شده است' });
    }

    // Check if order is cancelled
    if (order.status === 'cancelled') {
      return res.status(400).json({ message: 'این سفارش لغو شده است' });
    }

    // Create payment request
    const callbackUrl = `${process.env.FRONTEND_URL || process.env.PUBLIC_BASE_URL}/order-success?orderId=${orderId}`;
    
    const paymentResult = await paymentGateway.createPaymentRequest({
      orderId: order._id.toString(),
      amount: order.totalAmount,
      description: `پرداخت سفارش ${order._id}`,
      callbackUrl,
      metadata: {
        user_id: req.user._id.toString(),
        order_id: order._id.toString()
      }
    });

    // Update order with payment authority
    order.paymentAuthority = paymentResult.authority;
    await order.save();

    logger.info('Payment request created', {
      orderId: order._id,
      authority: paymentResult.authority,
      userId: req.user._id
    });

    res.json({
      success: true,
      paymentUrl: paymentResult.paymentUrl,
      authority: paymentResult.authority
    });
  } catch (error) {
    logger.error('Payment creation error', {
      error: error.message,
      userId: req.user?._id,
      orderId: req.body.orderId
    });
    res.status(500).json({ message: error.message || 'خطا در ایجاد درخواست پرداخت' });
  }
});

/**
 * @route   POST /api/payment/verify
 * @desc    Verify payment callback
 * @access  Public (called by payment gateway)
 */
router.post('/verify', async (req, res) => {
  try {
    const { Authority, Status } = req.query;

    if (!Authority) {
      return res.status(400).json({ message: 'Authority parameter is required' });
    }

    // Find order by authority
    const order = await Order.findOne({ paymentAuthority: Authority });

    if (!order) {
      logger.warn('Order not found for payment authority', { authority: Authority });
      return res.status(404).json({ message: 'سفارش یافت نشد' });
    }

    // If already verified, return success
    if (order.paymentStatus === 'paid') {
      return res.json({
        success: true,
        message: 'پرداخت قبلاً تایید شده است',
        orderId: order._id
      });
    }

    // Verify payment
    if (Status === 'OK') {
      const verificationResult = await paymentGateway.verifyPayment(Authority, order.totalAmount);

      if (verificationResult.success) {
        // Update order
        order.paymentStatus = 'paid';
        order.paymentRefId = verificationResult.refId;
        order.paymentMethod = 'online';
        order.status = 'confirmed';
        order.paidAt = new Date();
        await order.save();

        logger.info('Payment verified successfully', {
          orderId: order._id,
          authority: Authority,
          refId: verificationResult.refId
        });

        // Redirect to success page
        return res.redirect(`${process.env.FRONTEND_URL || process.env.PUBLIC_BASE_URL}/order-success?orderId=${order._id}&payment=success`);
      } else {
        logger.error('Payment verification failed', {
          orderId: order._id,
          authority: Authority,
          error: verificationResult.errorMessage
        });

        // Update order payment status
        order.paymentStatus = 'failed';
        await order.save();

        return res.redirect(`${process.env.FRONTEND_URL || process.env.PUBLIC_BASE_URL}/order-success?orderId=${order._id}&payment=failed&error=${encodeURIComponent(verificationResult.errorMessage)}`);
      }
    } else {
      // Payment cancelled by user
      logger.info('Payment cancelled by user', {
        orderId: order._id,
        authority: Authority
      });

      return res.redirect(`${process.env.FRONTEND_URL || process.env.PUBLIC_BASE_URL}/order-success?orderId=${order._id}&payment=cancelled`);
    }
  } catch (error) {
    logger.error('Payment verification error', {
      error: error.message,
      authority: req.query.Authority
    });
    res.status(500).json({ message: 'خطا در تایید پرداخت' });
  }
});

/**
 * @route   GET /api/payment/status/:orderId
 * @desc    Get payment status
 * @access  Private
 */
router.get('/status/:orderId', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: 'سفارش یافت نشد' });
    }

    // Check if order belongs to user
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'دسترسی غیرمجاز' });
    }

    res.json({
      paymentStatus: order.paymentStatus,
      orderStatus: order.status,
      paymentMethod: order.paymentMethod,
      paidAt: order.paidAt,
      paymentRefId: order.paymentRefId
    });
  } catch (error) {
    logger.error('Get payment status error', {
      error: error.message,
      orderId: req.params.orderId
    });
    res.status(500).json({ message: 'خطا در دریافت وضعیت پرداخت' });
  }
});

module.exports = router;

