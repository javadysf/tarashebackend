const { logActivity } = require('../utils/activityLogger');

/**
 * Middleware to log admin activities
 * @param {String} action - Action type
 * @param {String} entity - Entity type
 * @param {Function} getDescription - Function to generate description
 * @param {Function} getEntityId - Function to get entity ID from request
 */
function activityLogger(action, entity, getDescription, getEntityId = null) {
  return async (req, res, next) => {
    // Only log for admin users
    if (req.user && req.user.role === 'admin') {
      // Store original json method
      const originalJson = res.json.bind(res);
      
      // Override json method to log after response
      res.json = function(data) {
        // Log activity after response is sent
        setImmediate(async () => {
          try {
            const entityId = getEntityId ? getEntityId(req, data) : req.params.id || null;
            const description = typeof getDescription === 'function' 
              ? getDescription(req, data) 
              : getDescription;

            await logActivity({
              user: req.user,
              action,
              entity,
              entityId,
              description,
              metadata: {
                method: req.method,
                url: req.originalUrl,
                statusCode: res.statusCode,
                ...(req.body && Object.keys(req.body).length > 0 ? { body: sanitizeBody(req.body) } : {})
              },
              req
            });
          } catch (error) {
            // Don't fail the request if logging fails
            console.error('Activity logging error:', error);
          }
        });
        
        return originalJson(data);
      };
    }
    
    next();
  };
}

/**
 * Sanitize request body to remove sensitive data
 */
function sanitizeBody(body) {
  const sanitized = { ...body };
  delete sanitized.password;
  delete sanitized.token;
  delete sanitized.refreshToken;
  return sanitized;
}

module.exports = activityLogger;

