const mongoose = require('mongoose');

/**
 * Schema for storing pending registrations (users who haven't verified SMS yet)
 */
const pendingRegistrationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true,
    match: [/^09\d{9}$/, 'شماره تلفن صحیح نیست']
  },
  smsVerificationCode: {
    code: {
      type: String,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    },
    attempts: {
      type: Number,
      default: 0,
      max: 5 // Maximum 5 verification attempts
    }
  }
}, {
  timestamps: true
});

// Indexes
pendingRegistrationSchema.index({ email: 1 }, { unique: true });
pendingRegistrationSchema.index({ phone: 1 });
pendingRegistrationSchema.index(
  { 'smsVerificationCode.expiresAt': 1 },
  { expireAfterSeconds: 0 }
);

module.exports = mongoose.model('PendingRegistration', pendingRegistrationSchema);

