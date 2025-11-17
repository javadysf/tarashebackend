const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
  page: {
    type: String,
    required: [true, 'نام صفحه الزامی است'],
    enum: ['contact', 'about']
  },
  // Contact page fields
  contactInfo: {
    phone: {
      type: String,
      default: '021-1234-5678'
    },
    email: {
      type: String,
      default: 'info@tarashe.com'
    },
    address: {
      type: String,
      default: 'تهران، خیابان ولیعصر، پلاک 123'
    },
    workingHours: {
      type: String,
      default: 'شنبه تا پنجشنبه: 9-18'
    },
    mapAddress: {
      type: String,
      default: 'تهران، خیابان ولیعصر، پلاک 123'
    },
    mapEmbedCode: {
      type: String,
      default: '',
      validate: {
        validator: function(v) {
          // Allow empty string or valid HTML iframe
          if (!v) return true;
          return /<iframe[^>]*src=["'][^"']*["'][^>]*>.*?<\/iframe>/i.test(v);
        },
        message: 'کد تعبیه نقشه باید یک iframe معتبر باشد'
      }
    }
  },
  // About page fields
  aboutInfo: {
    title: {
      type: String,
      default: 'درباره تراشه'
    },
    subtitle: {
      type: String,
      default: 'ما در تراشه با بیش از یک ده ه تجربه، به ارائه بهترین محصولات و خدمات فناوری برای کسب‌وکارها و سازمان‌ها متعهد هستیم.'
    },
    mission: {
      type: String,
      default: 'ارائه راه‌حل‌های نوآورانه و با کیفیت که به کسب‌وکارها کمک می‌کند تا در عصر دیجیتال پیشرو باشند و اهداف خود را محقق کنند.'
    },
    vision: {
      type: String,
      default: 'تبدیل شدن به پیشروترین شرکت فناوری در منطقه و ایجاد تحول مثبت در زندگی میلیون‌ها نفر از طریق فناوری‌های پیشرفته.'
    },
    stats: [{
      number: {
        type: String,
        required: true
      },
      label: {
        type: String,
        required: true
      }
    }],
    team: [{
      name: {
        type: String,
        required: true
      },
      role: {
        type: String,
        required: true
      },
      description: {
        type: String,
        required: true
      }
    }]
  },
  // Common fields
  heroTitle: {
    type: String,
    default: ''
  },
  heroSubtitle: {
    type: String,
    default: ''
  },
  // SEO fields
  seo: {
    metaTitle: {
      type: String,
      default: ''
    },
    metaDescription: {
      type: String,
      default: ''
    },
    metaKeywords: {
      type: String,
      default: ''
    },
    ogTitle: {
      type: String,
      default: ''
    },
    ogDescription: {
      type: String,
      default: ''
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

contentSchema.index({ page: 1 }, { unique: true });

module.exports = mongoose.model('Content', contentSchema);
