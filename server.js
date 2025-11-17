const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const cookieParser = require('cookie-parser');
const slowDown = require('express-slow-down');
const dotenvResult = require('dotenv').config();
const logger = require('./utils/logger');

// Initialize Sentry early
const sentry = require('./utils/sentry');

if (dotenvResult.error && dotenvResult.error.code !== 'ENOENT') {
  logger.error('Failed to load .env file', { error: dotenvResult.error });
}

if (dotenvResult.parsed) {
  logger.info('Loaded environment variables from .env file');
}

// Validate required environment variables
if (!process.env.JWT_SECRET) {
  logger.error('JWT_SECRET environment variable is required');
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1);

const isProduction = process.env.NODE_ENV === 'production';
const DEFAULT_PORT = 4000;
const PORT = Number(process.env.PORT) || DEFAULT_PORT;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const configuredOrigins = (process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
  : []);

const defaultOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`,
  FRONTEND_URL,
  PUBLIC_BASE_URL,
];

const allowedOrigins = Array.from(new Set([...defaultOrigins, ...configuredOrigins])).filter(Boolean);

if (isProduction && !process.env.COOKIE_SECRET) {
  logger.warn('COOKIE_SECRET is not set. A fallback value is being used. Please configure COOKIE_SECRET in production.');
}

logger.info(`Configured backend port: ${PORT}`);

// Security middleware
const imgSrcWhitelist = (process.env.CSP_IMG_SRC
  ? process.env.CSP_IMG_SRC.split(',').map((origin) => origin.trim()).filter(Boolean)
  : ['https://res.cloudinary.com']);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
        imgSrc: ["'self'", 'data:', 'blob:', ...imgSrcWhitelist],
        connectSrc: ["'self'", FRONTEND_URL, PUBLIC_BASE_URL],
        fontSrc: ["'self'", 'https:', 'data:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'no-referrer' },
  })
);

// Rate limiting - Environment-based configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 300 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests',
    message: 'درخواستهای زیادی ارسال شده'
  },
  skip: (req) => {
    return !isProduction && 
           (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1');
  }
});
app.use(limiter);

// CORS - Enhanced configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Cross-Origin-Resource-Policy'],
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
}));

// Add CORS headers for all responses
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

// Handle preflight requests explicitly
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(
  cookieParser(process.env.COOKIE_SECRET || 'tarashe-cookie-secret')
);

// Note: CSRF protection is not needed for Bearer token authentication
// CSRF attacks only affect cookie-based authentication
// Bearer tokens are immune to CSRF attacks since they must be explicitly included in requests

// Slow down middleware for brute force protection
const slowDownMiddleware = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: isProduction ? 50 : 200, // Start delaying after N requests
  delayMs: (used, req) => {
    // New behavior: fixed delay of 500ms per request after delayAfter
    return 500;
  },
  maxDelayMs: 20000, // Maximum delay of 20 seconds
  skip: (req) => {
    return !isProduction &&
           (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1');
  },
  validate: {
    delayMs: false // Disable validation warning
  }
});

// Validate MongoDB URI
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI environment variable is required');
  process.exit(1);
}

// Database connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => {
  logger.info('MongoDB connected successfully');
})
.catch((err) => {
  logger.error('MongoDB connection error', { error: err });
  logger.warn('Running in mock mode - no database connection');
});

// Serve static files from uploads directory with CORS headers
app.use('/uploads', (req, res, next) => {
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Access-Control-Allow-Origin', '*');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Routes
// Apply slow down to auth routes for brute force protection
app.use('/api/auth', slowDownMiddleware, require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/attributes', require('./routes/attributes'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/users', require('./routes/users'));
app.use('/api/brands', require('./routes/brands'));
app.use('/api/content', require('./routes/content'));
app.use('/api/sliders', require('./routes/sliders'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/bulk', require('./routes/bulk'));
app.use('/api/activity-logs', require('./routes/activity-logs'));

// Image upload endpoint
const multer = require('multer');
const fs = require('fs');

// Configure multer for simple file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads', 'sliders');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}_${file.originalname}`;
    cb(null, fileName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('فقط فایل های تصویری مجاز هستند'), false);
    }
  },
});

app.post('/api/upload/image', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'هیچ فایلی آپلود نشده است' });
    }
    
    res.json({
      message: 'تصویر با موفقیت آپلود شد',
      url: `${PUBLIC_BASE_URL}/uploads/sliders/${req.file.filename}`
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ message: 'خطا در آپلود تصویر' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Tarashe API is running',
    timestamp: new Date().toISOString()
  });
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.logRequest(req, res, duration);
  });
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    logger.warn('CSRF token validation failed', { 
      ip: req.ip,
      url: req.originalUrl 
    });
    return res.status(403).json({
      message: 'درخواست نامعتبر است. لطفاً صفحه را تازه‌سازی کرده و دوباره تلاش کنید.'
    });
  }

  // Capture error in Sentry
  sentry.captureException(err, {
    component: 'express',
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.user?._id || req.user?.id
  });
  
  // Also log to Winston
  logger.logError(err, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.user?._id || req.user?.id
  });
  
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({ 
    message: err.message || 'خطا در سرور',
    ...(isDevelopment && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on port ${PORT}`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    apiUrl: `http://localhost:${PORT}/api`
  });
});

module.exports = app;