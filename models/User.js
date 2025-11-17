const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'نام الزامی است'],
    trim: true,
    maxlength: [50, 'نام نباید بیشتر از 50 کاراکتر باشد']
  },
  lastName: {
    type: String,
    required: [true, 'نام خانوادگی الزامی است'],
    trim: true,
    maxlength: [50, 'نام خانوادگی نباید بیشتر از 50 کاراکتر باشد']
  },
  email: {
    type: String,
    required: [true, 'ایمیل یا شماره تلفن الزامی است'],
    lowercase: true,
    validate: {
      validator: function(v) {
        // Accept either email format or phone format
        const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
        const phoneRegex = /^09\d{9}$/;
        return emailRegex.test(v) || phoneRegex.test(v);
      },
      message: 'فرمت ایمیل یا شماره تلفن صحیح نیست'
    }
  },
  password: {
    type: String,
    required: [true, 'رمز عبور الزامی است'],
    minlength: [6, 'رمز عبور باید حداقل 6 کاراکتر باشد']
  },
  phone: {
    type: String,
    match: [/^09\d{9}$/, 'شماره تلفن صحیح نیست']
  },
  phoneVerified: {
    type: Boolean,
    default: false
  },
  smsVerificationCode: {
    code: String,
    expiresAt: Date,
    attempts: { type: Number, default: 0 }
  },
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String
  },
  postalCode: {
    type: String,
    match: [/^\d{10}$/, 'کد پستی باید 10 رقم باشد']
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  avatar: {
    type: String,
    default: null
  },
  likedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  refreshTokens: [{
    token: String,
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } // 30 days
  }]
}, {
  timestamps: true
});

// Indexes
userSchema.index({ email: 1 }, { unique: true, collation: { locale: 'fa', strength: 1 } });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);