// Mock data for development when database is not connected
const mockProducts = [
  {
    _id: '507f1f77bcf86cd799439011',
    name: 'گوشی موبایل سامسونگ گلکسی A54',
    description: 'گوشی موبایل سامسونگ گلکسی A54 با صفحه نمایش 6.4 اینچی و دوربین 50 مگاپیکسلی',
    price: 8500000,
    originalPrice: 9500000,
    category: {
      _id: '507f1f77bcf86cd799439012',
      name: 'گوشی موبایل',
      slug: 'mobile-phones'
    },
    brand: {
      _id: '507f1f77bcf86cd799439013',
      name: 'سامسونگ',
      image: '/uploads/brands/samsung.png'
    },
    model: 'Galaxy A54',
    images: [
      {
        url: '/uploads/products/samsung-a54-1.jpg',
        alt: 'گوشی سامسونگ گلکسی A54'
      }
    ],
    stock: 15,
    isActive: true,
    isFeatured: true,
    rating: {
      average: 4.2,
      count: 25
    },
    attributes: {
      'رنگ': 'مشکی',
      'حافظه داخلی': '128 گیگابایت',
      'RAM': '6 گیگابایت'
    },
    accessories: [],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  },
  {
    _id: '507f1f77bcf86cd799439014',
    name: 'لپ‌تاپ ایسوس ویووبوک S15',
    description: 'لپ‌تاپ ایسوس ویووبوک S15 با پردازنده Intel Core i5 و حافظه 8 گیگابایت',
    price: 12500000,
    originalPrice: 14000000,
    category: {
      _id: '507f1f77bcf86cd799439015',
      name: 'لپ‌تاپ',
      slug: 'laptops'
    },
    brand: {
      _id: '507f1f77bcf86cd799439016',
      name: 'ایسوس',
      image: '/uploads/brands/asus.png'
    },
    model: 'VivoBook S15',
    images: [
      {
        url: '/uploads/products/asus-vivobook-1.jpg',
        alt: 'لپ‌تاپ ایسوس ویووبوک'
      }
    ],
    stock: 8,
    isActive: true,
    isFeatured: false,
    rating: {
      average: 4.5,
      count: 12
    },
    attributes: {
      'رنگ': 'نقره‌ای',
      'حافظه': '8 گیگابایت',
      'هارد': '512 گیگابایت SSD'
    },
    accessories: [],
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10')
  },
  {
    _id: '507f1f77bcf86cd799439017',
    name: 'هدفون بلوتوثی اپل ایرپادز',
    description: 'هدفون بلوتوثی اپل ایرپادز با کیفیت صدای عالی و قابلیت حذف نویز',
    price: 3200000,
    originalPrice: 3800000,
    category: {
      _id: '507f1f77bcf86cd799439018',
      name: 'هدفون و هندزفری',
      slug: 'headphones'
    },
    brand: {
      _id: '507f1f77bcf86cd799439019',
      name: 'اپل',
      image: '/uploads/brands/apple.png'
    },
    model: 'AirPods Pro',
    images: [
      {
        url: '/uploads/products/airpods-1.jpg',
        alt: 'هدفون اپل ایرپادز'
      }
    ],
    stock: 25,
    isActive: true,
    isFeatured: true,
    rating: {
      average: 4.8,
      count: 45
    },
    attributes: {
      'رنگ': 'سفید',
      'نوع اتصال': 'بلوتوث',
      'قابلیت حذف نویز': 'دارد'
    },
    accessories: [],
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20')
  },
  {
    _id: '507f1f77bcf86cd799439020',
    name: 'تبلت سامسونگ گلکسی تب A8',
    description: 'تبلت سامسونگ گلکسی تب A8 با صفحه نمایش 10.5 اینچی و حافظه 32 گیگابایت',
    price: 6500000,
    originalPrice: 7200000,
    category: {
      _id: '507f1f77bcf86cd799439021',
      name: 'تبلت',
      slug: 'tablets'
    },
    brand: {
      _id: '507f1f77bcf86cd799439013',
      name: 'سامسونگ',
      image: '/uploads/brands/samsung.png'
    },
    model: 'Galaxy Tab A8',
    images: [
      {
        url: '/uploads/products/samsung-tab-a8-1.jpg',
        alt: 'تبلت سامسونگ گلکسی تب A8'
      }
    ],
    stock: 12,
    isActive: true,
    isFeatured: false,
    rating: {
      average: 4.0,
      count: 18
    },
    attributes: {
      'رنگ': 'نقره‌ای',
      'حافظه داخلی': '32 گیگابایت',
      'RAM': '3 گیگابایت'
    },
    accessories: [],
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-12')
  },
  {
    _id: '507f1f77bcf86cd799439022',
    name: 'ساعت هوشمند اپل واچ SE',
    description: 'ساعت هوشمند اپل واچ SE با قابلیت‌های سلامتی و ورزشی پیشرفته',
    price: 4500000,
    originalPrice: 5200000,
    category: {
      _id: '507f1f77bcf86cd799439023',
      name: 'ساعت هوشمند',
      slug: 'smartwatches'
    },
    brand: {
      _id: '507f1f77bcf86cd799439019',
      name: 'اپل',
      image: '/uploads/brands/apple.png'
    },
    model: 'Apple Watch SE',
    images: [
      {
        url: '/uploads/products/apple-watch-se-1.jpg',
        alt: 'ساعت هوشمند اپل واچ SE'
      }
    ],
    stock: 20,
    isActive: true,
    isFeatured: true,
    rating: {
      average: 4.6,
      count: 32
    },
    attributes: {
      'رنگ': 'صورتی',
      'اندازه صفحه': '40 میلی‌متر',
      'مقاومت در برابر آب': 'دارد'
    },
    accessories: [],
    createdAt: new Date('2024-01-18'),
    updatedAt: new Date('2024-01-18')
  }
];

const mockCategories = [
  {
    _id: '507f1f77bcf86cd799439012',
    name: 'گوشی موبایل',
    slug: 'mobile-phones',
    description: 'گوشی‌های موبایل و تلفن همراه',
    image: '/uploads/categories/mobile-phones.jpg',
    isActive: true,
    parent: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    _id: '507f1f77bcf86cd799439015',
    name: 'لپ‌تاپ',
    slug: 'laptops',
    description: 'لپ‌تاپ و کامپیوترهای قابل حمل',
    image: '/uploads/categories/laptops.jpg',
    isActive: true,
    parent: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    _id: '507f1f77bcf86cd799439018',
    name: 'هدفون و هندزفری',
    slug: 'headphones',
    description: 'هدفون، هندزفری و لوازم صوتی',
    image: '/uploads/categories/headphones.jpg',
    isActive: true,
    parent: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    _id: '507f1f77bcf86cd799439021',
    name: 'تبلت',
    slug: 'tablets',
    description: 'تبلت و تبلت‌های هوشمند',
    image: '/uploads/categories/tablets.jpg',
    isActive: true,
    parent: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    _id: '507f1f77bcf86cd799439023',
    name: 'ساعت هوشمند',
    slug: 'smartwatches',
    description: 'ساعت‌های هوشمند و پوشیدنی',
    image: '/uploads/categories/smartwatches.jpg',
    isActive: true,
    parent: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
];

const mockBrands = [
  {
    _id: '507f1f77bcf86cd799439013',
    name: 'سامسونگ',
    image: '/uploads/brands/samsung.png',
    description: 'برند کره‌ای تولیدکننده لوازم الکترونیکی',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    _id: '507f1f77bcf86cd799439016',
    name: 'ایسوس',
    image: '/uploads/brands/asus.png',
    description: 'برند تایوانی تولیدکننده کامپیوتر و لپ‌تاپ',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    _id: '507f1f77bcf86cd799439019',
    name: 'اپل',
    image: '/uploads/brands/apple.png',
    description: 'برند آمریکایی تولیدکننده لوازم الکترونیکی',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
];

module.exports = {
  mockProducts,
  mockCategories,
  mockBrands
};


























