const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');

class DatabaseBackup {
  constructor() {
    this.backupDir = path.join(__dirname, '../../backups');
    this.ensureBackupDir();
  }

  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  // Create backup
  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `campushub-backup-${timestamp}`;
    const backupPath = path.join(this.backupDir, backupName);

    return new Promise((resolve, reject) => {
      const mongoUri = process.env.MONGODB_URI;
      const dbName = mongoUri.split('/').pop().split('?')[0];
      
      const command = `mongodump --uri="${mongoUri}" --out="${backupPath}"`;
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error('Backup failed:', error);
          reject(error);
        } else {
          console.log(`Backup created: ${backupPath}`);
          this.cleanOldBackups();
          resolve(backupPath);
        }
      });
    });
  }

  // Restore from backup
  async restoreBackup(backupPath) {
    return new Promise((resolve, reject) => {
      const mongoUri = process.env.MONGODB_URI;
      const command = `mongorestore --uri="${mongoUri}" --drop "${backupPath}"`;
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error('Restore failed:', error);
          reject(error);
        } else {
          console.log('Database restored successfully');
          resolve();
        }
      });
    });
  }

  // Clean old backups (keep last 7 days)
  cleanOldBackups() {
    const files = fs.readdirSync(this.backupDir);
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

    files.forEach(file => {
      const filePath = path.join(this.backupDir, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtime.getTime() > maxAge) {
        fs.rmSync(filePath, { recursive: true, force: true });
        console.log(`Deleted old backup: ${file}`);
      }
    });
  }

  // Schedule automatic backups
  scheduleBackups() {
    // Daily backup at 2 AM
    cron.schedule('0 2 * * *', () => {
      console.log('Starting scheduled backup...');
      this.createBackup().catch(console.error);
    });

    // Weekly backup on Sunday at 3 AM
    cron.schedule('0 3 * * 0', () => {
      console.log('Starting weekly backup...');
      this.createBackup().catch(console.error);
    });
  }

  // Export data to JSON
  async exportToJSON() {
    const mongoose = require('mongoose');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const exportPath = path.join(this.backupDir, `export-${timestamp}.json`);

    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      const exportData = {};

      for (const collection of collections) {
        const collectionName = collection.name;
        const data = await mongoose.connection.db.collection(collectionName).find({}).toArray();
        exportData[collectionName] = data;
      }

      fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
      console.log(`Data exported to: ${exportPath}`);
      return exportPath;
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }
}

module.exports = DatabaseBackup;