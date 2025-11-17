const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const PendingRegistration = require('../models/PendingRegistration');
const PasswordReset = require('../models/PasswordReset');
const { auth } = require('../middleware/auth');
const { upload, uploadToCloudinary } = require('../middleware/upload');
const smsService = require('../utils/smsService');
const bcrypt = require('bcryptjs');

const router = express.Router();

const createLimiter = (max) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        message: 'تعداد تلاش‌های شما بیش از حد مجاز بوده است. لطفاً چند دقیقه بعد دوباره تلاش کنید.'
      });
    },
  });

const loginLimiter = createLimiter(10);
const smsLimiter = createLimiter(5);
const passwordResetLimiter = createLimiter(5);

// Generate JWT tokens
const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @route   POST /api/auth/send-sms-code
// @desc    Send SMS verification code for registration
// @access  Public
router.post('/send-sms-code', [
  smsLimiter,
  body('name').notEmpty().withMessage('نام الزامی است').bail().trim().isLength({ min: 2 }).withMessage('نام باید حداقل 2 کاراکتر باشد'),
  body('lastName').notEmpty().withMessage('نام خانوادگی الزامی است').bail().trim().isLength({ min: 2 }).withMessage('نام خانوادگی باید حداقل 2 کاراکتر باشد'),
  body('password').notEmpty().withMessage('رمز عبور الزامی است').bail().isLength({ min: 6 }).withMessage('رمز عبور باید حداقل 6 کاراکتر باشد'),
  body('phone').notEmpty().withMessage('شماره تلفن الزامی است').bail().matches(/^09\d{9}$/).withMessage('شماره تلفن باید به فرمت 09123456789 باشد')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'اطلاعات وارد شده صحیح نیست',
        errors: errors.array()
      });
    }

    const { name, lastName, password, phone } = req.body;
    
    // Check if phone is already registered
    const existingPhone = await User.findOne({ phone, phoneVerified: true });
    if (existingPhone) {
      return res.status(400).json({ message: 'این شماره تلفن قبلاً ثبت شده است' });
    }

    // Check if there's already a pending registration
    let pendingRegistration = await PendingRegistration.findOne({ phone });
    
    // Generate verification code
    const verificationCode = smsService.generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Hash password before storing
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    if (pendingRegistration) {
      // Update existing pending registration
      pendingRegistration.name = name;
      pendingRegistration.lastName = lastName;
      pendingRegistration.password = hashedPassword;
      pendingRegistration.smsVerificationCode = {
        code: verificationCode,
        expiresAt: expiresAt,
        attempts: 0
      };
      pendingRegistration.createdAt = new Date();
    } else {
      // Create new pending registration
      pendingRegistration = new PendingRegistration({
        name,
        lastName,
        email: phone, // Use phone as email for new registrations
        password: hashedPassword,
        phone,
        smsVerificationCode: {
          code: verificationCode,
          expiresAt: expiresAt,
          attempts: 0
        }
      });
    }

    await pendingRegistration.save();

    // Send SMS
    const smsResult = await smsService.sendVerificationCode(phone, verificationCode);

    if (!smsResult.success) {
      // Log detailed error for debugging
      console.error('SMS sending failed:', {
        phone,
        error: smsResult.error,
        errorCode: smsResult.errorCode,
        httpStatus: smsResult.httpStatus,
        response: smsResult.response
      });
      
      // In development, log the code for testing purposes
      if (process.env.NODE_ENV === 'development') {
        console.log('\n========================================');
        console.log('⚠️  SMS FAILED - Development Mode');
        console.log('========================================');
        console.log(`📞 Phone: ${phone}`);
        console.log(`🔐 Verification Code: ${verificationCode}`);
        console.log(`❌ Error: ${smsResult.error}`);
        console.log('========================================');
        console.log('You can use this code to test registration');
        console.log('========================================\n');
      }
      
      // Delete pending registration if SMS failed
      await PendingRegistration.deleteOne({ _id: pendingRegistration._id });
      
      // Return detailed error message
      const errorMessage = smsResult.error || 'خطا در ارسال پیامک';
      return res.status(400).json({ 
        message: errorMessage,
        error: smsResult.error,
        errorCode: smsResult.errorCode
      });
    }

    res.json({
      message: 'کد تایید به شماره تلفن شما ارسال شد',
      expiresIn: 600 // 10 minutes in seconds
    });
  } catch (error) {
    console.error('Send SMS code error:', error);
    
    // Handle duplicate key error (email already exists)
    if (error.code === 11000) {
      return res.status(400).json({ message: 'کاربری با این ایمیل یا شماره تلفن در حال ثبت نام است' });
    }
    
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   POST /api/auth/verify-sms-code
// @desc    Verify SMS code and complete registration
// @access  Public
router.post('/verify-sms-code', [
  smsLimiter,
  body('phone').matches(/^09\d{9}$/).withMessage('شماره تلفن باید به فرمت 09123456789 باشد'),
  body('code').isLength({ min: 6, max: 6 }).withMessage('کد تایید باید 6 رقم باشد')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'اطلاعات وارد شده صحیح نیست',
        errors: errors.array()
      });
    }

    const { phone, code } = req.body;

    // Find pending registration
    const pendingRegistration = await PendingRegistration.findOne({ phone });
    if (!pendingRegistration) {
      return res.status(400).json({ message: 'کد تایید نامعتبر است یا منقضی شده است' });
    }

    // Check if code is expired
    if (pendingRegistration.smsVerificationCode.expiresAt < new Date()) {
      await PendingRegistration.deleteOne({ _id: pendingRegistration._id });
      return res.status(400).json({ message: 'کد تایید منقضی شده است. لطفاً دوباره درخواست دهید' });
    }

    // Check attempts
    if (pendingRegistration.smsVerificationCode.attempts >= 5) {
      await PendingRegistration.deleteOne({ _id: pendingRegistration._id });
      return res.status(400).json({ message: 'تعداد تلاش‌های مجاز برای وارد کردن کد تمام شده است' });
    }

    // Verify code
    if (pendingRegistration.smsVerificationCode.code !== code) {
      pendingRegistration.smsVerificationCode.attempts += 1;
      await pendingRegistration.save();
      
      const remainingAttempts = 5 - pendingRegistration.smsVerificationCode.attempts;
      return res.status(400).json({ 
        message: `کد تایید اشتباه است. ${remainingAttempts > 0 ? `${remainingAttempts} تلاش باقی مانده` : 'تعداد تلاش‌ها تمام شد'}` 
      });
    }

    // Code is correct, create user
    const user = new User({
      name: pendingRegistration.name,
      lastName: pendingRegistration.lastName,
      email: pendingRegistration.email,
      password: pendingRegistration.password,
      phone: pendingRegistration.phone,
      phoneVerified: true
    });

    await user.save();

    // Delete pending registration
    await PendingRegistration.deleteOne({ _id: pendingRegistration._id });

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token
    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    res.status(201).json({
      message: 'ثبت نام با موفقیت انجام شد',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Verify SMS code error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ message: 'کاربری با این ایمیل یا شماره تلفن قبلاً ثبت نام کرده است' });
    }
    
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   POST /api/auth/resend-sms-code
// @desc    Resend SMS verification code
// @access  Public
router.post('/resend-sms-code', [
  smsLimiter,
  body('phone').matches(/^09\d{9}$/).withMessage('شماره تلفن باید به فرمت 09123456789 باشد')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'اطلاعات وارد شده صحیح نیست',
        errors: errors.array()
      });
    }

    const { phone } = req.body;

    // Find pending registration
    const pendingRegistration = await PendingRegistration.findOne({ phone });
    if (!pendingRegistration) {
      return res.status(400).json({ message: 'درخواست ثبت نام یافت نشد' });
    }

    // Generate new verification code
    const verificationCode = smsService.generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update pending registration
    pendingRegistration.smsVerificationCode = {
      code: verificationCode,
      expiresAt: expiresAt,
      attempts: 0
    };
    pendingRegistration.createdAt = new Date();
    await pendingRegistration.save();

    // Send SMS
    const smsResult = await smsService.sendVerificationCode(pendingRegistration.phone, verificationCode);

    if (!smsResult.success) {
      return res.status(400).json({ 
        message: 'خطا در ارسال پیامک',
        error: smsResult.error 
      });
    }

    res.json({
      message: 'کد تایید مجدداً به شماره تلفن شما ارسال شد',
      expiresIn: 600 // 10 minutes in seconds
    });
  } catch (error) {
    console.error('Resend SMS code error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  loginLimiter,
  body('phone').notEmpty().withMessage('شماره تلفن الزامی است'),
  body('password').exists().withMessage('رمز عبور الزامی است')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'اطلاعات وارد شده صحیح نیست',
        errors: errors.array()
      });
    }

    const { phone, password } = req.body;

    // Find user by phone or email (for backward compatibility)
    const user = await User.findOne({ 
      $or: [
        { phone: phone },
        { email: phone }
      ]
    });
    if (!user) {
      return res.status(400).json({ message: 'شماره تلفن یا رمز عبور اشتباه است' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(400).json({ message: 'حساب کاربری غیرفعال است' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'شماره تلفن یا رمز عبور اشتباه است' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token
    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    res.json({
      message: 'ورود با موفقیت انجام شد',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    // Only log unexpected server errors, not validation errors
    // Validation errors (400) are already handled above and don't reach here
    console.error('Login error (unexpected):', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        lastName: req.user.lastName,
        email: req.user.email,
        phone: req.user.phone,
        phoneVerified: req.user.phoneVerified,
        role: req.user.role,
        address: req.user.address,
        postalCode: req.user.postalCode,
        avatar: req.user.avatar,
        isActive: req.user.isActive,
        createdAt: req.user.createdAt
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', [
  auth,
  body('name').optional().trim().isLength({ min: 2 }).withMessage('نام باید حداقل 2 کاراکتر باشد'),
  body('lastName').optional().trim().custom((value) => {
    if (!value || value === '') return true; // Allow empty lastName
    return value.length >= 2;
  }).withMessage('نام خانوادگی باید حداقل 2 کاراکتر باشد'),
  // phone removed - users cannot change their phone number
  body('postalCode').optional().custom((value) => {
    if (!value || value === '' || value === null || value === undefined) return true; // Allow empty postal code
    return /^\d{10}$/.test(value.toString().trim());
  }).withMessage('کد پستی باید 10 رقم باشد')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'اطلاعات وارد شده صحیح نیست',
        errors: errors.array()
      });
    }

    const { name, lastName, address, postalCode } = req.body;
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'کاربر یافت نشد' });
    }
    
    // Update fields only if provided
    if (name !== undefined && name !== null) {
      const trimmedName = name.trim();
      if (trimmedName.length >= 2) {
        user.name = trimmedName;
      }
    }
    if (lastName !== undefined && lastName !== null) {
      const trimmedLastName = lastName.trim();
      // Allow empty lastName or at least 2 characters
      user.lastName = trimmedLastName.length >= 2 ? trimmedLastName : (trimmedLastName || '');
    }
    // phone is not allowed to be changed by user
    if (address !== undefined && address !== null) {
      // Merge address object to preserve existing fields
      user.address = {
        street: address.street?.trim() || user.address?.street || '',
        city: address.city?.trim() || user.address?.city || '',
        state: address.state?.trim() || user.address?.state || '',
        postalCode: address.postalCode?.trim() || user.address?.postalCode || ''
      };
    }
    if (postalCode !== undefined && postalCode !== null) {
      // Allow empty postal code
      const trimmedPostalCode = postalCode.toString().trim();
      user.postalCode = trimmedPostalCode && trimmedPostalCode.length === 10 ? trimmedPostalCode : undefined;
    }

    await user.save();

    res.json({
      message: 'پروفایل با موفقیت بروزرسانی شد',
      user: {
        id: user._id,
        name: user.name,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        phoneVerified: user.phoneVerified,
        role: user.role,
        address: user.address,
        postalCode: user.postalCode,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   POST /api/auth/refresh
// @desc    Refresh access token
// @access  Public
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token ارسال نشده' });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    // Find user and check if refresh token exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'کاربر یافت نشد' });
    }

    const tokenExists = user.refreshTokens.find(t => t.token === refreshToken && t.expiresAt > new Date());
    if (!tokenExists) {
      return res.status(401).json({ message: 'Refresh token نامعتبر است' });
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(user._id);

    res.json({
      accessToken: newAccessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({ message: 'Refresh token نامعتبر است' });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user and invalidate refresh token
// @access  Private
router.post('/logout', auth, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      // Remove refresh token from user
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { refreshTokens: { token: refreshToken } }
      });
    }

    res.json({ message: 'خروج با موفقیت انجام شد' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Send SMS code for password reset
// @access  Public
router.post('/forgot-password', [
  passwordResetLimiter,
  body('phone').matches(/^09\d{9}$/).withMessage('شماره تلفن باید به فرمت 09123456789 باشد')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'اطلاعات وارد شده صحیح نیست',
        errors: errors.array()
      });
    }

    const { phone } = req.body;

    // Find user by phone
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(400).json({ message: 'کاربری با این شماره تلفن یافت نشد' });
    }

    if (!user.phone) {
      return res.status(400).json({ message: 'شماره تلفن برای این حساب ثبت نشده است' });
    }

    // Generate verification code
    const verificationCode = smsService.generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing password reset request
    await PasswordReset.deleteOne({ phone });

    // Create new password reset request
    const passwordReset = new PasswordReset({
      email: user.email || phone,
      phone: phone,
      smsVerificationCode: {
        code: verificationCode,
        expiresAt: expiresAt,
        attempts: 0
      }
    });

    await passwordReset.save();

    // Send SMS with password reset template
    const smsResult = await smsService.sendPasswordResetCode(user.phone, verificationCode);

    if (!smsResult.success) {
      await PasswordReset.deleteOne({ _id: passwordReset._id });
      return res.status(400).json({ 
        message: 'خطا در ارسال پیامک',
        error: smsResult.error 
      });
    }

    res.json({
      message: 'کد تایید به شماره تلفن شما ارسال شد',
      phone: user.phone.replace(/(\d{4})(\d{3})(\d{4})/, '$1***$3'),
      expiresIn: 600
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   POST /api/auth/verify-reset-code
// @desc    Verify SMS code for password reset
// @access  Public
router.post('/verify-reset-code', [
  passwordResetLimiter,
  body('phone').matches(/^09\d{9}$/).withMessage('شماره تلفن باید به فرمت 09123456789 باشد'),
  body('code').isLength({ min: 6, max: 6 }).withMessage('کد تایید باید 6 رقم باشد')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'اطلاعات وارد شده صحیح نیست',
        errors: errors.array()
      });
    }

    const { phone, code } = req.body;

    // Find password reset request
    const passwordReset = await PasswordReset.findOne({ phone });
    if (!passwordReset) {
      return res.status(400).json({ message: 'کد تایید نامعتبر است یا منقضی شده است' });
    }

    // Check if code is expired
    if (passwordReset.smsVerificationCode.expiresAt < new Date()) {
      await PasswordReset.deleteOne({ _id: passwordReset._id });
      return res.status(400).json({ message: 'کد تایید منقضی شده است. لطفاً دوباره درخواست دهید' });
    }

    // Check attempts
    if (passwordReset.smsVerificationCode.attempts >= 5) {
      await PasswordReset.deleteOne({ _id: passwordReset._id });
      return res.status(400).json({ message: 'تعداد تلاشهای مجاز برای وارد کردن کد تمام شده است' });
    }

    // Verify code
    if (passwordReset.smsVerificationCode.code !== code) {
      passwordReset.smsVerificationCode.attempts += 1;
      await passwordReset.save();
      
      const remainingAttempts = 5 - passwordReset.smsVerificationCode.attempts;
      return res.status(400).json({ 
        message: `کد تایید اشتباه است. ${remainingAttempts > 0 ? `${remainingAttempts} تلاش باقی مانده` : 'تعداد تلاشها تمام شد'}` 
      });
    }

    // Code is correct, generate reset token
    const resetToken = jwt.sign({ phone }, process.env.JWT_SECRET, { expiresIn: '15m' });

    res.json({
      message: 'کد تایید صحیح است',
      resetToken
    });
  } catch (error) {
    console.error('Verify reset code error:', error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', [
  passwordResetLimiter,
  body('resetToken').notEmpty().withMessage('توکن بازیابی الزامی است'),
  body('newPassword').isLength({ min: 6 }).withMessage('رمز عبور جدید باید حداقل 6 کاراکتر باشد')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'اطلاعات وارد شده صحیح نیست',
        errors: errors.array()
      });
    }

    const { resetToken, newPassword } = req.body;

    // Verify reset token
    const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    const { phone } = decoded;

    // Find user
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(400).json({ message: 'کاربر یافت نشد' });
    }

    // Set new password (plain text - will be hashed by pre-save hook)
    // Don't hash manually here, let the User model's pre-save hook handle it
    user.password = newPassword;
    await user.save();

    // Delete password reset request
    await PasswordReset.deleteOne({ phone });

    res.json({
      message: 'رمز عبور با موفقیت تغییر یافت'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(400).json({ message: 'توکن بازیابی نامعتبر یا منقضی شده است' });
    }
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// @route   POST /api/auth/upload-avatar
// @desc    Upload user avatar
// @access  Private
router.post('/upload-avatar', [auth, upload.single('avatar')], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'فایل تصویر ارسال نشده' });
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, 'avatars');
    
    // Update user avatar
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: result.secure_url },
      { new: true }
    ).select('-password');

    res.json({
      message: 'تصویر پروفایل با موفقیت بروزرسانی شد',
      user,
      avatarUrl: result.secure_url
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ message: 'خطا در آپلود تصویر' });
  }
});

module.exports = router;