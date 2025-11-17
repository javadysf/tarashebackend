# راهنمای راهاندازی Backend تراشه

## مراحل راهاندازی

### 1. نصب MongoDB

#### Windows:
1. از [MongoDB Community Server](https://www.mongodb.com/try/download/community) دانلود کنید
2. فایل نصب را اجرا کرده و مراحل نصب را دنبال کنید
3. MongoDB Compass را نیز نصب کنید (اختیاری)

#### macOS:
```bash
# با Homebrew
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb/brew/mongodb-community
```

#### Linux (Ubuntu):
```bash
# Import public key
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Create list file
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Update and install
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start service
sudo systemctl start mongod
sudo systemctl enable mongod
```

### 2. راهاندازی پروژه

1. **کلون کردن پروژه:**
```bash
cd d:/projects/tarashee/tarashebackend
```

2. **نصب dependencies:**
```bash
npm install
```

3. **تنظیم متغیرهای محیطی:**
فایل `.env` را ویرایش کرده و مقادیر زیر را تنظیم کنید:

**تولید Secrets قوی:**

برای تولید JWT_SECRET:
```bash
node generate-jwt-secret.js
# یا
npm run generate:jwt-secret
```

برای تولید COOKIE_SECRET:
```bash
node generate-cookie-secret.js
# یا
npm run generate:cookie-secret
```

این اسکریپت‌ها مقادیر امن و تصادفی تولید می‌کنند. مقادیر تولید شده را در فایل `.env` قرار دهید.

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/tarashe
JWT_SECRET=your_generated_jwt_secret_here
COOKIE_SECRET=your_generated_cookie_secret_here
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

⚠️ **مهم**: هرگز JWT_SECRET و COOKIE_SECRET را در repository commit نکنید!

4. **ایجاد داده های اولیه:**
```bash
npm run seed
```

5. **اجرای سرور:**
```bash
# Development mode (با nodemon)
npm run dev

# Production mode
npm start
```

### 3. تست API

سرور روی پورت 5000 اجرا میشود. میتوانید API را تست کنید:

```bash
# Health check
curl http://localhost:5000/api/health

# دریافت محصولات
curl http://localhost:5000/api/products

# دریافت دسته بندی ها
curl http://localhost:5000/api/categories
```

### 4. اطلاعات ورود

پس از اجرای seed، میتوانید با اطلاعات زیر وارد شوید:

**ادمین:**
- ایمیل: `admin@tarashe.com`
- رمز عبور: `admin123`

**کاربر عادی:**
- ایمیل: `user@test.com`
- رمز عبور: `user123`

### 5. اتصال فرانتاند

برای اتصال فرانتاند Next.js به بکند، در فایلهای فرانتاند از URL زیر استفاده کنید:

```javascript
const API_BASE_URL = 'http://localhost:5000/api';
```

### 6. مشکلات رایج

#### MongoDB اجرا نمیشود:
```bash
# Windows
net start MongoDB

# macOS
brew services start mongodb/brew/mongodb-community

# Linux
sudo systemctl start mongod
```

#### پورت 5000 در حال استفاده است:
فایل `.env` را ویرایش کرده و پورت دیگری انتخاب کنید:
```env
PORT=5001
```

#### خطای CORS:
مطمئن شوید که `CORS_ORIGIN` در `.env` درست تنظیم شده است:
```env
CORS_ORIGIN=http://localhost:3000
```

### 7. ابزارهای توسعه

#### MongoDB Compass:
برای مدیریت دیتابیس از MongoDB Compass استفاده کنید:
- Connection String: `mongodb://localhost:27017`
- Database: `tarashe`

#### Postman:
برای تست API میتوانید از Postman استفاده کنید. فایل collection در پوشه `docs/` قرار دارد.

### 8. لاگها

لاگهای سرور در کنسول نمایش داده میشوند. برای production، میتوانید از Winston یا Morgan استفاده کنید.

### 9. امنیت

برای production:
1. **JWT_SECRET را تغییر دهید:**
   ```bash
   node generate-jwt-secret.js
   # یا
   npm run generate:jwt-secret
   ```
   مقدار تولید شده را در `.env` قرار دهید.

2. **COOKIE_SECRET را تغییر دهید:**
   ```bash
   node generate-cookie-secret.js
   # یا
   npm run generate:cookie-secret
   ```
   مقدار تولید شده را در `.env` قرار دهید.

   این مقادیر رشته‌های تصادفی 128 کاراکتری (64 بایت hex) هستند که برای production مناسب هستند.

3. **MongoDB را با authentication تنظیم کنید:**
   - راهنمای کامل: `MONGODB_AUTH_SETUP.md`
   - یا از اسکریپت استفاده کنید: `node setup-mongodb-auth.js`
   - Connection string را در `.env` به‌روزرسانی کنید:
     ```env
     MONGODB_URI=mongodb://username:password@host:port/database?authSource=database
     ```

4. NODE_ENV را روی `production` قرار دهید
5. از HTTPS استفاده کنید
6. Rate limiting را تنظیم کنید
7. هرگز فایل `.env` را در repository commit نکنید

### 10. پشتیبانی

در صورت بروز مشکل:
1. لاگهای سرور را بررسی کنید
2. اتصال MongoDB را چک کنید
3. متغیرهای محیطی را بررسی کنید
4. فایروال و آنتیویروس را چک کنید