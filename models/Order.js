const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'تعداد باید حداقل 1 باشد']
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'قیمت نمیتواند منفی باشد']
  }
});

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  totalAmount: {
    type: Number,
    required: true,
    min: [0, 'مبلغ کل نمیتواند منفی باشد']
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'online'],
    default: 'online'
  },
  shippingAddress: {
    name: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    street: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    postalCode: {
      type: String,
      required: true
    }
  },
  notes: {
    type: String,
    maxlength: [500, 'یادداشت نباید بیشتر از 500 کاراکتر باشد']
  },
  trackingNumber: {
    type: String,
    default: null
  },
  deliveredAt: {
    type: Date,
    default: null
  },
  paymentAuthority: {
    type: String,
    default: null
  },
  paymentRefId: {
    type: String,
    default: null
  },
  paidAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Calculate total amount before saving
orderSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    this.totalAmount = this.items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);