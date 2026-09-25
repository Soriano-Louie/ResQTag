import mysql from 'mysql2/promise';
import { config } from './env.js';

let pool;

if (config.databaseUrl) {
  // Parsing URI string (e.g. Aiven / Cloud MySQL URI)
  const isSslNeeded = config.databaseUrl.includes('ssl-mode=REQUIRED') || config.databaseUrl.includes('aivencloud.com') || process.env.DB_SSL === 'true';
  
  pool = mysql.createPool({
    uri: config.databaseUrl,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    ssl: isSslNeeded ? { rejectUnauthorized: false } : undefined
  });
} else {
  // Discrete connection parameters (Local / standard VPS)
  pool = mysql.createPool({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    ssl: config.db.ssl || undefined
  });
}

// Health check / initial test helper
export async function testDbConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL Database connected successfully.');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ MySQL Database connection failed:', error.message);
    return false;
  }
}

export default pool;
