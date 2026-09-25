import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'resqtag_super_secret_jwt_key_development_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  // Database Configuration (Supports Aiven URI or discrete parameters)
  databaseUrl: process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.MYSQL_URI,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'resqtag_db',
    ssl: process.env.DB_SSL === 'true' || process.env.DB_SSL === '1'
      ? { rejectUnauthorized: false }
      : false
  }
};
