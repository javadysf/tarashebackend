const mongoose = require('mongoose');

const productAttributeSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  attribute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attribute',
    required: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed, // String, Number, Boolean
    required: true
  }
}, {
  timestamps: true
});

// یکتا بودن ترکیب product و attribute
productAttributeSchema.index({ product: 1, attribute: 1 }, { unique: true });

module.exports = mongoose.model('ProductAttribute', productAttributeSchema);