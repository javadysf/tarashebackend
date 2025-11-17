const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'نام دسته بندی الزامی است'],
    trim: true,
    unique: true,
    maxlength: [100, 'نام دسته بندی نباید بیشتر از 100 کاراکتر باشد']
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    maxlength: [500, 'توضیحات نباید بیشتر از 500 کاراکتر باشد']
  },
  image: {
    url: {
      type: String,
      required: [true, 'تصویر دسته بندی الزامی است']
    },
    alt: {
      type: String,
      default: 'تصویر دسته بندی'
    },
    public_id: {
      type: String
    }
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Create slug from name before saving
categorySchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06FF]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  next();
});

// Virtual for subcategories
categorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parent'
});

// Virtual for products count
categorySchema.virtual('productsCount', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'category',
  count: true
});

categorySchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Category', categorySchema);