# فعال‌سازی MongoDB Authentication

کاربران MongoDB با موفقیت ایجاد شدند! حالا باید authentication را در MongoDB فعال کنید.

## ✅ کاربران ایجاد شده

**Admin User:**
- Username: `admin`
- Password: `c24b04c16ddcc624552523c40c31c69f`
- Connection: `mongodb://admin:c24b04c16ddcc624552523c40c31c69f@localhost:27017/admin?authSource=admin`

**Application User:**
- Username: `tarashe_user`
- Password: `de2f1b710c860319362c0b76747b5aa1`
- Connection: `mongodb://tarashe_user:de2f1b710c860319362c0b76747b5aa1@localhost:27017/tarashe?authSource=tarashe`

⚠️ **مهم**: این اطلاعات در فایل `mongodb-credentials.json` ذخیره شده است. این فایل را commit نکنید!

## 🔧 فعال‌سازی Authentication

### Windows

1. **متوقف کردن MongoDB:**
   ```powershell
   net stop MongoDB
   ```

2. **ویرایش فایل پیکربندی:**
   فایل `C:\Program Files\MongoDB\Server\{version}\bin\mongod.cfg` را باز کنید
   
   یا از فایل نمونه استفاده کنید:
   ```powershell
   copy mongod-config-example.yaml "C:\Program Files\MongoDB\Server\{version}\bin\mongod.cfg"
   ```
   
   سپس این خط را اضافه کنید:
   ```yaml
   security:
     authorization: enabled
   ```

3. **راه‌اندازی مجدد MongoDB:**
   ```powershell
   net start MongoDB
   ```

### Linux

1. **متوقف کردن MongoDB:**
   ```bash
   sudo systemctl stop mongod
   ```

2. **ویرایش فایل پیکربندی:**
   ```bash
   sudo nano /etc/mongod.conf
   ```
   
   این خط را اضافه کنید:
   ```yaml
   security:
     authorization: enabled
   ```

3. **راه‌اندازی مجدد MongoDB:**
   ```bash
   sudo systemctl start mongod
   sudo systemctl enable mongod
   ```

### macOS

1. **متوقف کردن MongoDB:**
   ```bash
   brew services stop mongodb-community
   ```

2. **ویرایش فایل پیکربندی:**
   ```bash
   nano /usr/local/etc/mongod.conf
   ```
   
   این خط را اضافه کنید:
   ```yaml
   security:
     authorization: enabled
   ```

3. **راه‌اندازی مجدد MongoDB:**
   ```bash
   brew services start mongodb-community
   ```

## 📝 به‌روزرسانی .env

پس از فعال‌سازی authentication، فایل `.env` را به‌روزرسانی کنید:

```env
MONGODB_URI=mongodb://tarashe_user:de2f1b710c860319362c0b76747b5aa1@localhost:27017/tarashe?authSource=tarashe
```

## ✅ تست اتصال

پس از فعال‌سازی authentication، اتصال را تست کنید:

```bash
mongosh "mongodb://tarashe_user:de2f1b710c860319362c0b76747b5aa1@localhost:27017/tarashe?authSource=tarashe"
```

یا با Node.js:
```javascript
const mongoose = require('mongoose');
mongoose.connect('mongodb://tarashe_user:de2f1b710c860319362c0b76747b5aa1@localhost:27017/tarashe?authSource=tarashe')
  .then(() => console.log('Connected successfully'))
  .catch(err => console.error('Connection error:', err));
```

## 🐛 رفع مشکلات

### خطا: "Authentication failed"
- بررسی کنید که authentication در MongoDB فعال شده باشد
- بررسی کنید که username و password درست باشند
- بررسی کنید که `authSource` درست تنظیم شده باشد

### خطا: "Connection refused"
- بررسی کنید که MongoDB در حال اجرا باشد
- بررسی کنید که MongoDB بعد از فعال‌سازی authentication restart شده باشد

## 📚 منابع بیشتر

راهنمای کامل در فایل `MONGODB_AUTH_SETUP.md` موجود است.




