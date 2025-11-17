const mongoose = require('mongoose');

const sliderSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['main', 'promo'],
    default: 'main',
    required: [true, 'نوع اسلایدر الزامی است']
  },
  title: {
    type: String,
    required: [true, 'عنوان اسلایدر الزامی است'],
    trim: true
  },
  subtitle: {
    type: String,
    required: [true, 'زیرعنوان اسلایدر الزامی است'],
    trim: true
  },
  backgroundImage: {
    type: String,
    required: [true, 'تصویر پس‌زمینه الزامی است']
  },
  buttonText: {
    type: String,
    required: [true, 'متن دکمه الزامی است'],
    trim: true
  },
  buttonLink: {
    type: String,
    required: [true, 'لینک دکمه الزامی است'],
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  textColor: {
    type: String,
    default: '#ffffff'
  },
  buttonColor: {
    type: String,
    default: '#3b82f6'
  },
  textPosition: {
    type: String,
    enum: ['left', 'center', 'right'],
    default: 'center'
  },
  overlayOpacity: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.4
  }
}, {
  timestamps: true
});

// Index for better performance
sliderSchema.index({ displayOrder: 1 });
sliderSchema.index({ isActive: 1 });

module.exports = mongoose.model('Slider', sliderSchema);