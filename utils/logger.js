const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Create transports
const transports = [
  // Error log file
  new DailyRotateFile({
    filename: path.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '20m',
    maxFiles: '30d',
    format: logFormat
  }),
  // Combined log file
  new DailyRotateFile({
    filename: path.join(logsDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
    format: logFormat
  })
];

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: 'debug'
    })
  );
} else {
  // In production, only log warnings and errors to console
  transports.push(
    new winston.transports.Console({
      format: winston.format.simple(),
      level: 'warn'
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: logFormat,
  defaultMeta: { service: 'tarashe-backend' },
  transports,
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d'
    })
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d'
    })
  ]
});

// Helper methods for request logging
logger.logRequest = (req, res, responseTime) => {
  const logData = {
    method: req.method,
    url: req.originalUrl || req.url,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent')
  };

  if (req.user) {
    logData.userId = req.user._id || req.user.id;
  }

  if (res.statusCode >= 400) {
    logger.warn('HTTP Request', logData);
  } else {
    logger.info('HTTP Request', logData);
  }
};

logger.logError = (error, context = {}) => {
  logger.error('Error occurred', {
    message: error.message,
    stack: error.stack,
    ...context
  });
};

module.exports = logger;
