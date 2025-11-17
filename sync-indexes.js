const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const modelsDirectory = path.join(__dirname, 'models');

async function loadModels() {
  const models = [];

  for (const file of fs.readdirSync(modelsDirectory)) {
    if (!file.endsWith('.js')) continue;
    // Requiring the model file registers the schema with mongoose and returns the model
    const model = require(path.join(modelsDirectory, file));

    if (model && typeof model.syncIndexes === 'function') {
      models.push(model);
    }
  }

  return models;
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI environment variable is required to sync indexes');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const models = await loadModels();

    for (const model of models) {
      console.log(`Syncing indexes for ${model.modelName}...`);
      await model.syncIndexes();
      console.log(`✓ Indexes synced for ${model.modelName}`);
    }

    console.log('All indexes are up-to-date');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Failed to sync indexes:', error);
    process.exit(1);
  }
}

main();

