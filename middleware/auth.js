const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'دسترسی غیرمجاز - توکن یافت نشد' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'دسترسی غیرمجاز - کاربر یافت نشد' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'حساب کاربری غیرفعال است' });
    }

    req.user = user;
    next();
  } catch (error) {
    // Check if token is expired
    if (error.name === 'TokenExpiredError') {
      console.warn('JWT token expired:', {
        expiredAt: error.expiredAt,
        userId: error.userId || 'unknown'
      });
      return res.status(401).json({ 
        message: 'توکن منقضی شده است. لطفاً دوباره وارد شوید',
        code: 'TOKEN_EXPIRED',
        expiredAt: error.expiredAt
      });
    }
    
    // Check if token is invalid
    if (error.name === 'JsonWebTokenError') {
      console.warn('Invalid JWT token:', error.message);
      return res.status(401).json({ 
        message: 'توکن نامعتبر است. لطفاً دوباره وارد شوید',
        code: 'INVALID_TOKEN'
      });
    }
    
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'دسترسی غیرمجاز - توکن نامعتبر' });
  }
};

// Check if user is admin
const adminAuth = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'دسترسی محدود - فقط ادمین' });
  }
};

// Optional auth - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without user if token is invalid
    next();
  }
};

module.exports = { auth, adminAuth, optionalAuth };