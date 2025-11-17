const logger = require('./logger');

// Try to require Sentry, but don't fail if it's not installed
let Sentry = null;
try {
  Sentry = require('@sentry/node');
} catch (error) {
  logger.warn('@sentry/node not installed. Error tracking disabled.');
}

// Initialize Sentry if DSN is provided and Sentry is available
if (Sentry && process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Environment
    environment: process.env.NODE_ENV || 'development',
    
    // Release tracking
    release: process.env.APP_VERSION || undefined,
    
    // Filter out sensitive data
    beforeSend(event, hint) {
      // Don't send events in development unless explicitly enabled
      if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_DEBUG) {
        return null;
      }
      
      // Remove sensitive data from request
      if (event.request) {
        // Remove authorization headers
        if (event.request.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
        }
        
        // Remove sensitive query params
        if (event.request.query_string) {
          const params = new URLSearchParams(event.request.query_string);
          params.delete('token');
          params.delete('password');
          event.request.query_string = params.toString();
        }
        
        // Remove sensitive body data
        if (event.request.data) {
          if (typeof event.request.data === 'object') {
            delete event.request.data.password;
            delete event.request.data.token;
            delete event.request.data.refreshToken;
          }
        }
      }
      
      // Filter out known non-critical errors
      if (event.exception) {
        const error = hint.originalException;
        if (error) {
          // Filter out validation errors
          if (error.message && (
            error.message.includes('validation') ||
            error.message.includes('ValidationError') ||
            error.message.includes('CastError')
          )) {
            return null;
          }
        }
      }
      
      return event;
    },
    
    // Integrations
    integrations: [
      // Enable HTTP integration for request tracking
      new Sentry.Integrations.Http({ tracing: true }),
    ],
  });
  
  logger.info('Sentry initialized', {
    environment: process.env.NODE_ENV,
    dsn: process.env.SENTRY_DSN ? 'configured' : 'not configured'
  });
} else {
  logger.warn('Sentry DSN not configured. Error tracking disabled.');
}

// Helper function to capture exceptions
function captureException(error, context = {}) {
  if (Sentry && process.env.SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: context,
      tags: {
        component: context.component || 'unknown',
      }
    });
  }
  
  // Also log to Winston
  logger.logError(error, context);
}

// Helper function to capture messages
function captureMessage(message, level = 'info', context = {}) {
  if (Sentry && process.env.SENTRY_DSN) {
    Sentry.captureMessage(message, {
      level,
      extra: context,
      tags: {
        component: context.component || 'unknown',
      }
    });
  }
  
  // Also log to Winston
  if (logger[level]) {
    logger[level](message, context);
  } else {
    logger.info(message, context);
  }
}

// Helper function to add breadcrumb
function addBreadcrumb(message, category, level = 'info', data = {}) {
  if (Sentry && process.env.SENTRY_DSN) {
    Sentry.addBreadcrumb({
      message,
      category,
      level,
      data,
      timestamp: Date.now() / 1000,
    });
  }
}

// Helper function to set user context
function setUser(user) {
  if (Sentry && process.env.SENTRY_DSN) {
    Sentry.setUser({
      id: user._id || user.id,
      email: user.email,
      username: user.name,
      // Don't include sensitive data
    });
  }
}

// Helper function to clear user context
function clearUser() {
  if (Sentry && process.env.SENTRY_DSN) {
    Sentry.setUser(null);
  }
}

// Express error handler middleware
function errorHandler(err, req, res, next) {
  // Capture exception in Sentry
  captureException(err, {
    component: 'express',
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.user?._id || req.user?.id,
  });
  
  // Call next to continue with default error handling
  next(err);
}

module.exports = {
  captureException,
  captureMessage,
  addBreadcrumb,
  setUser,
  clearUser,
  errorHandler,
  Sentry: Sentry || null,
};

