const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const bcrypt = require('bcryptjs');

/**
 * Test script to check if passwords are working correctly
 */
const testPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Test admin user
    const admin = await User.findOne({ email: 'admin@tarashe.com' });
    if (!admin) {
      console.log('❌ Admin user not found');
      await mongoose.connection.close();
      return;
    }

    console.log('📋 Admin User Info:');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Name: ${admin.name} ${admin.lastName}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Password exists: ${!!admin.password}`);
    console.log(`   Password length: ${admin.password?.length || 0}`);
    console.log(`   Password starts with $2: ${admin.password?.startsWith('$2') || false}`);
    console.log('');

    // Test password comparison
    const testPasswords = ['admin123', 'wrongpassword'];
    
    for (const testPassword of testPasswords) {
      try {
        const isMatch = await admin.comparePassword(testPassword);
        console.log(`🔐 Testing password "${testPassword}": ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
      } catch (error) {
        console.log(`❌ Error testing password "${testPassword}": ${error.message}`);
      }
    }

    // Check if password needs to be reset
    console.log('\n💡 If password doesn\'t match, you can reset it using:');
    console.log('   node reset-admin-password.js');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
};

testPassword();

