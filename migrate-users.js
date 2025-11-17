const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

/**
 * Migration script to update existing users with missing lastName field
 * This script will:
 * 1. Find all users without lastName
 * 2. Set lastName to a default value or split name if possible
 */
const migrateUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all users without lastName or with empty lastName
    const usersWithoutLastName = await User.find({
      $or: [
        { lastName: { $exists: false } },
        { lastName: null },
        { lastName: '' }
      ]
    });

    console.log(`\n📊 Found ${usersWithoutLastName.length} users without lastName`);

    if (usersWithoutLastName.length === 0) {
      console.log('✅ All users already have lastName field');
      await mongoose.connection.close();
      return;
    }

    let updated = 0;
    let errors = 0;

    for (const user of usersWithoutLastName) {
      try {
        // Try to split name if it contains space
        let lastName = '';
        if (user.name && user.name.includes(' ')) {
          const nameParts = user.name.trim().split(/\s+/);
          if (nameParts.length > 1) {
            // Last part is lastName, rest is name
            lastName = nameParts.pop();
            user.name = nameParts.join(' ');
          } else {
            lastName = 'کاربر'; // Default lastName
          }
        } else {
          lastName = 'کاربر'; // Default lastName
        }

        // For admin users, use a better default
        if (user.role === 'admin') {
          lastName = 'سیستم';
        }

        user.lastName = lastName;
        await user.save();
        updated++;
        console.log(`✅ Updated user: ${user.email} - lastName: "${lastName}"`);
      } catch (error) {
        errors++;
        console.error(`❌ Error updating user ${user.email}:`, error.message);
      }
    }

    console.log(`\n📈 Migration Summary:`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📊 Total: ${usersWithoutLastName.length}`);

    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
};

// Run migration
migrateUsers();

