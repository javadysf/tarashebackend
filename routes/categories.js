const express = require('express');
const Category = require('../models/Category');
const { auth, adminAuth } = require('../middleware/auth');
const { upload, uploadToCloudinary } = require('../middleware/upload');
const { mockCategories } = require('../mock-data');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate');

const router = express.Router();

const categoryValidators = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('نام دسته بندی الزامی است')
    .isLength({ min: 2, max: 100 })
    .withMessage('نام دسته بندی باید بین 2 تا 100 کاراکتر باشد'),
  body('slug')
    .optional()
    .trim()
    .matches(/^[a-z0-9-]+$/)
    .withMessage('slug فقط باید شامل حروف کوچک انگلیسی، اعداد و خط تیره باشد')
    .isLength({ max: 120 })
    .withMessage('slug نباید بیشتر از 120 کاراکتر باشد'),
  body('description')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('توضیحات نباید بیشتر از 500 کاراکتر باشد'),
  body('image')
    .custom((value) => {
      if (!value || typeof value !== 'object') {
        throw new Error('تصویر دسته بندی الزامی است');
      }
      if (!value.url) {
        throw new Error('آدرس تصویر دسته بندی الزامی است');
      }
      return true;
    }),
  body('image.url')
    .trim()
    .custom((value) => {
      if (!value) {
        throw new Error('آدرس تصویر الزامی است');
      }
      
      // Accept URLs with protocol (http:// or https://)
      const fullUrlPattern = /^https?:\/\/(localhost|127\.0\.0\.1|[\da-z\.-]+\.[a-z\.]{2,})(:\d+)?(\/.*)?$/i;
      // Accept relative paths starting with /uploads/
      const relativePathPattern = /^\/uploads\/.+/i;
      // Accept Cloudinary URLs
      const cloudinaryPattern = /^https?:\/\/res\.cloudinary\.com\/.+/i;
      
      if (fullUrlPattern.test(value) || relativePathPattern.test(value) || cloudinaryPattern.test(value)) {
        return true;
      }
      throw new Error('آدرس تصویر معتبر نیست');
    })
    .withMessage('آدرس تصویر معتبر نیست'),
  body('image.alt')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 150 })
    .withMessage('متن جایگزین تصویر نباید بیشتر از 150 کاراکتر باشد'),
  body('parent')
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage('شناسه دسته والد معتبر نیست'),
];

const categoryIdValidator = [
  param('id').isMongoId().withMessage('شناسه دسته‌بندی معتبر نیست'),
];

// @route   GET /api/categories
// @desc    Get all categories
// @access  Public
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find().sort({ sortOrder: 1 });
    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   GET /api/categories/:id
// @desc    Get single category
// @access  Public
router.get('/:id', validate(categoryIdValidator), async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({ message: 'دسته بندی یافت نشد' });
    }
    
    res.json(category);
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   POST /api/categories
// @desc    Create category (supports optional parent)
// @access  Private/Admin
router.post('/', [auth, adminAuth, validate(categoryValidators)], async (req, res) => {
  try {
    const { name, slug, description, image, parent } = req.body;
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: 'نام دسته بندی الزامی است' });
    }
    
    if (!image || !image.url) {
      return res.status(400).json({ message: 'تصویر دسته بندی الزامی است' });
    }
    
    // Generate slug if not provided
    const categorySlug = slug || name.toLowerCase().replace(/\s+/g, '-');
    
    // Check if category already exists with same name AND same parent
    // Allow duplicate names if they have different parents (subcategories can have same name under different parents)
    const existingCategoryQuery = {
      name: name.trim(),
      ...(parent ? { parent: parent } : { $or: [{ parent: null }, { parent: { $exists: false } }] })
    };
    
    const existingCategory = await Category.findOne(existingCategoryQuery);
    
    if (existingCategory) {
      const parentName = parent 
        ? (await Category.findById(parent))?.name || 'والد'
        : 'اصلی';
      return res.status(400).json({ 
        message: `دسته بندی با نام "${name.trim()}" در همین سطح (${parentName}) از قبل وجود دارد. لطفاً نام دیگری انتخاب کنید یا اگر می‌خواهید زیردسته دیگری با همین نام ایجاد کنید، ابتدا دسته والد متفاوتی انتخاب کنید.`,
        code: 'DUPLICATE_CATEGORY_NAME',
        existingCategory: {
          id: existingCategory._id,
          name: existingCategory.name,
          parent: existingCategory.parent
        }
      });
    }
    
    // Also check for duplicate slug globally (slug should be unique across all categories)
    const existingSlug = await Category.findOne({ slug: categorySlug });
    if (existingSlug) {
      return res.status(400).json({ 
        message: `slug "${categorySlug}" قبلاً استفاده شده است. لطفاً نام دیگری انتخاب کنید.`,
        code: 'DUPLICATE_CATEGORY_SLUG'
      });
    }
    
    const category = new Category({
      name: name.trim(),
      slug: categorySlug,
      description,
      image: {
        url: image.url,
        alt: image.alt || `تصویر ${name.trim()}`,
        public_id: image.public_id
      },
      parent: parent || null
    });
    
    await category.save();
    
    res.status(201).json({
      message: 'دسته بندی با موفقیت ایجاد شد',
      category
    });
  } catch (error) {
    console.error('Create category error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   PUT /api/categories/:id
// @desc    Update category
// @access  Private/Admin
router.put(
  '/:id',
  [
    auth,
    adminAuth,
    validate([
      ...categoryIdValidator,
      body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('نام دسته بندی باید بین 2 تا 100 کاراکتر باشد'),
      body('slug')
        .optional()
        .trim()
        .matches(/^[a-z0-9-]+$/)
        .withMessage('slug فقط باید شامل حروف کوچک انگلیسی، اعداد و خط تیره باشد')
        .isLength({ max: 120 })
        .withMessage('slug نباید بیشتر از 120 کاراکتر باشد'),
      body('description')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 500 })
        .withMessage('توضیحات نباید بیشتر از 500 کاراکتر باشد'),
      body('image')
        .optional()
        .custom((value) => {
          if (value === null) return true;
          if (typeof value !== 'object') {
            throw new Error('ساختار تصویر معتبر نیست');
          }
          if (!value.url) {
            throw new Error('آدرس تصویر دسته بندی الزامی است');
          }
          return true;
        }),
      body('image.url')
        .optional()
        .trim()
        .custom((value) => {
          if (!value) return true; // Optional field
          
          // Accept URLs with protocol (http:// or https://)
          const fullUrlPattern = /^https?:\/\/(localhost|127\.0\.0\.1|[\da-z\.-]+\.[a-z\.]{2,})(:\d+)?(\/.*)?$/i;
          // Accept relative paths starting with /uploads/
          const relativePathPattern = /^\/uploads\/.+/i;
          // Accept Cloudinary URLs
          const cloudinaryPattern = /^https?:\/\/res\.cloudinary\.com\/.+/i;
          
          if (fullUrlPattern.test(value) || relativePathPattern.test(value) || cloudinaryPattern.test(value)) {
            return true;
          }
          throw new Error('آدرس تصویر معتبر نیست');
        })
        .withMessage('آدرس تصویر معتبر نیست'),
      body('image.alt')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 150 })
        .withMessage('متن جایگزین تصویر نباید بیشتر از 150 کاراکتر باشد'),
      body('parent')
        .optional({ checkFalsy: true })
        .isMongoId()
        .withMessage('شناسه دسته والد معتبر نیست'),
    ]),
  ],
  async (req, res) => {
  try {
    const { name, slug, description, image, parent } = req.body;
    
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'دسته بندی یافت نشد' });
    }
    
    // Check if name is being changed and if it conflicts
    // Allow duplicate names if they have different parents
    if (name && name.trim() !== category.name) {
      const currentParent = parent !== undefined ? (parent || null) : category.parent;
      
      const existingCategoryQuery = {
        name: name.trim(),
        _id: { $ne: req.params.id },
        ...(currentParent ? { parent: currentParent } : { $or: [{ parent: null }, { parent: { $exists: false } }] })
      };
      
      const existingCategory = await Category.findOne(existingCategoryQuery);
      
      if (existingCategory) {
        const parentName = currentParent 
          ? (await Category.findById(currentParent))?.name || 'والد'
          : 'اصلی';
        return res.status(400).json({ 
          message: `دسته بندی با نام "${name.trim()}" در همین سطح (${parentName}) از قبل وجود دارد. لطفاً نام دیگری انتخاب کنید.`,
          code: 'DUPLICATE_CATEGORY_NAME',
          existingCategory: {
            id: existingCategory._id,
            name: existingCategory.name,
            parent: existingCategory.parent
          }
        });
      }
    }
    
    // Check for duplicate slug if slug is being changed
    if (slug && slug !== category.slug) {
      const existingSlug = await Category.findOne({ 
        slug, 
        _id: { $ne: req.params.id } 
      });
      
      if (existingSlug) {
        return res.status(400).json({ 
          message: `slug "${slug}" قبلاً استفاده شده است. لطفاً slug دیگری انتخاب کنید.`,
          code: 'DUPLICATE_CATEGORY_SLUG'
        });
      }
    }
    
    // Update fields
    if (name) category.name = name;
    if (slug) category.slug = slug;
    if (description !== undefined) category.description = description;
    if (image) category.image = image;
    if (parent !== undefined) category.parent = parent || null;
    
    await category.save();
    
    res.json({
      message: 'دسته بندی با موفقیت به‌روزرسانی شد',
      category
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   DELETE /api/categories/:id
// @desc    Delete category
// @access  Private/Admin
router.delete('/:id', [auth, adminAuth], async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'دسته بندی یافت نشد' });
    }
    
    // Check if category has children
    const childCategories = await Category.find({ parent: req.params.id });
    if (childCategories.length > 0) {
      return res.status(400).json({ 
        message: 'نمی‌توان دسته بندی را حذف کرد. ابتدا زیردسته‌ها را حذف کنید' 
      });
    }
    
    await Category.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'دسته بندی با موفقیت حذف شد' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   POST /api/categories/upload-image
// @desc    Upload category image
// @access  Private/Admin
router.post('/upload-image', [auth, adminAuth, upload.single('image')], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'فایل تصویر ارسال نشده' });
    }

    console.log('Uploading category image...');
    
    const result = await uploadToCloudinary(req.file.buffer, 'categories', req.file.originalname);
    
    const image = {
      url: result.secure_url,
      alt: req.body.alt || 'تصویر دسته بندی',
      public_id: result.public_id
    };

    console.log('Category image uploaded successfully:', image.url);

    res.json({
      message: 'تصویر با موفقیت آپلود شد',
      image
    });
  } catch (error) {
    console.error('Upload category image error:', error);
    res.status(500).json({ 
      message: error.message || 'خطا در آپلود تصویر'
    });
  }
});

module.exports = router;