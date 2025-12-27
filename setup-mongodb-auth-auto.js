#!/usr/bin/env node

/**
 * Automatic MongoDB authentication setup script
 * This script automatically creates MongoDB users with default values
 * 
 * Usage: node setup-mongodb-auth-auto.js
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

async function setupMongoAuth() {
  try {
    console.log('\n🔐 MongoDB Authentication Setup (Automatic)\n');
    console.log('='.repeat(80));
    
    // Default values
    const host = process.env.MONGODB_HOST || 'localhost';
    const port = process.env.MONGODB_PORT || '27017';
    const adminDb = 'admin';
    const adminUsername = process.env.MONGODB_ADMIN_USER || 'admin';
    const appDbName = process.env.MONGODB_DB || 'tarashe';
    const appUsername = process.env.MONGODB_USER || 'tarashe_user';
    
    // Generate secure passwords
    const adminPassword = process.env.MONGODB_ADMIN_PASSWORD || crypto.randomBytes(16).toString('hex');
    const appPassword = process.env.MONGODB_PASSWORD || crypto.randomBytes(16).toString('hex');
    
    console.log(`\n📋 Configuration:`);
    console.log(`   Host: ${host}:${port}`);
    console.log(`   Admin User: ${adminUsername}`);
    console.log(`   App Database: ${appDbName}`);
    console.log(`   App User: ${appUsername}`);
    
    // Connect to MongoDB
    const connectionUri = `mongodb://${host}:${port}`;
    console.log(`\n🔌 Connecting to MongoDB at ${connectionUri}...`);
    
    await mongoose.connect(connectionUri);
    console.log('✅ Connected to MongoDB\n');
    
    // Get admin database connection
    const adminDbConnection = mongoose.connection.useDb(adminDb);
    
    // Check if admin user already exists
    try {
      const existingUser = await adminDbConnection.db.command({
        usersInfo: { user: adminUsername, db: adminDb }
      });
      
      if (existingUser.users && existingUser.users.length > 0) {
        console.log(`⚠️  Admin user '${adminUsername}' already exists. Skipping...`);
      } else {
        // Create admin user
        console.log(`\n👤 Creating admin user '${adminUsername}'...`);
        
        await adminDbConnection.db.command({
          createUser: adminUsername,
          pwd: adminPassword,
          roles: [
            { role: 'root', db: adminDb },
            { role: 'readWriteAnyDatabase', db: adminDb },
            { role: 'dbAdminAnyDatabase', db: adminDb }
          ]
        });
        
        console.log('✅ Admin user created successfully!');
      }
    } catch (error) {
      if (error.codeName === 'DuplicateKey' || error.message.includes('already exists')) {
        console.log(`⚠️  Admin user '${adminUsername}' already exists. Skipping...`);
      } else {
        throw error;
      }
    }
    
    // Create application database user
    const appDbConnection = mongoose.connection.useDb(appDbName);
    
    // Check if app user already exists
    try {
      const existingAppUser = await appDbConnection.db.command({
        usersInfo: { user: appUsername, db: appDbName }
      });
      
      if (existingAppUser.users && existingAppUser.users.length > 0) {
        console.log(`⚠️  Application user '${appUsername}' already exists. Skipping...`);
      } else {
        // Create application user
        console.log(`\n👤 Creating application user '${appUsername}' for database '${appDbName}'...`);
        
        await appDbConnection.db.command({
          createUser: appUsername,
          pwd: appPassword,
          roles: [
            { role: 'readWrite', db: appDbName }
          ]
        });
        
        console.log('✅ Application user created successfully!');
      }
    } catch (error) {
      if (error.codeName === 'DuplicateKey' || error.message.includes('already exists')) {
        console.log(`⚠️  Application user '${appUsername}' already exists. Skipping...`);
      } else {
        throw error;
      }
    }
    
    // Generate connection strings
    console.log('\n' + '='.repeat(80));
    console.log('\n📋 Generated Credentials:\n');
    
    console.log('Admin Credentials:');
    console.log(`   Username: ${adminUsername}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Connection: mongodb://${adminUsername}:${adminPassword}@${host}:${port}/${adminDb}?authSource=${adminDb}`);
    
    console.log('\nApplication Credentials:');
    console.log(`   Username: ${appUsername}`);
    console.log(`   Password: ${appPassword}`);
    const appConnectionString = `mongodb://${appUsername}:${appPassword}@${host}:${port}/${appDbName}?authSource=${appDbName}`;
    console.log(`   Connection: ${appConnectionString}`);
    
    console.log('\n' + '='.repeat(80));
    console.log('\n📝 Add this to your .env file:');
    console.log(`MONGODB_URI=${appConnectionString}`);
    
    console.log('\n' + '='.repeat(80));
    console.log('\n⚠️  IMPORTANT NEXT STEPS:\n');
    console.log('1. Save the passwords securely (shown above)');
    console.log('2. Update your MongoDB configuration to enable authentication');
    console.log('   - Windows: Edit C:\\Program Files\\MongoDB\\Server\\{version}\\bin\\mongod.cfg');
    console.log('   - Linux: Edit /etc/mongod.conf');
    console.log('   - macOS: Edit /usr/local/etc/mongod.conf');
    console.log('   Add: security:\\n  authorization: enabled');
    console.log('3. Restart MongoDB service');
    console.log('4. Update MONGODB_URI in your .env file with the connection string above');
    console.log('\n✅ Setup completed!\n');
    
    // Save credentials to a file (optional, for reference)
    const fs = require('fs');
    const credentials = {
      admin: {
        username: adminUsername,
        password: adminPassword,
        connection: `mongodb://${adminUsername}:${adminPassword}@${host}:${port}/${adminDb}?authSource=${adminDb}`
      },
      application: {
        username: appUsername,
        password: appPassword,
        connection: appConnectionString
      },
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(
      'mongodb-credentials.json',
      JSON.stringify(credentials, null, 2)
    );
    console.log('💾 Credentials saved to mongodb-credentials.json (DO NOT COMMIT THIS FILE!)');
    console.log('');
    
    await mongoose.connection.close();
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Tip: Make sure MongoDB is running and accessible.');
      console.error('   Windows: net start MongoDB');
      console.error('   Linux: sudo systemctl start mongod');
      console.error('   macOS: brew services start mongodb-community');
    }
    
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

// Run setup
setupMongoAuth();











