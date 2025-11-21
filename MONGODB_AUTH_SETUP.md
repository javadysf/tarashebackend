# راهنمای تنظیم MongoDB با Authentication

این راهنما به شما کمک می‌کند MongoDB را با authentication (احراز هویت) تنظیم کنید.

## 📋 پیش‌نیازها

- MongoDB نصب شده باشد
- دسترسی به MongoDB بدون authentication (برای اولین بار)
- دسترسی root/administrator به سیستم

## 🔧 روش 1: تنظیم دستی (Recommended)

### Windows

#### مرحله 1: متوقف کردن MongoDB
```powershell
net stop MongoDB
```

#### مرحله 2: ایجاد پوشه data و log (اگر وجود ندارد)
```powershell
mkdir C:\data\db
mkdir C:\data\log
```

#### مرحله 3: ایجاد فایل پیکربندی MongoDB
فایل `C:\Program Files\MongoDB\Server\{version}\bin\mongod.cfg` را ویرایش کنید:

```yaml
storage:
  dbPath: C:\data\db
systemLog:
  destination: file
  path: C:\data\log\mongod.log
  logAppend: true
net:
  port: 27017
  bindIp: 127.0.0.1
security:
  authorization: enabled
```

#### مرحله 4: راه‌اندازی MongoDB
```powershell
net start MongoDB
```

#### مرحله 5: ایجاد کاربر Admin
```powershell
mongosh
```

در MongoDB shell:
```javascript
use admin
db.createUser({
  user: "admin",
  pwd: "your_secure_password_here",
  roles: [
    { role: "root", db: "admin" },
    { role: "readWriteAnyDatabase", db: "admin" },
    { role: "dbAdminAnyDatabase", db: "admin" }
  ]
})
```

#### مرحله 6: ایجاد کاربر Application
```javascript
use tarashe
db.createUser({
  user: "tarashe_user",
  pwd: "your_secure_password_here",
  roles: [
    { role: "readWrite", db: "tarashe" }
  ]
})
```

#### مرحله 7: تست اتصال
```javascript
exit
mongosh -u tarashe_user -p your_secure_password_here --authenticationDatabase tarashe
```

### Linux/macOS

#### مرحله 1: متوقف کردن MongoDB
```bash
# Linux
sudo systemctl stop mongod

# macOS
brew services stop mongodb-community
```

#### مرحله 2: ویرایش فایل پیکربندی
فایل `/etc/mongod.conf` (Linux) یا `/usr/local/etc/mongod.conf` (macOS) را ویرایش کنید:

```yaml
storage:
  dbPath: /var/lib/mongodb
systemLog:
  destination: file
  path: /var/log/mongodb/mongod.log
  logAppend: true
net:
  port: 27017
  bindIp: 127.0.0.1
security:
  authorization: enabled
```

#### مرحله 3: راه‌اندازی MongoDB
```bash
# Linux
sudo systemctl start mongod
sudo systemctl enable mongod

# macOS
brew services start mongodb-community
```

#### مرحله 4: ایجاد کاربر Admin
```bash
mongosh
```

در MongoDB shell:
```javascript
use admin
db.createUser({
  user: "admin",
  pwd: "your_secure_password_here",
  roles: [
    { role: "root", db: "admin" },
    { role: "readWriteAnyDatabase", db: "admin" },
    { role: "dbAdminAnyDatabase", db: "admin" }
  ]
})
```

#### مرحله 5: ایجاد کاربر Application
```javascript
use tarashe
db.createUser({
  user: "tarashe_user",
  pwd: "your_secure_password_here",
  roles: [
    { role: "readWrite", db: "tarashe" }
  ]
})
```

#### مرحله 6: تست اتصال
```bash
mongosh -u tarashe_user -p your_secure_password_here --authenticationDatabase tarashe
```

## 🤖 روش 2: استفاده از اسکریپت خودکار

### مرحله 1: اطمینان از اتصال MongoDB بدون authentication
```bash
mongosh
```

### مرحله 2: اجرای اسکریپت
```bash
cd tarashebackend
node setup-mongodb-auth.js
```

اسکریپت از شما اطلاعات زیر را می‌پرسد:
- MongoDB host و port
- نام کاربری و رمز عبور admin
- نام دیتابیس application
- نام کاربری و رمز عبور application

### مرحله 3: فعال کردن authentication در MongoDB
پس از ایجاد کاربران، باید authentication را در MongoDB فعال کنید (مراحل بالا).

## 📝 تنظیم Connection String

پس از تنظیم authentication، connection string را در فایل `.env` به‌روزرسانی کنید:

### فرمت Connection String

```
mongodb://[username]:[password]@[host]:[port]/[database]?authSource=[authDatabase]
```

### مثال‌ها

**Development (Local):**
```env
MONGODB_URI=mongodb://tarashe_user:your_password@localhost:27017/tarashe?authSource=tarashe
```

**Production (Remote):**
```env
MONGODB_URI=mongodb://tarashe_user:your_password@your-mongodb-host:27017/tarashe?authSource=tarashe
```

**MongoDB Atlas (Cloud):**
```env
MONGODB_URI=mongodb+srv://tarashe_user:your_password@cluster.mongodb.net/tarashe?retryWrites=true&w=majority
```

## 🔐 امنیت

### نکات مهم:

1. **رمزهای عبور قوی:**
   - حداقل 16 کاراکتر
   - ترکیبی از حروف بزرگ، کوچک، اعداد و کاراکترهای خاص
   - استفاده از password manager

2. **محدود کردن دسترسی:**
   - کاربر application فقط به دیتابیس خودش دسترسی داشته باشد
   - از role `readWrite` به جای `root` استفاده کنید

3. **فایروال:**
   - MongoDB را فقط به localhost bind کنید
   - برای دسترسی remote از VPN یا SSH tunnel استفاده کنید

4. **رمزنگاری:**
   - از TLS/SSL برای اتصالات remote استفاده کنید
   - MongoDB Atlas به صورت پیش‌فرض از TLS استفاده می‌کند

## ✅ تست اتصال

### تست با mongosh:
```bash
mongosh "mongodb://tarashe_user:your_password@localhost:27017/tarashe?authSource=tarashe"
```

### تست با Node.js:
```javascript
const mongoose = require('mongoose');

mongoose.connect('mongodb://tarashe_user:your_password@localhost:27017/tarashe?authSource=tarashe')
  .then(() => console.log('Connected successfully'))
  .catch(err => console.error('Connection error:', err));
```

## 🐛 رفع مشکلات

### خطا: "Authentication failed"
- بررسی کنید که username و password درست باشند
- بررسی کنید که `authSource` درست تنظیم شده باشد
- بررسی کنید که کاربر در دیتابیس درست ایجاد شده باشد

### خطا: "Connection refused"
- بررسی کنید که MongoDB در حال اجرا باشد
- بررسی کنید که port درست باشد
- بررسی کنید که firewall MongoDB را block نکرده باشد

### خطا: "User not found"
- بررسی کنید که کاربر در دیتابیس درست ایجاد شده باشد
- از `use admin` برای کاربر admin استفاده کنید
- از `use tarashe` برای کاربر application استفاده کنید

## 📚 منابع بیشتر

- [MongoDB Authentication Documentation](https://docs.mongodb.com/manual/core/authentication/)
- [MongoDB Security Checklist](https://docs.mongodb.com/manual/administration/security-checklist/)
- [MongoDB Connection String Format](https://docs.mongodb.com/manual/reference/connection-string/)




