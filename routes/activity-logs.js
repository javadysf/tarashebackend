const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const { getActivityLogs } = require('../utils/activityLogger');
const logger = require('../utils/logger');

/**
 * @route   GET /api/activity-logs
 * @desc    Get activity logs with filters
 * @access  Private/Admin
 */
router.get('/', [auth, adminAuth], async (req, res) => {
  try {
    const {
      userId,
      action,
      entity,
      dateFrom,
      dateTo,
      search,
      page = 1,
      limit = 50,
      sort = 'createdAt-desc'
    } = req.query;

    // Parse sort
    let sortOption = { createdAt: -1 };
    if (sort === 'createdAt-asc') {
      sortOption = { createdAt: 1 };
    } else if (sort === 'action') {
      sortOption = { action: 1, createdAt: -1 };
    } else if (sort === 'entity') {
      sortOption = { entity: 1, createdAt: -1 };
    }

    const result = await getActivityLogs(
      {
        userId,
        action,
        entity,
        dateFrom,
        dateTo,
        search
      },
      {
        page: Number(page),
        limit: Number(limit),
        sort: sortOption
      }
    );

    res.json(result);
  } catch (error) {
    logger.error('Get activity logs error', { error: error.message });
    res.status(500).json({ message: 'خطا در دریافت لاگ فعالیت‌ها' });
  }
});

/**
 * @route   GET /api/activity-logs/stats
 * @desc    Get activity log statistics
 * @access  Private/Admin
 */
router.get('/stats', [auth, adminAuth], async (req, res) => {
  try {
    const ActivityLog = require('../models/ActivityLog');
    const { dateFrom, dateTo } = req.query;

    const query = {};
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const [
      totalLogs,
      logsByAction,
      logsByEntity,
      recentLogs
    ] = await Promise.all([
      ActivityLog.countDocuments(query),
      ActivityLog.aggregate([
        { $match: query },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      ActivityLog.aggregate([
        { $match: query },
        { $group: { _id: '$entity', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      ActivityLog.find(query)
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .limit(10)
        .select('action entity description createdAt user')
    ]);

    res.json({
      totalLogs,
      logsByAction: logsByAction.map(item => ({
        action: item._id,
        count: item.count
      })),
      logsByEntity: logsByEntity.map(item => ({
        entity: item._id,
        count: item.count
      })),
      recentLogs
    });
  } catch (error) {
    logger.error('Get activity logs stats error', { error: error.message });
    res.status(500).json({ message: 'خطا در دریافت آمار لاگ‌ها' });
  }
});

module.exports = router;

