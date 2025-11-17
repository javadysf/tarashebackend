const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'نام محصول الزامی است'],
    trim: true,
    maxlength: [200, 'نام محصول نباید بیشتر از 200 کاراکتر باشد']
  },
  description: {
    type: String,
    required: [true, 'توضیحات محصول الزامی است'],
    maxlength: [2000, 'توضیحات نباید بیشتر از 2000 کاراکتر باشد']
  },
  price: {
    type: Number,
    required: [true, 'قیمت الزامی است'],
    min: [0, 'قیمت نمیتواند منفی باشد']
  },
  originalPrice: {
    type: Number,
    min: [0, 'قیمت اصلی نمیتواند منفی باشد']
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'دسته‌بندی الزامی است']
  },
  brand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: [true, 'برند الزامی است']
  },
  model: {
    type: String,
    trim: true
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: {
      type: String,
      default: ''
    }
  }],
  specifications: [{
    key: {
      type: String,
      required: true
    },
    value: {
      type: String,
      required: true
    }
  }],
  stock: {
    type: Number,
    required: [true, 'موجودی الزامی است'],
    min: [0, 'موجودی نمیتواند منفی باشد'],
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isAccessory: {
    type: Boolean,
    default: false
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  tags: [String],
  attributes: {
    type: Map,
    of: String,
    default: {}
  },
  seo: {
    title: String,
    description: String,
    keywords: [String]
  },
  // متعلقات محصول
  accessories: [{
    accessory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    // آیا این متعلق پیشنهادی است یا ضروری
    isSuggested: {
      type: Boolean,
      default: true
    },
    // تخفیف ویژه برای خرید همراه محصول اصلی
    bundleDiscount: {
      type: Number,
      default: 0,
      min: [0, 'تخفیف نمی‌تواند منفی باشد'],
      max: [100, 'تخفیف نمی‌تواند بیش از 100 درصد باشد']
    },
    // ترتیب نمایش متعلقات
    displayOrder: {
      type: Number,
      default: 0
    }
  }]
}, {
  timestamps: true
});

// Indexes for better performance
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ price: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ isFeatured: 1 });

// Virtual for inStock
productSchema.virtual('inStock').get(function() {
  return this.stock > 0;
});

// Ensure virtual fields are serialized
productSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);