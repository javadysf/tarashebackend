/**
 * اسکریپت بررسی تنظیمات Cloudinary
 * این اسکریپت بررسی می‌کند که آیا متغیرهای محیطی Cloudinary به درستی تنظیم شده‌اند
 */

require('dotenv').config();
const cloudinary = require('./config/cloudinary');

console.log('\n🔍 بررسی تنظیمات Cloudinary...\n');

// بررسی متغیرهای محیطی
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

console.log('📋 وضعیت متغیرهای محیطی:');
console.log('   CLOUDINARY_CLOUD_NAME:', cloudName ? '✓ تنظیم شده' : '✗ تنظیم نشده');
console.log('   CLOUDINARY_API_KEY:', apiKey ? '✓ تنظیم شده' : '✗ تنظیم نشده');
console.log('   CLOUDINARY_API_SECRET:', apiSecret ? '✓ تنظیم شده' : '✗ تنظیم نشده');

if (!cloudName || !apiKey || !apiSecret) {
  console.log('\n❌ مشکل: یک یا چند متغیر محیطی Cloudinary تنظیم نشده‌اند!');
  console.log('\n💡 راه‌حل:');
  console.log('   1. فایل .env در پوشه tarashebackend را باز کنید');
  console.log('   2. متغیرهای زیر را اضافه کنید:');
  console.log('      CLOUDINARY_CLOUD_NAME=your_cloud_name');
  console.log('      CLOUDINARY_API_KEY=your_api_key');
  console.log('      CLOUDINARY_API_SECRET=your_api_secret');
  console.log('   3. سرور را restart کنید');
  process.exit(1);
}

console.log('\n✅ همه متغیرهای محیطی تنظیم شده‌اند!');
console.log('\n🧪 تست اتصال به Cloudinary...\n');

// تست اتصال با یک آپلود تستی
const testBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

cloudinary.uploader.upload_stream(
  {
    resource_type: 'image',
    folder: 'test',
    public_id: 'test-connection-' + Date.now()
  },
  (error, result) => {
    if (error) {
      console.error('❌ خطا در اتصال به Cloudinary:');
      console.error('   کد خطا:', error.http_code);
      console.error('   پیام خطا:', error.message);
      console.error('\n💡 نکات:');
      console.error('   - بررسی کنید که اطلاعات API درست باشند');
      console.error('   - بررسی کنید که اتصال اینترنت برقرار باشد');
      console.error('   - بررسی کنید که حساب Cloudinary شما فعال باشد');
      process.exit(1);
    } else {
      console.log('✅ اتصال به Cloudinary موفق بود!');
      console.log('   URL تست:', result.secure_url);
      console.log('   Public ID:', result.public_id);
      
      // حذف فایل تست
      cloudinary.uploader.destroy(result.public_id, (err, res) => {
        if (err) {
          console.log('⚠️ فایل تست حذف نشد (مشکل نیست)');
        } else {
          console.log('🗑️ فایل تست حذف شد');
        }
        console.log('\n✅ همه چیز آماده است! تصاویر به Cloudinary آپلود خواهند شد.\n');
        process.exit(0);
      });
    }
  }
).end(testBuffer);

