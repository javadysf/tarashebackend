const mongoose = require('mongoose');

const categoryAttributeSchema = new mongoose.Schema({
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  attribute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attribute',
    required: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// یکتا بودن ترکیب category و attribute
categoryAttributeSchema.index({ category: 1, attribute: 1 }, { unique: true });

module.exports = mongoose.model('CategoryAttribute', categoryAttributeSchema);