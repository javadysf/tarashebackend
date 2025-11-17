const ActivityLog = require('../models/ActivityLog');
const logger = require('./logger');

/**
 * Log admin activity
 * @param {Object} options - Activity log options
 * @param {Object} options.user - User performing the action
 * @param {String} options.action - Action type
 * @param {String} options.entity - Entity type
 * @param {String} options.entityId - Entity ID (optional)
 * @param {String} options.description - Description of the action
 * @param {Object} options.metadata - Additional metadata (optional)
 * @param {Object} options.req - Express request object (optional, for IP and user agent)
 */
async function logActivity(options) {
  try {
    const { user, action, entity, entityId, description, metadata = {}, req } = options;

    if (!user || !action || !entity || !description) {
      logger.warn('Activity log missing required fields', { options });
      return;
    }

    const activityLog = new ActivityLog({
      user: user._id || user.id,
      action,
      entity,
      entityId: entityId || null,
      description,
      metadata,
      ipAddress: req?.ip || req?.connection?.remoteAddress || null,
      userAgent: req?.get('user-agent') || null
    });

    await activityLog.save();
    
    logger.info('Activity logged', {
      user: user._id || user.id,
      action,
      entity,
      entityId
    });
  } catch (error) {
    logger.error('Failed to log activity', { error: error.message, options });
  }
}

/**
 * Get activity logs with filters
 * @param {Object} filters - Filter options
 * @param {Object} pagination - Pagination options
 * @returns {Promise<Object>} Activity logs with pagination
 */
async function getActivityLogs(filters = {}, pagination = {}) {
  try {
    const {
      userId,
      action,
      entity,
      dateFrom,
      dateTo,
      search
    } = filters;

    const {
      page = 1,
      limit = 50,
      sort = { createdAt: -1 }
    } = pagination;

    const query = {};

    if (userId) {
      query.user = userId;
    }

    if (action) {
      query.action = action;
    }

    if (entity) {
      query.entity = entity;
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.createdAt.$lte = new Date(dateTo);
      }
    }

    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { 'metadata.name': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      ActivityLog.find(query)
        .populate('user', 'name email role')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      ActivityLog.countDocuments(query)
    ]);

    return {
      logs,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalLogs: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  } catch (error) {
    logger.error('Failed to get activity logs', { error: error.message });
    throw error;
  }
}

module.exports = {
  logActivity,
  getActivityLogs
};

