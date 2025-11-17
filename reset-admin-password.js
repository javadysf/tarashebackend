const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

/**
 * Reset admin password to default: admin123
 */
const resetAdminPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find admin user
    const admin = await User.findOne({ email: 'admin@tarashe.com' });
    if (!admin) {
      console.log('❌ Admin user not found');
      await mongoose.connection.close();
      return;
    }

    console.log('📋 Current Admin Info:');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Name: ${admin.name} ${admin.lastName}`);
    console.log('');

    // Reset password to admin123
    admin.password = 'admin123';
    await admin.save();

    console.log('✅ Admin password reset successfully!');
    console.log('   New password: admin123');
    console.log('   You can now login with:');
    console.log('   Email: admin@tarashe.com');
    console.log('   Password: admin123');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
};

resetAdminPassword();

