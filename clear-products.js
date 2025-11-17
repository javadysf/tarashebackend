const mongoose = require('mongoose');
require('dotenv').config();

const clearProducts = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const targets = ['products', 'categories', 'brands', 'attributes', 'productattributes', 'categoryattributes', 'reviews', 'orders'];
    for (const name of targets) {
      try {
        const res = await db.collection(name).deleteMany({});
        console.log(`Deleted ${res.deletedCount} from ${name}`);
      } catch (e) {
        console.warn(`Skip ${name}:`, e.message);
      }
    }
     
    console.log('Selected collections cleared successflly!');
    process.exit(0);
  } catch (error) {
    console.error('Error clearing products:', error);
    process.exit(1);
  }
};

clearProducts();