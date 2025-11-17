const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Delete existing admin
    await User.deleteOne({ email: 'admin@tarashe.com' });
    
    // Create new admin
    const admin = new User({
      name: 'مدیر',
      lastName: 'سیستم',
      email: 'admin@tarashe.com',
      password: 'admin123',
      role: 'admin',
      phone: '09123456789',
      phoneVerified: true
    });

    await admin.save();
    console.log('Admin created successfully');
    console.log('Email: admin@tarashe.com');
    console.log('Password: admin123');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
};

createAdmin();