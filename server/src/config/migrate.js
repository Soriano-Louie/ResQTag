import pool from './db.js';
import bcrypt from 'bcryptjs';

export async function runMigrations() {
  console.log('🔄 Running database migrations...');
  try {
    const connection = await pool.getConnection();

    // 1. Users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        first_name VARCHAR(50) NOT NULL,
        middle_name VARCHAR(50) NULL,
        last_name VARCHAR(50) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('user', 'admin') DEFAULT 'user',
        account_status ENUM('active', 'suspended', 'deactivated') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Emergency profiles table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS emergency_profiles (
        profile_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        contact_number VARCHAR(30) NULL,
        address TEXT NULL,
        date_of_birth DATE NULL,
        blood_type VARCHAR(10) NULL,
        allergies TEXT NULL,
        medical_conditions TEXT NULL,
        medications TEXT NULL,
        important_medical_info TEXT NULL,
        emergency_notes TEXT NULL,
        profile_picture_url VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Emergency contacts table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS emergency_contacts (
        contact_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        relationship VARCHAR(50) NOT NULL,
        contact_number VARCHAR(30) NOT NULL,
        email VARCHAR(100) NULL,
        is_public TINYINT(1) DEFAULT 1,
        priority_order INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        INDEX idx_contact_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Privacy settings table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS privacy_settings (
        privacy_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        field_name VARCHAR(50) NOT NULL,
        is_public TINYINT(1) DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_user_field (user_id, field_name),
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. QR tags table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS qr_tags (
        qr_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        qr_token VARCHAR(64) NOT NULL UNIQUE,
        status ENUM('active', 'inactive') DEFAULT 'active',
        scan_count INT DEFAULT 0,
        last_scanned_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        INDEX idx_qr_token (qr_token)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Seed default admin if none exists
    const [adminCheck] = await connection.query('SELECT user_id FROM users WHERE role = ? LIMIT 1', ['admin']);
    if (adminCheck.length === 0) {
      const defaultAdminPass = 'Admin@123456';
      const hash = await bcrypt.hash(defaultAdminPass, 12);
      const [insertResult] = await connection.query(
        `INSERT INTO users (first_name, last_name, email, password_hash, role, account_status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['System', 'Admin', 'admin@resqtag.com', hash, 'admin', 'active']
      );
      const adminId = insertResult.insertId;

      // Seed admin profile
      await connection.query('INSERT IGNORE INTO emergency_profiles (user_id) VALUES (?)', [adminId]);

      // Seed admin QR tag
      const adminQrToken = 'admin8f92a71c4d9e984b2361093a8901';
      await connection.query('INSERT IGNORE INTO qr_tags (user_id, qr_token, status) VALUES (?, ?, "active")', [adminId, adminQrToken]);

      console.log('👤 Created default admin account: admin@resqtag.com / Admin@123456');
    }

    connection.release();
    console.log('✅ Database migration completed successfully.');
    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

// Allow running directly: `node src/config/migrate.js`
if (process.argv[1] && process.argv[1].endsWith('migrate.js')) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
