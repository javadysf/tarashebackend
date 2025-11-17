const mongoose = require('mongoose');

const attributeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['text', 'number', 'select', 'boolean'],
    required: true
  },
  options: [{
    type: String,
    trim: true
  }], // برای type: 'select'
  unit: {
    type: String,
    trim: true
  }, // واحد اندازه‌گیری مثل GB, MHz
  isRequired: {
    type: Boolean,
    default: false
  },
  isFilterable: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Attribute', attributeSchema);