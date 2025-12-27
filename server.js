const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const slowDown = require('express-slow-down');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.set('trust proxy', 1);

// --- BASIC SETUP ---
const PORT = process.env.PORT || 3002;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || `https://api.tarasheh.net`;

// --- SECURITY ---
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- CORS ---
const allowedOrigins = [
  'https://tarasheh.net',
'https://api.tarasheh.net',

  'https://www.tarasheh.net',
  'http://212.33.195.71:3001', // برای تست لوکال روی آی‌پی سرور
];

const corsOptions = {
  origin(origin, callback) {
    // برای ریکوئست‌های بدون origin (مثل curl / هلس چک) هم اجازه بده
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
};

app.use(cors(corsOptions));

// اگر خواستی preflight رو خودت هندل کنی (بدون cors دوباره):
app.options('*', (req, res) => {
  res.sendStatus(204);
});

// --- RATE LIMIT ---
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
}));

// --- SLOW DOWN ---
app.use(slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 100,
  delayMs: () => 500,
}));

// --- MONGO ---
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch((err) => console.error('Mongo error:', err));

// --- STATIC FILES ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- ROUTES ---
app.use('/api/auth', require('./routes/auth'));
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

// --- HEALTH CHECK ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// --- 404 ---
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// --- SERVER ---
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
