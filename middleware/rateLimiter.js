const rateLimit = require('express-rate-limit');

// General rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    message: 'درخواست‌های زیادی از این IP ارسال شده، لطفاً بعداً تلاش کنید.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    message: 'تلاش‌های زیادی برای احراز هویت، لطفاً بعداً تلاش کنید.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { generalLimiter, authLimiter };