const mongoose = require('mongoose');
require('dotenv').config();

const Order = require('./models/Order');

const clearOrders = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tarashe');
    console.log('Connected to MongoDB');
    
    const result = await Order.deleteMany({});
    console.log(`Deleted ${result.deletedCount} orders from database`);
    
    console.log('Orders cleared successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error clearing orders:', error);
    process.exit(1);
  }
};

clearOrders();














