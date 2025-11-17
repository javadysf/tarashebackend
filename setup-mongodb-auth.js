#!/usr/bin/env node

/**
 * Script to setup MongoDB authentication
 * This script creates an admin user for MongoDB
 * 
 * Usage: 
 *   1. First, connect to MongoDB without authentication
 *   2. Run: node setup-mongodb-auth.js
 *   3. Restart MongoDB with authentication enabled
 */

// Use mongoose's connection to access MongoDB
const mongoose = require('mongoose');
const readline = require('readline');
const crypto = require('crypto');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupMongoAuth() {
  try {
    console.log('\n🔐 MongoDB Authentication Setup\n');
    console.log('='.repeat(80));
    
    // Get connection details
    const host = await question('MongoDB host (default: localhost): ') || 'localhost';
    const port = await question('MongoDB port (default: 27017): ') || '27017';
    const adminDb = await question('Admin database name (default: admin): ') || 'admin';
    
    // Get admin user credentials
    const adminUsername = await question('Admin username (default: admin): ') || 'admin';
    const adminPassword = await question('Admin password (leave empty to generate): ');
    
    // Generate password if not provided
    let finalPassword = adminPassword;
    if (!finalPassword) {
      finalPassword = crypto.randomBytes(16).toString('hex');
      console.log(`\n📝 Generated password: ${finalPassword}`);
      console.log('⚠️  Save this password securely!\n');
    }
    
    // Connect to MongoDB using mongoose
    const connectionUri = `mongodb://${host}:${port}`;
    console.log(`\n🔌 Connecting to MongoDB at ${connectionUri}...`);
    
    await mongoose.connect(connectionUri);
    console.log('✅ Connected to MongoDB\n');
    
    // Get admin database connection
    const adminDbConnection = mongoose.connection.useDb(adminDb);
    
    // Check if user already exists
    try {
      const existingUser = await adminDbConnection.db.command({
        usersInfo: { user: adminUsername, db: adminDb }
      });
      
      if (existingUser.users && existingUser.users.length > 0) {
        const overwrite = await question(`User '${adminUsername}' already exists. Overwrite? (y/N): `);
        if (overwrite.toLowerCase() !== 'y') {
          console.log('❌ Operation cancelled');
          await mongoose.connection.close();
          rl.close();
          return;
        }
        
        // Drop existing user
        await adminDbConnection.db.command({
          dropUser: adminUsername
        });
        console.log(`✅ Removed existing user '${adminUsername}'`);
      }
    } catch (error) {
      // User doesn't exist, continue
    }
    
    // Create admin user
    console.log(`\n👤 Creating admin user '${adminUsername}'...`);
    
    await adminDbConnection.db.command({
      createUser: adminUsername,
      pwd: finalPassword,
      roles: [
        { role: 'root', db: adminDb },
        { role: 'readWriteAnyDatabase', db: adminDb },
        { role: 'dbAdminAnyDatabase', db: adminDb }
      ]
    });
    
    console.log('✅ Admin user created successfully!\n');
    
    // Create application database user
    const appDbName = await question('Application database name (default: tarashe): ') || 'tarashe';
    const appUsername = await question(`Application user for '${appDbName}' (default: tarashe_user): `) || 'tarashe_user';
    const appPassword = await question(`Password for '${appUsername}' (leave empty to generate): `);
    
    let finalAppPassword = appPassword;
    if (!finalAppPassword) {
      finalAppPassword = crypto.randomBytes(16).toString('hex');
      console.log(`\n📝 Generated password: ${finalAppPassword}`);
      console.log('⚠️  Save this password securely!\n');
    }
    
    // Create application database connection
    const appDbConnection = mongoose.connection.useDb(appDbName);
    
    // Create application user
    console.log(`\n👤 Creating application user '${appUsername}' for database '${appDbName}'...`);
    
    await appDbConnection.db.command({
      createUser: appUsername,
      pwd: finalAppPassword,
      roles: [
        { role: 'readWrite', db: appDbName }
      ]
    });
    
    console.log('✅ Application user created successfully!\n');
    
    // Generate connection strings
    console.log('='.repeat(80));
    console.log('\n📋 Connection Strings:\n');
    
    console.log('Admin Connection String:');
    console.log(`mongodb://${adminUsername}:${finalPassword}@${host}:${port}/${adminDb}?authSource=${adminDb}`);
    
    console.log('\nApplication Connection String:');
    const appConnectionString = `mongodb://${appUsername}:${finalAppPassword}@${host}:${port}/${appDbName}?authSource=${appDbName}`;
    console.log(appConnectionString);
    
    console.log('\n📝 Add this to your .env file:');
    console.log(`MONGODB_URI=${appConnectionString}`);
    
    console.log('\n' + '='.repeat(80));
    console.log('\n⚠️  IMPORTANT NEXT STEPS:\n');
    console.log('1. Save the passwords securely');
    console.log('2. Update your MongoDB configuration to enable authentication');
    console.log('3. Restart MongoDB service');
    console.log('4. Update MONGODB_URI in your .env file');
    console.log('\n✅ Setup completed!\n');
    
    await mongoose.connection.close();
    rl.close();
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    rl.close();
    process.exit(1);
  }
}

// Run setup
setupMongoAuth();

