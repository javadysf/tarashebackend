const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

/**
 * Reset all user passwords to their default values
 * Admin: admin123
 * Other users: user123 (or their email prefix)
 */
const resetAllPasswords = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Reset admin password
    const admin = await User.findOne({ email: 'admin@tarashe.com' });
    if (admin) {
      admin.password = 'admin123';
      await admin.save();
      console.log('✅ Admin password reset: admin123');
    }

    // Reset test user password
    const testUser = await User.findOne({ email: 'user@test.com' });
    if (testUser) {
      testUser.password = 'user123';
      await testUser.save();
      console.log('✅ Test user password reset: user123');
    }

    // Reset other users to a default password
    const otherUsers = await User.find({
      email: { $nin: ['admin@tarashe.com', 'user@test.com'] }
    });

    if (otherUsers.length > 0) {
      console.log(`\n📋 Found ${otherUsers.length} other users:`);
      for (const user of otherUsers) {
        // Use email prefix as default password
        const defaultPassword = user.email.split('@')[0] + '123';
        user.password = defaultPassword;
        await user.save();
        console.log(`✅ ${user.email} password reset: ${defaultPassword}`);
      }
    }

    console.log('\n✅ All passwords reset successfully!');
    console.log('\n📝 Default passwords:');
    console.log('   Admin: admin@tarashe.com / admin123');
    console.log('   Test User: user@test.com / user123');
    if (otherUsers.length > 0) {
      console.log('   Other users: [email-prefix]123');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
};

resetAllPasswords();

