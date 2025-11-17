# Tarashe Backend API

Backend API برای پلتفرم فروشگاهی تراشه که با Node.js، Express و MongoDB ساخته شده است.

## ویژگی‌ها

- 🔐 احراز هویت و مجوزدهی با JWT
- 👥 مدیریت کاربران
- 📦 مدیریت محصولات
- 🏷️ مدیریت دسته‌بندی‌ها
- 🛒 مدیریت سفارشات
- 🔍 جستجو و فیلتر پیشرفته
- 📱 API RESTful
- 🛡️ امنیت با Helmet و Rate Limiting
- ✅ اعتبارسنجی داده‌ها

## پیش‌نیازها

- Node.js (نسخه 16 یا بالاتر)
- MongoDB
- npm یا yarn

## نصب و راه‌اندازی

1. کلون کردن پروژه:
```bash
git clone <repository-url>
cd tarashebackend
```

2. نصب dependencies:
```bash
npm install
```

3. تنظیم متغیرهای محیطی:
فایل `.env` را ایجاد کرده و متغیرهای زیر را تنظیم کنید:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/tarashe
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

4. اجرای سرور:
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Endpoints

### احراز هویت
- `POST /api/auth/register` - ثبت نام کاربر جدید
- `POST /api/auth/login` - ورود کاربر
- `GET /api/auth/me` - دریافت اطلاعات کاربر فعلی
- `PUT /api/auth/profile` - بروزرسانی پروفایل

### محصولات
- `GET /api/products` - دریافت لیست محصولات
- `GET /api/products/:id` - دریافت محصول خاص
- `POST /api/products` - ایجاد محصول جدید (ادمین)
- `PUT /api/products/:id` - بروزرسانی محصول (ادمین)
- `DELETE /api/products/:id` - حذف محصول (ادمین)

### دسته‌بندی‌ها
- `GET /api/categories` - دریافت لیست دسته‌بندی‌ها
- `GET /api/categories/:id` - دریافت دسته‌بندی خاص
- `GET /api/categories/slug/:slug` - دریافت دسته‌بندی با slug
- `GET /api/categories/:id/products` - دریافت محصولات دسته‌بندی
- `POST /api/categories` - ایجاد دسته‌بندی جدید (ادمین)
- `PUT /api/categories/:id` - بروزرسانی دسته‌بندی (ادمین)
- `DELETE /api/categories/:id` - حذف دسته‌بندی (ادمین)

### سفارشات
- `GET /api/orders` - دریافت لیست سفارشات
- `GET /api/orders/:id` - دریافت سفارش خاص
- `POST /api/orders` - ایجاد سفارش جدید
- `PUT /api/orders/:id/status` - بروزرسانی وضعیت سفارش (ادمین)
- `PUT /api/orders/:id/cancel` - لغو سفارش

### کاربران (ادمین)
- `GET /api/users` - دریافت لیست کاربران
- `GET /api/users/:id` - دریافت کاربر خاص
- `PUT /api/users/:id` - بروزرسانی کاربر
- `DELETE /api/users/:id` - غیرفعال کردن کاربر
- `PUT /api/users/:id/activate` - فعال کردن کاربر
- `GET /api/users/stats/dashboard` - آمار کاربران

## ساختار پروژه

```
tarashebackend/
├── models/          # مدل‌های MongoDB
├── routes/          # Route handlers
├── middleware/      # Middleware functions
├── controllers/     # Controller functions
├── utils/           # Utility functions
├── uploads/         # فایل‌های آپلود شده
├── .env             # متغیرهای محیطی
├── server.js        # فایل اصلی سرور
└── package.json     # Dependencies و scripts
```

## امنیت

- استفاده از Helmet برای امنیت headers
- Rate limiting برای جلوگیری از حملات
- اعتبارسنجی ورودی‌ها
- Hash کردن رمزهای عبور
- JWT برای احراز هویت

## مشارکت

1. Fork کردن پروژه
2. ایجاد branch جدید (`git checkout -b feature/AmazingFeature`)
3. Commit کردن تغییرات (`git commit -m 'Add some AmazingFeature'`)
4. Push کردن به branch (`git push origin feature/AmazingFeature`)
5. ایجاد Pull Request

## لایسنس

این پروژه تحت لایسنس MIT منتشر شده است.