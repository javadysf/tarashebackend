const mongoose = require('mongoose');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

require('dotenv').config();

const BACKUP_DIR = path.join(__dirname, '../../backups');
const MONGODB_URI = process.env.MONGODB_URI;
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '30');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Parse MongoDB URI to extract connection details
function parseMongoURI(uri) {
  try {
    const url = new URL(uri);
    const dbName = url.pathname.replace('/', '');
    const host = url.hostname;
    const port = url.port || '27017';
    const username = url.username;
    const password = url.password;
    
    return { host, port, dbName, username, password };
  } catch (error) {
    logger.error('Failed to parse MongoDB URI', { error });
    throw error;
  }
}

// Create backup
async function createBackup() {
  try {
    const { host, port, dbName, username, password } = parseMongoURI(MONGODB_URI);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `tarashe-backup-${timestamp}.gz`;
    const backupPath = path.join(BACKUP_DIR, backupFileName);
    
    // Build mongodump command
    let command = `mongodump --host ${host}:${port} --db ${dbName} --archive=${backupPath} --gzip`;
    
    if (username && password) {
      command += ` --username ${username} --password ${password} --authenticationDatabase admin`;
    }
    
    logger.info('Starting database backup', { backupPath });
    
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          logger.error('Backup failed', { error: error.message, stderr });
          reject(error);
          return;
        }
        
        // Get file size
        const stats = fs.statSync(backupPath);
        const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        
        logger.info('Backup completed successfully', {
          backupPath,
          fileSize: `${fileSizeMB} MB`
        });
        
        resolve({ backupPath, fileSize: fileSizeMB });
      });
    });
  } catch (error) {
    logger.error('Backup creation error', { error });
    throw error;
  }
}

// Clean old backups
function cleanOldBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR);
    const now = Date.now();
    const retentionMs = RETENTION_DAYS * 24 * 60 * 60 * 1000;
    
    let deletedCount = 0;
    
    files.forEach(file => {
      if (!file.startsWith('tarashe-backup-')) return;
      
      const filePath = path.join(BACKUP_DIR, file);
      const stats = fs.statSync(filePath);
      const fileAge = now - stats.mtimeMs;
      
      if (fileAge > retentionMs) {
        fs.unlinkSync(filePath);
        deletedCount++;
        logger.info('Deleted old backup', { file });
      }
    });
    
    if (deletedCount > 0) {
      logger.info('Cleaned old backups', { deletedCount, retentionDays: RETENTION_DAYS });
    }
  } catch (error) {
    logger.error('Error cleaning old backups', { error });
  }
}

// Main backup function
async function runBackup() {
  try {
    logger.info('Starting backup process');
    
    // Create backup
    const backupResult = await createBackup();
    
    // Clean old backups
    cleanOldBackups();
    
    logger.info('Backup process completed', backupResult);
    process.exit(0);
  } catch (error) {
    logger.error('Backup process failed', { error });
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runBackup();
}

module.exports = { createBackup, cleanOldBackups, runBackup };

