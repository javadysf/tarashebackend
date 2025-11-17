const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Category = require('./models/Category');
const Product = require('./models/Product');
const Brand = require('./models/Brand');

// Sample data
const categories = [
  {
    name: 'باتری لپ تاپ',
    slug: 'battery-laptop',
    description: 'انواع باتری لپ تاپ برندهای مختلف',
    image: {
      url: '/uploads/categories/battery.jpg',
      alt: 'باتری لپ تاپ'
    },
    sortOrder: 1
  },
  {
    name: 'شارژر لپ تاپ',
    slug: 'charger-laptop',
    description: 'شارژرهای اصل و متعبر لپ تاپ',
    image: {
      url: '/uploads/categories/charger.jpg',
      alt: 'شارژر لپ تاپ'
    },
    sortOrder: 2
  },
  {
    name: 'قطعات لپ تاپ',
    slug: 'parts-laptop',
    description: 'قطعات یدکی و جانبی لپ تاپ',
    image: {
      url: '/uploads/categories/parts.jpg',
      alt: 'قطعات لپ تاپ'
    },
    sortOrder: 3
  },
  {
    name: 'لوازم جانبی',
    slug: 'accessories',
    description: 'لوازم جانبی کامپیوتر و لپ تاپ',
    image: {
      url: '/uploads/categories/accessories.jpg',
      alt: 'لوازم جانبی'
    },
    sortOrder: 4
  }
];

const brands = [
  {
    name: 'HP',
    description: 'برند آمریکایی تولیدکننده کامپیوتر و لپ‌تاپ',
    image: {
      url: '/uploads/brands/hp.png',
      alt: 'لوگوی HP',
      public_id: 'hp_logo'
    }
  },
  {
    name: 'Dell',
    description: 'برند آمریکایی تولیدکننده کامپیوتر و لپ‌تاپ',
    image: {
      url: '/uploads/brands/dell.png',
      alt: 'لوگوی Dell',
      public_id: 'dell_logo'
    }
  },
  {
    name: 'Lenovo',
    description: 'برند چینی تولیدکننده کامپیوتر و لپ‌تاپ',
    image: {
      url: '/uploads/brands/lenovo.png',
      alt: 'لوگوی Lenovo',
      public_id: 'lenovo_logo'
    }
  },
  {
    name: 'Asus',
    description: 'برند تایوانی تولیدکننده کامپیوتر و لپ‌تاپ',
    image: {
      url: '/uploads/brands/asus.png',
      alt: 'لوگوی Asus',
      public_id: 'asus_logo'
    }
  }
];

const users = [
  {
    name: 'مدیر',
    lastName: 'سیستم',
    email: 'admin@tarashe.com',
    password: 'admin123',
    role: 'admin',
    phone: '09123456789',
    phoneVerified: true
  },
  {
    name: 'کاربر',
    lastName: 'تست',
    email: 'user@test.com',
    password: 'user123',
    role: 'user',
    phone: '09987654321',
    phoneVerified: true
  }
];

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tarashe');
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    await Brand.deleteMany({});
    console.log('Cleared existing data');

    // Create users
    const createdUsers = [];
    for (const userData of users) {
      const user = new User(userData);
      await user.save();
      createdUsers.push(user);
      console.log(`Created user: ${user.email}`);
    }

    // Create categories
    const createdCategories = [];
    for (const categoryData of categories) {
      const category = new Category(categoryData);
      await category.save();
      createdCategories.push(category);
      console.log(`Created category: ${category.name}`);
    }

    // Create brands
    const createdBrands = [];
    for (const brandData of brands) {
      const brand = new Brand(brandData);
      await brand.save();
      createdBrands.push(brand);
      console.log(`Created brand: ${brand.name}`);
    }

    // Create sample products
    const batteryCategory = createdCategories.find(cat => cat.name === 'باتری لپ تاپ');
    const chargerCategory = createdCategories.find(cat => cat.name === 'شارژر لپ تاپ');
    const hpBrand = createdBrands.find(brand => brand.name === 'HP');
    const dellBrand = createdBrands.find(brand => brand.name === 'Dell');
    const lenovoBrand = createdBrands.find(brand => brand.name === 'Lenovo');
    const asusBrand = createdBrands.find(brand => brand.name === 'Asus');

    const products = [
      {
        name: 'باتری لپ تاپ HP Pavilion 15',
        description: 'باتری اصل و با کیفیت برای لپ تاپ HP Pavilion 15. دارای گارانتی 12 ماه ه و عملکرد بالا.',
        price: 850000,
        originalPrice: 1200000,
        category: batteryCategory._id,
        brand: hpBrand._id,
        model: 'Pavilion 15',
        stock: 25,
        images: [
          {
            url: '/pics/battery.jpg',
            alt: 'باتری HP Pavilion 15'
          }
        ],
        specifications: [
          { key: 'ولتاژ', value: '11.1V' },
          { key: 'ظرفیت', value: '4400mAh' },
          { key: 'تعداد سل', value: '6 سل' },
          { key: 'رنگ', value: 'مشکی' }
        ],
        tags: ['HP', 'Pavilion', 'باتری', 'لپ تاپ'],
        isFeatured: true,
        rating: {
          average: 4.8,
          count: 24
        }
      },
      {
        name: 'باتری لپ تاپ Dell Inspiron 15',
        description: 'باتری با کیفیت و دوام بالا برای لپ تاپ Dell Inspiron 15. مناسب برای استفاده روزانه.',
        price: 920000,
        originalPrice: 1100000,
        category: batteryCategory._id,
        brand: dellBrand._id,
        model: 'Inspiron 15 3000',
        stock: 18,
        images: [
          {
            url: '/pics/battery.jpg',
            alt: 'باتری Dell Inspiron 15'
          }
        ],
        specifications: [
          { key: 'ولتاژ', value: '14.8V' },
          { key: 'ظرفیت', value: '2600mAh' },
          { key: 'تعداد سل', value: '4 سل' },
          { key: 'رنگ', value: 'مشکی' }
        ],
        tags: ['Dell', 'Inspiron', 'باتری', 'لپ تاپ'],
        rating: {
          average: 4.6,
          count: 18
        }
      },
      {
        name: 'باتری لپ تاپ Lenovo ThinkPad E15',
        description: 'باتری اورجینال Lenovo ThinkPad با کیفیت عالی و عمر مفید بالا.',
        price: 1150000,
        category: batteryCategory._id,
        brand: lenovoBrand._id,
        model: 'ThinkPad E15',
        stock: 0,
        images: [
          {
            url: '/pics/battery.jpg',
            alt: 'باتری Lenovo ThinkPad E15'
          }
        ],
        specifications: [
          { key: 'ولتاژ', value: '11.1V' },
          { key: 'ظرفیت', value: '5200mAh' },
          { key: 'تعداد سل', value: '6 سل' },
          { key: 'رنگ', value: 'مشکی' }
        ],
        tags: ['Lenovo', 'ThinkPad', 'باتری', 'لپ تاپ'],
        rating: {
          average: 4.9,
          count: 31
        }
      },
      {
        name: 'شارژر لپ تاپ HP 65W',
        description: 'شارژر اصل HP با توان 65 وات. مناسب برای انواع لپ تاپهای HP.',
        price: 450000,
        originalPrice: 600000,
        category: chargerCategory._id,
        brand: hpBrand._id,
        model: '65W Original',
        stock: 35,
        images: [
          {
            url: '/pics/battery.jpg',
            alt: 'شارژر HP 65W'
          }
        ],
        specifications: [
          { key: 'توان', value: '65W' },
          { key: 'ولتاژ ورودی', value: '100-240V' },
          { key: 'ولتاژ خروجی', value: '19.5V' },
          { key: 'جریان خروجی', value: '3.33A' }
        ],
        tags: ['HP', 'شارژر', 'آداپتور', '65W'],
        isFeatured: true,
        rating: {
          average: 4.7,
          count: 42
        }
      },
      {
        name: 'باتری لپ تاپ Asus VivoBook 15',
        description: 'باتری با کیفیت برای لپ تاپ Asus VivoBook. عملکرد مطمئن و قیمت مناسب.',
        price: 780000,
        originalPrice: 950000,
        category: batteryCategory._id,
        brand: asusBrand._id,
        model: 'VivoBook 15',
        stock: 22,
        images: [
          {
            url: '/pics/battery.jpg',
            alt: 'باتری Asus VivoBook 15'
          }
        ],
        specifications: [
          { key: 'ولتاژ', value: '11.25V' },
          { key: 'ظرفیت', value: '3350mAh' },
          { key: 'تعداد سل', value: '3 سل' },
          { key: 'رنگ', value: 'مشکی' }
        ],
        tags: ['Asus', 'VivoBook', 'باتری', 'لپ تاپ'],
        rating: {
          average: 4.5,
          count: 16
        }
      }
    ];

    for (const productData of products) {
      const product = new Product(productData);
      await product.save();
      console.log(`Created product: ${product.name}`);
    }

    console.log('Database seeded successfully!');
    console.log('\\nLogin credentials:');
    console.log('Admin: admin@tarashe.com / admin123');
    console.log('User: user@test.com / user123');

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the seed function
seedDatabase();