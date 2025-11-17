const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  image: {
    url: {
      type: String,
      required: true
    },
    alt: {
      type: String,
      required: true
    },
    public_id: {
      type: String,
      required: true
    }
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Brand', brandSchema);