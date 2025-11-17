const mongoose = require('mongoose');

/**
 * Schema for storing password reset requests
 */
const passwordResetSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true
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
passwordResetSchema.index({ email: 1 });
passwordResetSchema.index({ phone: 1 });
passwordResetSchema.index(
  { 'smsVerificationCode.expiresAt': 1 },
  { expireAfterSeconds: 0 }
);

module.exports = mongoose.model('PasswordReset', passwordResetSchema);