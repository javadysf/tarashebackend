const mongoose = require('mongoose');
const Content = require('./models/Content');
require('dotenv').config();

const seedContent = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('Connected to MongoDB');

    // Clear existing content
    await Content.deleteMany({});
    console.log('Cleared existing content');

    // Create contact content
    const contactContent = new Content({
      page: 'contact',
      heroTitle: 'تماس با ما',
      heroSubtitle: 'ما همیشه آماده پاسخگویی به سوالات شما هستیم. با ما در تماس باشید.',
      contactInfo: {
        phone: '021-1234-5678',
        email: 'info@tarashe.com',
        address: 'تهران، خیابان ولیعصر، پلاک 123',
        workingHours: 'شنبه تا پنجشنبه: 9-18',
        mapAddress: 'تهران، خیابان ولیعصر، پلاک 123',
        mapEmbedCode: ''
      },
      seo: {
        metaTitle: 'تماس با ما | تراشه',
        metaDescription: 'با تیم تراشه در تماس باشید - پشتیبانی 24/7، مشاوره رایگان و پاسخگویی سریع',
        metaKeywords: 'تماس، پشتیبانی، مشاوره، تراشه، فناوری',
        ogTitle: 'تماس با ما | تراشه',
        ogDescription: 'با تیم تراشه در تماس باشید - پشتیبانی 24/7، مشاوره رایگان و پاسخگویی سریع'
      },
      isActive: true
    });

    await contactContent.save();
    console.log('Contact content created');

    // Create about content
    const aboutContent = new Content({
      page: 'about',
      heroTitle: 'درباره تراشه',
      heroSubtitle: 'ما در تراشه با بیش از یک ده ه تجربه، به ارائه بهترین محصولات و خدمات فناوری برای کسب‌وکارها و سازمان‌ها متعهد هستیم.',
      aboutInfo: {
        title: 'درباره تراشه',
        subtitle: 'ما در تراشه با بیش از یک ده ه تجربه، به ارائه بهترین محصولات و خدمات فناوری برای کسب‌وکارها و سازمان‌ها متعهد هستیم.',
        mission: 'ارائه راه‌حل‌های نوآورانه و با کیفیت که به کسب‌وکارها کمک می‌کند تا در عصر دیجیتال پیشرو باشند و اهداف خود را محقق کنند.',
        vision: 'تبدیل شدن به پیشروترین شرکت فناوری در منطقه و ایجاد تحول مثبت در زندگی میلیون‌ها نفر از طریق فناوری‌های پیشرفته.',
        stats: [
          { number: '10+', label: 'سال تجربه' },
          { number: '500+', label: 'پروژه موفق' },
          { number: '100+', label: 'مشتری راضی' },
          { number: '24/7', label: 'پشتیبانی' }
        ],
        team: [
          { name: 'علی احمدی', role: 'مدیر عامل', description: 'بیش از 15 سال تجربه در صنعت فناوری' },
          { name: 'سارا محمدی', role: 'مدیر فنی', description: 'متخصص توسعه نرم‌افزار و معماری سیستم' },
          { name: 'حسن رضایی', role: 'مدیر فروش', description: 'خبره در روابط مشتریان و توسعه بازار' }
        ]
      },
      seo: {
        metaTitle: 'درباره ما | تراشه',
        metaDescription: 'آشنایی با تیم و ماموریت شرکت تراشه - پیشرو در ارائه بهترین محصولات و خدمات فناوری',
        metaKeywords: 'درباره ما، تراشه، تیم، ماموریت، چشم‌انداز، فناوری',
        ogTitle: 'درباره ما | تراشه',
        ogDescription: 'آشنایی با تیم و ماموریت شرکت تراشه - پیشرو در ارائه بهترین محصولات و خدمات فناوری'
      },
      isActive: true
    });

    await aboutContent.save();
    console.log('About content created');

    console.log('Content seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding content:', error);
    process.exit(1);
  }
};

seedContent();
