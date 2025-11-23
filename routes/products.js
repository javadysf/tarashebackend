const express = require('express');
const Product = require('../models/Product');
const mongoose = require('mongoose');
const Review = require('../models/Review');
const { auth, adminAuth } = require('../middleware/auth');
const { upload, uploadToCloudinary } = require('../middleware/upload');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate');
const { logActivity } = require('../utils/activityLogger');

// Determine PUBLIC_BASE_URL based on environment
const getPublicBaseUrl = () => {
  if (process.env.PUBLIC_BASE_URL) {
    return process.env.PUBLIC_BASE_URL;
  }
  // For development, use localhost with PORT
  const PORT = process.env.PORT || 4000;
  const isProduction = process.env.NODE_ENV === 'production';
  return isProduction ? 'https://api.tarasheh.net' : `http://localhost:${PORT}`;
};

const PUBLIC_BASE_URL = getPublicBaseUrl();

const router = express.Router();

const productBaseValidators = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('نام محصول الزامی است')
    .isLength({ min: 2, max: 200 })
    .withMessage('نام محصول باید بین 2 تا 200 کاراکتر باشد'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('توضیحات محصول الزامی است')
    .isLength({ min: 10, max: 2000 })
    .withMessage('توضیحات محصول باید بین 10 تا 2000 کاراکتر باشد'),
  body('price')
    .notEmpty()
    .withMessage('قیمت محصول الزامی است')
    .isFloat({ min: 0 })
    .withMessage('قیمت محصول باید عددی مثبت باشد')
    .toFloat(),
  body('originalPrice')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('قیمت اصلی باید عددی مثبت باشد')
    .toFloat(),
  body('discountPrice')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('قیمت با تخفیف باید عددی مثبت باشد')
    .toFloat(),
  body('stock')
    .notEmpty()
    .withMessage('موجودی محصول الزامی است')
    .isInt({ min: 0 })
    .withMessage('موجودی محصول باید عددی نامنفی باشد')
    .toInt(),
  body('category')
    .notEmpty()
    .withMessage('دسته‌بندی محصول الزامی است')
    .isMongoId()
    .withMessage('شناسه دسته‌بندی معتبر نیست'),
  body('brand')
    .notEmpty()
    .withMessage('برند محصول الزامی است')
    .isMongoId()
    .withMessage('شناسه برند معتبر نیست'),
  body('images')
    .isArray({ min: 1 })
    .withMessage('حداقل یک تصویر برای محصول الزامی است'),
  body('images.*.url')
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
  body('images.*.alt')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 150 })
    .withMessage('متن جایگزین تصویر نباید بیش از 150 کاراکتر باشد'),
  body('specifications')
    .optional({ checkFalsy: true })
    .isArray()
    .withMessage('مشخصات محصول باید در قالب آرایه ارسال شوند'),
  body('specifications.*.key')
    .optional({ checkFalsy: true })
    .trim()
    .notEmpty()
    .withMessage('کلید مشخصه نمی‌تواند خالی باشد')
    .isLength({ max: 100 })
    .withMessage('کلید مشخصه نباید بیشتر از 100 کاراکتر باشد'),
  body('specifications.*.value')
    .optional({ checkFalsy: true })
    .trim()
    .notEmpty()
    .withMessage('مقدار مشخصه نمی‌تواند خالی باشد')
    .isLength({ max: 500 })
    .withMessage('مقدار مشخصه نباید بیشتر از 500 کاراکتر باشد'),
  body('tags')
    .optional({ checkFalsy: true })
    .isArray({ max: 25 })
    .withMessage('برچسب‌ها باید به صورت آرایه و حداکثر 25 مورد باشند'),
  body('tags.*')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage('هر برچسب نباید بیشتر از 50 کاراکتر باشد'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('وضعیت فعال بودن محصول معتبر نیست')
    .toBoolean(),
  body('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('وضعیت ویژه بودن محصول معتبر نیست')
    .toBoolean(),
  body('isAccessory')
    .optional()
    .isBoolean()
    .withMessage('وضعیت متعلق بودن محصول معتبر نیست')
    .toBoolean(),
];

const productIdValidator = [
  param('id').isMongoId().withMessage('شناسه محصول معتبر نیست'),
];

// Configure multer for product image uploads
const productImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/products');
    
    // Create folder if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'product-' + uniqueSuffix + ext);
  }
});

const productImageUpload = multer({
  storage: productImageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('فقط فایل‌های تصویری مجاز هستند'), false);
    }
  }
});

// NOTE: This endpoint is deprecated. Use the one below that supports Cloudinary.
// Keeping for backward compatibility but it will be removed in future versions.

// @route   GET /api/products
// @desc    Get all products
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, category, brand, search, sort, featured, isFeatured, isAccessory, isActive } = req.query;
    
    let query = {};
    
    // Filter by category (deep: include descendants)
    if (category) {
      // collect all descendant category ids
      const Category = require('../models/Category');
      const rootObjId = mongoose.Types.ObjectId.isValid(category) ? new mongoose.Types.ObjectId(category) : null;
      if (!rootObjId) {
        return res.json({ products: [], pagination: { currentPage: page, totalPages: 0, totalProducts: 0, hasNext: false, hasPrev: false } });
      }
      const ids = [rootObjId];
      const queue = [rootObjId];
      const seen = new Set([String(rootObjId)]);
      while (queue.length) {
        const current = queue.shift();
        // fetch direct children
        const children = await Category.find({ parent: current }).select('_id').lean();
        for (const ch of children) {
          const id = String(ch._id);
          if (!seen.has(id)) {
            seen.add(id);
            ids.push(ch._id);
            queue.push(ch._id);
          }
        }
      }
      query.category = { $in: ids };
    }
    
    // Filter by brand
    if (brand) {
      const brandObjId = mongoose.Types.ObjectId.isValid(brand) ? new mongoose.Types.ObjectId(brand) : null;
      if (brandObjId) {
        query.brand = brandObjId;
      }
    }
    
    // Filter by accessory flag
    if (typeof isAccessory === 'string') {
      if (isAccessory === 'true') {
        query.isAccessory = true;
      } else if (isAccessory === 'false') {
        query.isAccessory = false;
      }
    }
    
    // Filter by active status
    if (typeof isActive === 'string') {
      if (isActive === 'true') {
        query.isActive = true;
      } else if (isActive === 'false') {
        query.isActive = false;
      }
    }
    
    // Filter by featured
    if (featured === 'true' || isFeatured === 'true') {
      query.isFeatured = true;
    }
    
    // Search functionality
    if (search) {
      // First, find brands that match the search term
      const Brand = require('../models/Brand');
      const matchingBrands = await Brand.find({ 
        name: { $regex: search, $options: 'i' } 
      }).select('_id');
      
      const brandIds = matchingBrands.map(brand => brand._id);
      
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } }
      ];
      
      // Add brand search if any brands match
      if (brandIds.length > 0) {
        query.$or.push({ brand: { $in: brandIds } });
      }
    }
    
    // Sort options
    let sortOption = {};
    let aggregationPipeline = [];
    
    // Base match stage
    aggregationPipeline.push({ $match: query });
    
    if (sort === 'discount') {
      // Add discount calculation and sort by discount percentage
      aggregationPipeline.push({
        $addFields: {
          discountPercentage: {
            $cond: {
              if: { $and: [{ $gt: ['$originalPrice', 0] }, { $lt: ['$price', '$originalPrice'] }] },
              then: {
                $multiply: [
                  { $divide: [{ $subtract: ['$originalPrice', '$price'] }, '$originalPrice'] },
                  100
                ]
              },
              else: 0
            }
          }
        }
      });
      aggregationPipeline.push({ $sort: { discountPercentage: -1 } });
    } else {
      switch (sort) {
        case 'price-asc':
          sortOption = { price: 1 };
          break;
        case 'price-desc':
          sortOption = { price: -1 };
          break;
        case 'rating':
          sortOption = { 'rating.average': -1 };
          break;
        case 'name':
          sortOption = { name: 1 };
          break;
        default:
          sortOption = { createdAt: -1 };
      }
      aggregationPipeline.push({ $sort: sortOption });
    }
    
    // Add pagination and populate
    aggregationPipeline.push({ $skip: (page - 1) * limit });
    aggregationPipeline.push({ $limit: limit * 1 });
    aggregationPipeline.push({
      $lookup: {
        from: 'categories',
        localField: 'category',
        foreignField: '_id',
        as: 'category'
      }
    });
    aggregationPipeline.push({
      $unwind: {
        path: '$category',
        preserveNullAndEmptyArrays: true
      }
    });
    aggregationPipeline.push({
      $lookup: {
        from: 'brands',
        localField: 'brand',
        foreignField: '_id',
        as: 'brand'
      }
    });
    aggregationPipeline.push({
      $unwind: {
        path: '$brand',
        preserveNullAndEmptyArrays: true
      }
    });
    
    // Lookup accessories
    aggregationPipeline.push({
      $lookup: {
        from: 'products',
        localField: 'accessories.accessory',
        foreignField: '_id',
        as: 'accessoryDetails'
      }
    });
    
    aggregationPipeline.push({
      $addFields: {
        accessories: {
          $map: {
            input: '$accessories',
            as: 'acc',
            in: {
              $mergeObjects: [
                '$$acc',
                {
                  accessory: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: '$accessoryDetails',
                          cond: { $eq: ['$$this._id', '$$acc.accessory'] }
                        }
                      },
                      0
                    ]
                  }
                }
              ]
            }
          }
        }
      }
    });
    
    aggregationPipeline.push({
      $project: {
        'category._id': 1,
        'category.name': 1,
        'category.slug': 1,
        brand: {
          $ifNull: ['$brand', { _id: null, name: 'بدون برند' }]
        },
        name: 1,
        description: 1,
        price: 1,
        originalPrice: 1,
        model: 1,
        stock: 1,
        images: 1,
        rating: 1,
        isFeatured: 1,
        attributes: 1,
        accessories: {
          $map: {
            input: '$accessories',
            as: 'acc',
            in: {
              _id: '$$acc._id',
              accessory: {
                _id: '$$acc.accessory._id',
                name: '$$acc.accessory.name',
                price: '$$acc.accessory.price',
                images: '$$acc.accessory.images'
              },
              isSuggested: '$$acc.isSuggested',
              bundleDiscount: '$$acc.bundleDiscount',
              displayOrder: '$$acc.displayOrder'
            }
          }
        },
        createdAt: 1,
        discountPercentage: 1
      }
    });
    
    const products = await Product.aggregate(aggregationPipeline);
    
    const total = await Product.countDocuments(query);
    
    res.json({
      products,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalProducts: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   GET /api/products/best-selling
// @desc    Get best-selling products by total quantity sold
// @access  Public
router.get('/best-selling', async (req, res) => {
  try {
    const limit = Number(req.query.limit || 8)
    const Order = require('../models/Order')

    // Aggregate top product IDs by sold quantity
    const agg = await Order.aggregate([
      { $unwind: '$items' },
      { $group: { _id: '$items.product', totalSold: { $sum: '$items.quantity' } } },
      { $sort: { totalSold: -1 } },
      { $limit: limit }
    ])

    const topIds = agg.map(a => a._id)

    const products = await Product.find({ _id: { $in: topIds } })
      .populate('category', 'name')
      .select('name price images rating category stock')
      .lean()

    // Preserve order by totalSold
    const byId = new Map(products.map(p => [String(p._id), p]))
    const ordered = topIds.map(id => byId.get(String(id))).filter(Boolean)

    res.json({ products: ordered, count: ordered.length })
  } catch (error) {
    console.error('Best-selling products error:', error)
    res.status(500).json({ message: 'خطا در سرور' })
  }
})

// @route   GET /api/products/:id
// @desc    Get single product
// @access  Public
router.get('/:id', validate(productIdValidator), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name slug')
      .populate('brand', 'name image')
      .populate('accessories.accessory', 'name price images');
    
    if (!product) {
      return res.status(404).json({ message: 'محصول یافت نشد' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   POST /api/products
// @desc    Create product
// @access  Private/Admin
router.post('/', [auth, adminAuth, validate(productBaseValidators)], async (req, res) => {
  try {
    const { accessories, ...productData } = req.body;
    
    const product = new Product(productData);
    await product.save();
    
    // Add accessories if provided
    if (accessories && accessories.length > 0) {
      for (const accessoryId of accessories) {
        // Verify accessory exists (any product can be an accessory)
        const accessory = await Product.findById(accessoryId);
        if (accessory) {
          product.accessories.push({
            accessory: accessoryId,
            isSuggested: true,
            bundleDiscount: 0,
            displayOrder: product.accessories.length
          });
        }
      }
      await product.save();
    }
    
    const populatedProduct = await Product.findById(product._id)
      .populate('category', 'name slug')
      .populate('accessories.accessory', 'name price images');
    
    // Log activity
    await logActivity({
      user: req.user,
      action: 'product_create',
      entity: 'product',
      entityId: product._id,
      description: `ایجاد محصول: ${product.name}`,
      metadata: { productName: product.name, category: product.category },
      req
    });
    
    res.status(201).json({
      message: 'محصول با موفقیت ایجاد شد',
      product: populatedProduct
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Private/Admin
router.put(
  '/:id',
  [
    auth,
    adminAuth,
    upload.array('images', 10),
    validate([
      ...productIdValidator,
      body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 200 })
        .withMessage('نام محصول باید بین 2 تا 200 کاراکتر باشد'),
      body('description')
        .optional()
        .trim()
        .isLength({ min: 10, max: 2000 })
        .withMessage('توضیحات محصول باید بین 10 تا 2000 کاراکتر باشد'),
      body('price')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('قیمت محصول باید عددی مثبت باشد')
        .toFloat(),
      body('originalPrice')
        .optional({ checkFalsy: true })
        .isFloat({ min: 0 })
        .withMessage('قیمت اصلی باید عددی مثبت باشد')
        .toFloat(),
      body('discountPrice')
        .optional({ checkFalsy: true })
        .isFloat({ min: 0 })
        .withMessage('قیمت با تخفیف باید عددی مثبت باشد')
        .toFloat(),
      body('stock')
        .optional()
        .isInt({ min: 0 })
        .withMessage('موجودی محصول باید عددی نامنفی باشد')
        .toInt(),
      body('category')
        .optional()
        .isMongoId()
        .withMessage('شناسه دسته‌بندی معتبر نیست'),
      body('brand')
        .optional()
        .isMongoId()
        .withMessage('شناسه برند معتبر نیست'),
      body('isActive')
        .optional()
        .isBoolean()
        .withMessage('وضعیت فعال بودن محصول معتبر نیست')
        .toBoolean(),
      body('isFeatured')
        .optional()
        .isBoolean()
        .withMessage('وضعیت ویژه بودن محصول معتبر نیست')
        .toBoolean(),
      body('isAccessory')
        .optional()
        .isBoolean()
        .withMessage('وضعیت متعلق بودن محصول معتبر نیست')
        .toBoolean(),
    ]),
  ],
  async (req, res) => {
  try {
    const { name, description, price, originalPrice, discountPrice, brand, category, stock, existingImages, attributes, accessories } = req.body;
    
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'محصول یافت نشد' });
    }

    // Parse existing images
    let parsedExistingImages = [];
    if (existingImages) {
      try {
        parsedExistingImages = JSON.parse(existingImages);
      } catch (error) {
        console.error('Error parsing existing images:', error);
      }
    }

    // Upload new images
    const newImages = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const result = await uploadToCloudinary(file.buffer, 'products', file.originalname);
          
          newImages.push({
            url: result.secure_url,
            alt: name,
            public_id: result.public_id
          });
        } catch (error) {
          console.error('Error uploading image:', error);
        }
      }
    }

    // Combine existing and new images
    const allImages = [...parsedExistingImages, ...newImages];

    // Parse attributes
    let parsedAttributes = {};
    if (attributes) {
      try {
        const attributesArray = JSON.parse(attributes);
        // Convert array to Map format
        attributesArray.forEach(attr => {
          parsedAttributes[attr.attribute] = attr.value;
        });
      } catch (error) {
        console.error('Error parsing attributes:', error);
      }
    }

    // Parse and update accessories
    let parsedAccessories = [];
    if (accessories) {
      try {
        const accessoriesArray = JSON.parse(accessories);
        // Convert accessory IDs to accessory objects
        for (const accessoryId of accessoriesArray) {
          const accessory = await Product.findById(accessoryId);
          if (accessory) {
            parsedAccessories.push({
              accessory: accessoryId,
              isSuggested: true,
              bundleDiscount: 0,
              displayOrder: parsedAccessories.length
            });
          }
        }
      } catch (error) {
        console.error('Error parsing accessories:', error);
      }
    }

    // Update product
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        price: parseFloat(price),
        originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
        brand,
        category,
        model: req.body.model || '',
        stock: parseInt(stock),
        images: allImages,
        attributes: parsedAttributes,
        accessories: parsedAccessories
      },
      { new: true }
    ).populate('category', 'name')
     .populate('accessories.accessory', 'name price images');

    // Log activity
    await logActivity({
      user: req.user,
      action: 'product_update',
      entity: 'product',
      entityId: updatedProduct._id,
      description: `بروزرسانی محصول: ${updatedProduct.name}`,
      metadata: { productName: updatedProduct.name },
      req
    });

    res.json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'خطا در بهروزرسانی محصول' });
  }
});

// @route   DELETE /api/products/:id
// @desc    Delete product
// @access  Private/Admin
router.delete('/:id', [auth, adminAuth, validate(productIdValidator)], async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'محصول یافت نشد' });
    }
    
    const productName = product.name;
    await Product.findByIdAndDelete(req.params.id);
    
    // Log activity
    await logActivity({
      user: req.user,
      action: 'product_delete',
      entity: 'product',
      entityId: req.params.id,
      description: `حذف محصول: ${productName}`,
      metadata: { productName },
      req
    });
    
    res.json({ message: 'محصول با موفقیت حذف شد' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   GET /api/products/:id/reviews
// @desc    Get product reviews with replies
// @access  Public
router.get('/:id/reviews', async (req, res) => {
  try {
    // Get main reviews (not replies)
    const mainReviews = await Review.find({ 
      product: req.params.id, 
      parentReview: null 
    })
      .populate('user', 'name')
      .sort({ createdAt: -1 });
    
    // Get replies for each review
    const reviewsWithReplies = await Promise.all(
      mainReviews.map(async (review) => {
        const replies = await Review.find({ parentReview: review._id })
          .populate('user', 'name')
          .sort({ createdAt: 1 });
        
        return {
          ...review.toObject(),
          replies,
          likesCount: review.likes.length,
          dislikesCount: review.dislikes.length
        };
      })
    );
    
    res.json({ reviews: reviewsWithReplies });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   POST /api/products/:id/reviews
// @desc    Create product review
// @access  Private
router.post('/:id/reviews', auth, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    
    // Check if product exists
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'محصول یافت نشد' });
    }
    
    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
      product: req.params.id,
      user: req.user._id
    });
    
    if (existingReview) {
      return res.status(400).json({ message: 'شما قبلاً برای این محصول نظر ثبت کردهاید' });
    }
    
    // Create review
    const review = new Review({
      product: req.params.id,
      user: req.user._id,
      rating,
      comment
    });
    
    await review.save();
    
    // Update product rating
    const reviews = await Review.find({ product: req.params.id });
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    
    await Product.findByIdAndUpdate(req.params.id, {
      'rating.average': avgRating,
      'rating.count': reviews.length
    });
    
    const populatedReview = await Review.findById(review._id).populate('user', 'name');
    
    res.status(201).json({
      message: 'نظر با موفقیت ثبت شد',
      review: populatedReview
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   POST /api/products/upload-images
// @desc    Upload product images (supports Cloudinary and local storage)
// @access  Private/Admin
router.post('/upload-images', [auth, adminAuth, upload.array('images', 20)], async (req, res) => {
  try {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 [شروع آپلود] درخواست آپلود تصاویر محصول دریافت شد');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📦 تعداد فایل‌ها:', req.files?.length || 0);
    console.log('👤 کاربر:', req.user?.name || req.user?.email || 'نامشخص');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (!req.files || req.files.length === 0) {
      console.error('❌ [خطا] هیچ فایلی ارسال نشده است');
      return res.status(400).json({ message: 'فایل تصویر ارسال نشده' });
    }

    console.log('🔄 [در حال پردازش] شروع فرآیند آپلود...\n');
    
    // Upload files with individual error handling - don't fail all if one fails
    const uploadPromises = req.files.map(async (file, index) => {
      try {
        console.log(`Uploading file ${index + 1}/${req.files.length}:`, {
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size
        });
        
        const result = await uploadToCloudinary(file.buffer, 'products', file.originalname);
        
        // Log detailed upload result
        const storageType = result.storage_type || 'unknown';
        const storageIcon = storageType === 'cloudinary' ? '☁️' : '📁';
        console.log(`\n${storageIcon} [${storageType.toUpperCase()}] فایل ${index + 1}/${req.files.length} آپلود شد:`);
        console.log(`   📄 نام: ${file.originalname}`);
        console.log(`   🔗 URL: ${result.secure_url}`);
        console.log(`   📊 حجم: ${(file.size / 1024).toFixed(2)} KB`);
        console.log(`   🆔 Public ID: ${result.public_id}`);
        console.log(`   ✅ وضعیت: موفق\n`);
        
        return { success: true, result, index };
      } catch (error) {
        console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error(`❌ [خطا] خطا در آپلود فایل ${index + 1}/${req.files.length}`);
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error(`📄 نام فایل: ${file.originalname}`);
        console.error(`💬 پیام خطا: ${error.message || 'خطای نامشخص'}`);
        console.error('🔄 در حال تلاش برای ذخیره در سرور محلی...');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        // Even if upload fails, try to save locally as last resort
        try {
          const { uploadToLocal } = require('../middleware/upload');
          const localResult = await uploadToLocal(file.buffer, 'products', file.originalname);
          console.log(`✅ فایل ${index + 1} با موفقیت در سرور محلی ذخیره شد (fallback)`);
          return { success: true, result: localResult, index };
        } catch (localError) {
          console.error(`❌ خطا در ذخیره فایل ${index + 1} در سرور محلی:`, localError.message);
          // Return error but don't throw - we'll handle it later
          return { success: false, error: error.message || 'خطا در آپلود فایل', index };
        }
      }
    });
    
    // Wait for all uploads to complete (even if some fail)
    const uploadResults = await Promise.allSettled(uploadPromises);
    
    // Process results
    const results = [];
    const errors = [];
    
    uploadResults.forEach((settled, index) => {
      if (settled.status === 'fulfilled') {
        const uploadResult = settled.value;
        if (uploadResult.success) {
          results.push(uploadResult.result);
        } else {
          errors.push({
            file: req.files[index]?.originalname || `فایل ${index + 1}`,
            error: uploadResult.error
          });
        }
      } else {
        errors.push({
          file: req.files[index]?.originalname || `فایل ${index + 1}`,
          error: settled.reason?.message || 'خطای نامشخص'
        });
      }
    });
    
    // If no files were uploaded successfully, return error
    if (results.length === 0) {
      return res.status(400).json({
        message: 'هیچ فایلی آپلود نشد',
        errors: errors.map(e => `${e.file}: ${e.error}`)
      });
    }
    
    // Check if any files were saved locally
    const localFiles = results.filter(r => r.storage_type === 'local');
    const cloudinaryFiles = results.filter(r => r.storage_type === 'cloudinary');
    
    const images = results.map((result, index) => ({
      url: result.secure_url,
      alt: req.body.alt || `تصویر محصول ${index + 1}`,
      public_id: result.public_id,
      storage_type: result.storage_type || 'unknown'
    }));

    // Final summary log
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 [خلاصه آپلود] نتیجه نهایی');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ کل فایل‌های آپلود شده: ${images.length}`);
    console.log(`☁️  آپلود شده در Cloudinary: ${cloudinaryFiles.length}`);
    console.log(`📁 آپلود شده در سرور محلی: ${localFiles.length}`);
    if (errors.length > 0) {
      console.log(`❌ فایل‌های ناموفق: ${errors.length}`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Log each file's storage location
    if (cloudinaryFiles.length > 0) {
      console.log('☁️  فایل‌های آپلود شده در Cloudinary:');
      cloudinaryFiles.forEach((file, idx) => {
        console.log(`   ${idx + 1}. ${file.public_id} → ${file.secure_url}`);
      });
      console.log('');
    }
    
    if (localFiles.length > 0) {
      console.log('📁 فایل‌های آپلود شده در سرور محلی:');
      localFiles.forEach((file, idx) => {
        console.log(`   ${idx + 1}. ${file.public_id} → ${file.secure_url}`);
      });
      console.log('');
    }

    // Prepare response with warnings if needed
    const response = {
      message: `${images.length} تصویر با موفقیت آپلود شد`,
      images,
      count: images.length,
      storage_summary: {
        cloudinary: cloudinaryFiles.length,
        local: localFiles.length
      }
    };

    // Add warning if any files were saved locally (this is NOT an error)
    if (localFiles.length > 0) {
      response.warning = localFiles.length === images.length
        ? 'تمام تصاویر در سرور محلی ذخیره شدند. برای بهینه‌سازی بهتر، تنظیمات Cloudinary را فعال کنید.'
        : `${localFiles.length} تصویر در سرور محلی ذخیره شدند. برای بهینه‌سازی بهتر، تنظیمات Cloudinary را فعال کنید.`;
      
      console.warn('⚠️ WARNING: Some files were saved locally:', {
        count: localFiles.length,
        files: localFiles.map(f => f.public_id)
      });
    }

    // Add warnings for failed files (but don't fail the whole request)
    if (errors.length > 0) {
      response.warnings = response.warnings || [];
      errors.forEach(err => {
        response.warnings.push(`${err.file}: ${err.error}`);
      });
      console.warn('⚠️ Some files failed to upload:', errors);
    }

    // Always return 200 if at least one file was uploaded successfully
    // Warnings are included in response but don't cause error status
    res.status(200).json(response);
  } catch (error) {
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ [خطای بحرانی] خطا در فرآیند آپلود تصاویر');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('💬 پیام خطا:', error.message);
    console.error('📊 Stack:', error.stack);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Only return error if it's a critical error (not related to storage)
    res.status(500).json({ 
      message: error.message || 'خطا در آپلود تصاویر',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/products/reviews/all
// @desc    Get all reviews (admin)
// @access  Private/Admin
router.get('/reviews/all', [auth, adminAuth], async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('user', 'name email')
      .populate('product', 'name')
      .sort({ createdAt: -1 });
    
    res.json({ reviews });
  } catch (error) {
    console.error('Get all reviews error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   GET /api/products/best-selling
// @desc    Get best-selling products by total quantity sold
// @access  Public

// @route   POST /api/products/reviews/:id/reply
// @desc    Reply to a review (admin only)
// @access  Private/Admin
router.post('/reviews/:id/reply', [auth, adminAuth], async (req, res) => {
  try {
    const { comment } = req.body;
    const parentReview = await Review.findById(req.params.id);
    
    if (!parentReview) {
      return res.status(404).json({ message: 'نظر یافت نشد' });
    }
    
    const reply = new Review({
      product: parentReview.product,
      user: req.user._id,
      rating: 5, // Admin replies don't affect rating
      comment,
      parentReview: req.params.id,
      isAdminReply: true
    });
    
    await reply.save();
    
    const populatedReply = await Review.findById(reply._id).populate('user', 'name');
    
    res.status(201).json({
      message: 'پاسخ با موفقیت ثبت شد',
      reply: populatedReply
    });
  } catch (error) {
    console.error('Reply to review error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   POST /api/products/reviews/:id/like
// @desc    Like a review
// @access  Private
router.post('/reviews/:id/like', auth, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({ message: 'نظر یافت نشد' });
    }
    
    // Remove from dislikes if exists
    review.dislikes = review.dislikes.filter(id => !id.equals(req.user._id));
    
    // Toggle like
    const likeIndex = review.likes.findIndex(id => id.equals(req.user._id));
    if (likeIndex > -1) {
      review.likes.splice(likeIndex, 1);
    } else {
      review.likes.push(req.user._id);
    }
    
    await review.save();
    
    res.json({ 
      message: 'عملیات با موفقیت انجام شد',
      likes: review.likes.length,
      dislikes: review.dislikes.length
    });
  } catch (error) {
    console.error('Like review error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   POST /api/products/reviews/:id/dislike
// @desc    Dislike a review
// @access  Private
router.post('/reviews/:id/dislike', auth, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({ message: 'نظر یافت نشد' });
    }
    
    // Remove from likes if exists
    review.likes = review.likes.filter(id => !id.equals(req.user._id));
    
    // Toggle dislike
    const dislikeIndex = review.dislikes.findIndex(id => id.equals(req.user._id));
    if (dislikeIndex > -1) {
      review.dislikes.splice(dislikeIndex, 1);
    } else {
      review.dislikes.push(req.user._id);
    }
    
    await review.save();
    
    res.json({ 
      message: 'عملیات با موفقیت انجام شد',
      likes: review.likes.length,
      dislikes: review.dislikes.length
    });
  } catch (error) {
    console.error('Dislike review error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   PUT /api/products/reviews/:id
// @desc    Update review (admin only for replies)
// @access  Private/Admin
router.put('/reviews/:id', [auth, adminAuth], async (req, res) => {
  try {
    const { comment } = req.body;
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({ message: 'نظر یافت نشد' });
    }
    
    // Only allow editing admin replies
    if (!review.isAdminReply) {
      return res.status(403).json({ message: 'فقط پاسخ‌های ادمین قابل ویرایش هستند' });
    }
    
    review.comment = comment;
    await review.save();
    
    const updatedReview = await Review.findById(review._id).populate('user', 'name');
    
    res.json({
      message: 'پاسخ با موفقیت ویرایش شد',
      review: updatedReview
    });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   DELETE /api/products/reviews/:id
// @desc    Delete review (admin)
// @access  Private/Admin
router.delete('/reviews/:id', [auth, adminAuth], async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({ message: 'نظر یافت نشد' });
    }
    
    // Delete review and its replies
    await Review.deleteMany({ $or: [{ _id: req.params.id }, { parentReview: req.params.id }] });
    
    // Update product rating (only for main reviews, not replies)
    if (!review.parentReview) {
      const reviews = await Review.find({ product: review.product, parentReview: null });
      const avgRating = reviews.length > 0 
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
        : 0;
      
      await Product.findByIdAndUpdate(review.product, {
        'rating.average': avgRating,
        'rating.count': reviews.length
      });
    }
    
    res.json({ message: 'نظر با موفقیت حذف شد' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   GET /api/products/:id/likes/count
// @desc    Get product likes count
// @access  Public
router.get('/:id/likes/count', async (req, res) => {
  try {
    const User = require('../models/User');
    const count = await User.countDocuments({
      likedProducts: req.params.id
    });
    
    res.json({ count });
  } catch (error) {
    console.error('Get likes count error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// Add accessory to product
router.post('/:productId/accessories', [auth, adminAuth], async (req, res) => {
  try {
    const { accessoryId, isSuggested, bundleDiscount, displayOrder } = req.body
    
    const product = await Product.findById(req.params.productId)
    if (!product) {
      return res.status(404).json({ message: 'محصول یافت نشد' })
    }
    
    const accessory = await Product.findById(accessoryId)
    if (!accessory) {
      return res.status(404).json({ message: 'متعلق یافت نشد' })
    }
    
    // Any product can be an accessory, no need to check isAccessory flag
    
    // Check if accessory already exists in product
    const existingAccessory = product.accessories.find(
      acc => acc.accessory.toString() === accessoryId
    )
    
    if (existingAccessory) {
      return res.status(400).json({ message: 'این متعلق قبلاً به محصول اضافه شده است' })
    }
    
    product.accessories.push({
      accessory: accessoryId,
      isSuggested: isSuggested !== undefined ? isSuggested : true,
      bundleDiscount: bundleDiscount || 0,
      displayOrder: displayOrder || product.accessories.length
    })
    
    await product.save()
    
    const populatedProduct = await Product.findById(product._id)
      .populate('accessories.accessory', 'name price images')
      .populate('category', 'name')
      .populate('brand', 'name')
    
    res.json({
      message: 'متعلق با موفقیت به محصول اضافه شد',
      product: populatedProduct
    })
  } catch (error) {
    console.error('Error adding accessory to product:', error)
    res.status(500).json({ message: 'خطا در سرور' })
  }
})

// Get product accessories
router.get('/:productId/accessories', async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId)
      .populate('accessories.accessory', 'name price images description')
    
    if (!product) {
      return res.status(404).json({ message: 'محصول یافت نشد' })
    }
    
    res.json({ accessories: product.accessories })
  } catch (error) {
    console.error('Error getting product accessories:', error)
    res.status(500).json({ message: 'خطا در سرور' })
  }
})

// Remove accessory from product
router.delete('/:productId/accessories/:accessoryId', [auth, adminAuth], async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId)
    if (!product) {
      return res.status(404).json({ message: 'محصول یافت نشد' })
    }
    
    product.accessories = product.accessories.filter(
      acc => acc.accessory.toString() !== req.params.accessoryId
    )
    
    await product.save()
    
    res.json({ message: 'متعلق با موفقیت از محصول حذف شد' })
  } catch (error) {
    console.error('Error removing accessory from product:', error)
    res.status(500).json({ message: 'خطا در سرور' })
  }
})

module.exports = router;