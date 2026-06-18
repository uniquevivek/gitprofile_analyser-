import mysql from 'mysql2/promise';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const dbType = process.env.DB_TYPE || 'sqlite';

let dbInstance;

if (dbType === 'mysql') {
  const poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'github_analyzer',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };

  // Enable SSL if explicitly configured, or automatically if connecting to Aiven/avn hosts
  const host = poolConfig.host.toLowerCase();
  const isAiven = host.includes('aiven') || host.includes('avn');
  const enableSSL = process.env.DB_SSL === 'true' || isAiven;

  if (enableSSL) {
    poolConfig.ssl = {
      // By default, rejectUnauthorized is false to prevent certificate issues during local testing
      // but can be toggled via DB_SSL_REJECT_UNAUTHORIZED
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true'
    };
    console.log('Database configuration: SSL enabled for MySQL connection pool.');
  }

  dbInstance = mysql.createPool(poolConfig);
  console.log('Database configuration: MySQL pool created.');
} else {
  // sqlite configuration
  const dbFile = process.env.DB_FILE || 'database.sqlite';
  const dbPath = path.resolve(dbFile);
  
  // Ensure the directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  const sqliteDb = new sqlite3.Database(dbPath);
  console.log(`Database configuration: SQLite file loaded at ${dbPath}`);
  
  // Promisify sqlite database methods to match mysql2 query format [rows, fields]
  dbInstance = {
    query: (sql, params = []) => {
      return new Promise((resolve, reject) => {
        const trimmedSql = sql.trim().toLowerCase();
        if (
          trimmedSql.startsWith('select') || 
          trimmedSql.startsWith('show') || 
          trimmedSql.startsWith('describe') || 
          trimmedSql.startsWith('pragma')
        ) {
          sqliteDb.all(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve([rows, null]);
          });
        } else {
          sqliteDb.run(sql, params, function (err) {
            if (err) return reject(err);
            resolve([{
              insertId: this.lastID,
              affectedRows: this.changes
            }, null]);
          });
        }
      });
    },
    end: () => {
      return new Promise((resolve, reject) => {
        sqliteDb.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  };
}

// Auto-initialize schema for SQLite
if (dbType === 'sqlite') {
  try {
    await dbInstance.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        name TEXT,
        avatar_url TEXT,
        bio TEXT,
        blog TEXT,
        location TEXT,
        public_repos INTEGER DEFAULT 0,
        public_gists INTEGER DEFAULT 0,
        followers INTEGER DEFAULT 0,
        following INTEGER DEFAULT 0,
        github_created_at TEXT,
        github_updated_at TEXT,
        total_stars INTEGER DEFAULT 0,
        total_forks INTEGER DEFAULT 0,
        total_open_issues INTEGER DEFAULT 0,
        primary_language TEXT,
        language_breakdown TEXT, -- Store JSON as text in SQLite
        top_repositories TEXT,   -- Store JSON as text in SQLite
        analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create index
    await dbInstance.query(`
      CREATE INDEX IF NOT EXISTS idx_username ON profiles (username)
    `);
    console.log('Database configuration: SQLite schema initialized.');
  } catch (error) {
    console.error('Failed to initialize SQLite schema:', error);
  }
}

export default dbInstance;
export { dbType };
