const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

// Mock users
const users = [
  {
    id: '1',
    name: 'مدیر سیستم',
    email: 'admin@tarashe.com',
    password: 'admin123',
    role: 'admin'
  },
  {
    id: '2',
    name: 'کاربر تست',
    email: 'user@test.com',
    password: 'user123',
    role: 'user'
  }
];

// Mock products
const products = [
  {
    _id: '1',
    name: 'باتری لپ تاپ HP Pavilion 15',
    price: 850000,
    originalPrice: 1200000,
    description: 'باتری اصل و با کیفیت برای لپ تاپ HP Pavilion 15',
    brand: 'HP',
    model: 'Pavilion 15',
    stock: 25,
    images: [{ url: '/pics/battery.jpg', alt: 'باتری HP' }],
    rating: { average: 4.8, count: 24 },
    category: { _id: '1', name: 'باتری لپ تاپ' },
    isFeatured: true
  }
];

const categories = [
  { _id: '1', name: 'باتری لپ تاپ', slug: 'battery-laptop' },
  { _id: '2', name: 'شارژر لپ تاپ', slug: 'charger-laptop' }
];

// Generate token
const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET || 'mock-secret-key-for-development';
  return jwt.sign({ userId }, secret, { expiresIn: '7d' });
};

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  const user = users.find(u => u.email === email && u.password === password);
  
  if (!user) {
    return res.status(400).json({ message: 'ایمیل یا رمز عبور اشتباه است' });
  }

  const token = generateToken(user.id);
  
  res.json({
    message: 'ورود با موفقیت انجام شد',
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

// Register
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, phone } = req.body;
  
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ message: 'کاربری با این ایمیل قبلاً ثبت نام کرده است' });
  }

  const newUser = {
    id: String(users.length + 1),
    name,
    email,
    password,
    phone,
    role: 'user'
  };
  
  users.push(newUser);
  
  const token = generateToken(newUser.id);
  
  res.status(201).json({
    message: 'ثبت نام با موفقیت انجام شد',
    token,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role
    }
  });
});

// Get profile
app.get('/api/auth/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'دسترسی غیرمجاز' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'mock-secret-key-for-development';
    const decoded = jwt.verify(token, secret);
    const user = users.find(u => u.id === decoded.userId);
    
    if (!user) {
      return res.status(401).json({ message: 'کاربر یافت نشد' });
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(401).json({ message: 'توکن نامعتبر' });
  }
});

// Get products
app.get('/api/products', (req, res) => {
  res.json({
    products,
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalProducts: products.length
    }
  });
});

// Get categories
app.get('/api/categories', (req, res) => {
  res.json(categories);
});

// Get brands
app.get('/api/brands', (req, res) => {
  res.json([
    { _id: '1', name: 'HP', image: { url: '/pics/battery.jpg' } },
    { _id: '2', name: 'Dell', image: { url: '/pics/battery.jpg' } },
    { _id: '3', name: 'Lenovo', image: { url: '/pics/battery.jpg' } }
  ]);
});

// Get sliders
app.get('/api/sliders', (req, res) => {
  const { type } = req.query;
  const sliders = [
    {
      _id: '1',
      type: 'main',
      title: 'خوش آمدید به تراشه',
      subtitle: 'بهترین محصولات را از ما بخرید',
      backgroundImage: '/pics/battery.jpg',
      isActive: true,
      displayOrder: 1,
      buttonText: 'مشاهده محصولات',
      buttonLink: '/products',
      textColor: '#ffffff',
      buttonColor: '#3b82f6',
      textPosition: 'center',
      overlayOpacity: 0.4
    }
  ];
  
  if (type === 'main' || type === 'promo') {
    const filteredSliders = sliders.filter(s => s.type === type);
    return res.json({ sliders: filteredSliders });
  }
  
  res.json({ sliders: sliders });
});

// Get best selling products (must be before /api/products/:id)
app.get('/api/products/best-selling', (req, res) => {
  const limit = parseInt(req.query.limit) || 8;
  const bestSelling = products.slice(0, limit);
  res.json({
    products: bestSelling,
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalProducts: bestSelling.length
    }
  });
});

// Get single product
app.get('/api/products/:id', (req, res) => {
  const product = products.find(p => p._id === req.params.id);
  if (!product) {
    return res.status(404).json({ message: 'محصول یافت نشد' });
  }
  res.json(product);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Mock API is running' });
});

// Handle all other routes
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Mock server running on port ${PORT}`);
  console.log('Login credentials:');
  console.log('Admin: admin@tarashe.com / admin123');
  console.log('User: user@test.com / user123');
});

module.exports = app;