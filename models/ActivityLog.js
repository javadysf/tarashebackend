const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'create', 'update', 'delete', 'view', 'export', 'bulk_update', 'bulk_delete',
      'login', 'logout', 'status_change', 'payment_verify', 'order_cancel',
      'product_create', 'product_update', 'product_delete',
      'category_create', 'category_update', 'category_delete',
      'user_create', 'user_update', 'user_delete', 'user_activate', 'user_deactivate',
      'order_create', 'order_update', 'order_status_change',
      'export_orders', 'export_products', 'export_users', 'export_financial'
    ]
  },
  entity: {
    type: String,
    required: true,
    enum: ['product', 'category', 'order', 'user', 'review', 'brand', 'attribute', 'system']
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  description: {
    type: String,
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for performance
activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });
activityLogSchema.index({ entity: 1, createdAt: -1 });
activityLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);

