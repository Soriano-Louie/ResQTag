import pool from './db.js';
import bcrypt from 'bcryptjs';

/**
 * Tables the application cannot function without. Verified after every migration
 * run so a silently-skipped statement is visible in the deploy logs instead of
 * surfacing later as a runtime 500 on one unlucky endpoint.
 */
const REQUIRED_TABLES = [
  'family_members', 'tag_order_recipients',
  'profile_photos',
  'users',
  'emergency_profiles',
  'emergency_contacts',
  'privacy_settings',
  'qr_tags',
  'tag_orders',
  'email_change_verifications'
];

export async function runMigrations() {
  console.log('🔄 Running database migrations...');

  let connection;
  try {
    connection = await pool.getConnection();
  } catch (err) {
    // Without a connection there is nothing to isolate — surface it to the caller.
    console.error('❌ Could not obtain a database connection for migrations:', err.message);
    throw err;
  }

  const failures = [];

  /**
   * Runs one migration statement in isolation.
   *
   * Previously every statement shared one try/catch, so a single failure aborted
   * every statement after it — a transient metadata-lock error on an early
   * CREATE TABLE silently skipped all later tables. Each step is now independent
   * and the failures are collected for reporting at the end.
   */
  const step = async (label, fn) => {
    try {
      return await fn();
    } catch (error) {
      failures.push({ label, message: error.message });
      console.warn(`⚠️ Migration step failed [${label}]: ${error.message}`);
      return null;
    }
  };

  try {
    // 1. Users table
    await step('create users table', () => connection.query(`
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
    `));

    // 2. Emergency profiles table
    await step('create emergency_profiles table', () => connection.query(`
      CREATE TABLE IF NOT EXISTS emergency_profiles (
        profile_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        contact_number VARCHAR(30) NULL,
        address TEXT NULL,
        date_of_birth DATE NULL,
        blood_type VARCHAR(50) NULL,
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
    `));

    // Ensure blood_type has sufficient length in existing databases
    await step('widen emergency_profiles.blood_type', () => connection.query(
      `ALTER TABLE emergency_profiles MODIFY COLUMN blood_type VARCHAR(50) NULL;`
    ));

    // 3. Emergency contacts table
    await step('create emergency_contacts table', () => connection.query(`
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
    `));

    // 4. Privacy settings table
    await step('create privacy_settings table', () => connection.query(`
      CREATE TABLE IF NOT EXISTS privacy_settings (
        privacy_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        field_name VARCHAR(50) NOT NULL,
        is_public TINYINT(1) DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_user_field (user_id, field_name),
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `));

    // 5. QR tags table
    await step('create qr_tags table', () => connection.query(`
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
    `));

    // 6. Tag orders table (Physical tag print & digital delivery requests)
    await step('create tag_orders table', () => connection.query(`
      CREATE TABLE IF NOT EXISTS tag_orders (
        order_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        delivery_type ENUM('digital_email', 'physical_shipping') DEFAULT 'digital_email',
        payment_method ENUM('gcash', 'cod') DEFAULT 'gcash',
        target_email VARCHAR(150) NULL,
        recipient_name VARCHAR(100) NOT NULL,
        contact_number VARCHAR(30) NOT NULL,
        shipping_address TEXT NOT NULL,
        tag_type ENUM('keychain', 'wallet_card', 'bundle') DEFAULT 'keychain',
        selected_size VARCHAR(100) DEFAULT 'standard',
        custom_dimensions VARCHAR(255) NULL,
        quantity INT DEFAULT 1,
        order_status ENUM('pending', 'processing', 'printed', 'delivered', 'cancelled') DEFAULT 'pending',
        payment_status ENUM('unpaid', 'submitted', 'verified', 'rejected') DEFAULT 'submitted',
        gcash_receipt_url VARCHAR(255) NULL,
        gcash_ref_number VARCHAR(100) NULL,
        admin_rejection_reason TEXT NULL,
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        INDEX idx_order_user (user_id),
        INDEX idx_order_status (order_status),
        INDEX idx_payment_status (payment_status),
        INDEX idx_payment_method (payment_method)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `));

    // Ensure all dynamic columns exist on existing tag_orders installations
    const newColumns = [
      { name: 'delivery_type', sql: "ALTER TABLE tag_orders ADD COLUMN delivery_type ENUM('digital_email', 'physical_shipping') DEFAULT 'digital_email' AFTER user_id;" },
      { name: 'payment_method', sql: "ALTER TABLE tag_orders ADD COLUMN payment_method ENUM('gcash', 'cod') DEFAULT 'gcash' AFTER delivery_type;" },
      { name: 'target_email', sql: "ALTER TABLE tag_orders ADD COLUMN target_email VARCHAR(150) NULL AFTER delivery_type;" },
      { name: 'tag_type', sql: "ALTER TABLE tag_orders ADD COLUMN tag_type ENUM('keychain', 'wallet_card', 'bundle') DEFAULT 'keychain' AFTER shipping_address;" },
      { name: 'selected_size', sql: "ALTER TABLE tag_orders ADD COLUMN selected_size VARCHAR(100) DEFAULT 'standard' AFTER tag_type;" },
      { name: 'custom_dimensions', sql: "ALTER TABLE tag_orders ADD COLUMN custom_dimensions VARCHAR(255) NULL AFTER selected_size;" },
      { name: 'payment_status', sql: "ALTER TABLE tag_orders ADD COLUMN payment_status ENUM('unpaid', 'submitted', 'verified', 'rejected') DEFAULT 'submitted' AFTER order_status;" },
      { name: 'gcash_receipt_url', sql: "ALTER TABLE tag_orders ADD COLUMN gcash_receipt_url VARCHAR(255) NULL AFTER notes;" },
      { name: 'gcash_ref_number', sql: "ALTER TABLE tag_orders ADD COLUMN gcash_ref_number VARCHAR(100) NULL AFTER gcash_receipt_url;" },
      { name: 'admin_rejection_reason', sql: "ALTER TABLE tag_orders ADD COLUMN admin_rejection_reason TEXT NULL AFTER gcash_ref_number;" }
    ];

    for (const col of newColumns) {
      try {
        const [colCheck] = await connection.query(`
          SELECT COLUMN_NAME
          FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'tag_orders'
            AND COLUMN_NAME = ?;
        `, [col.name]);

        if (colCheck.length === 0) {
          await connection.query(col.sql);
          console.log(`✅ Added missing ${col.name} column to tag_orders table.`);
        }
      } catch (colErr) {
        // Non-fatal: the ALTER is a no-op when the column is already correct.
        console.warn(`Column check note for ${col.name}:`, colErr.message);
      }
    }

    // 7. Email change verification table
    // A pending email change is only ever stored here — the users.email column is
    // untouched until the code sent to the NEW address is confirmed. One active
    // request per user is enforced by unique_user_id so re-requesting a code
    // replaces (rather than stacks with) any previous pending attempt.
    //
    // expires_at is DATETIME, not TIMESTAMP, on purpose. With
    // explicit_defaults_for_timestamp=OFF (the MySQL 5.x default) the first
    // TIMESTAMP column declared without a DEFAULT silently receives both
    // DEFAULT CURRENT_TIMESTAMP and ON UPDATE CURRENT_TIMESTAMP — which would
    // reset expires_at to now on every `SET attempts = attempts + 1` and let a
    // guessed code stay alive indefinitely. DATETIME never gets those implicit
    // attributes.
    await step('create email_change_verifications table', () => connection.query(`
      CREATE TABLE IF NOT EXISTS email_change_verifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        new_email VARCHAR(100) NOT NULL,
        code_hash CHAR(64) NOT NULL,
        attempts INT DEFAULT 0,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        UNIQUE KEY uniq_user (user_id),
        INDEX idx_expires (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `));

    // Seed default admin if none exists
    await step('seed default admin account', async () => {
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
        await connection.query("INSERT IGNORE INTO qr_tags (user_id, qr_token, status) VALUES (?, ?, 'active')", [adminId, adminQrToken]);

        console.log('👤 Created default admin account: admin@resqtag.com / Admin@123456');
      }
    });

    await step('profile photos', () => connection.query(`CREATE TABLE IF NOT EXISTS profile_photos (
      user_id INT NOT NULL,
      member_id INT NOT NULL DEFAULT 0,
      image MEDIUMBLOB NOT NULL,
      PRIMARY KEY (user_id, member_id),
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    )`));
    await step('family schema', () => connection.query(`CREATE TABLE IF NOT EXISTS family_members (
 member_id INT AUTO_INCREMENT PRIMARY KEY,
 user_id INT NOT NULL,
 first_name VARCHAR(50) NOT NULL, last_name VARCHAR(50) NOT NULL,
 relationship VARCHAR(50) NOT NULL DEFAULT '',
 profile JSON NOT NULL, contacts JSON NOT NULL, privacy JSON NOT NULL,
 qr_token VARCHAR(64) NOT NULL UNIQUE, archived BOOLEAN NOT NULL DEFAULT 0,
 FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB`));
    await step('family schema', () => connection.query(`CREATE TABLE IF NOT EXISTS tag_order_recipients (
 recipient_id INT AUTO_INCREMENT PRIMARY KEY,
 order_id INT NOT NULL, member_id INT NULL,
 first_name VARCHAR(50) NOT NULL, last_name VARCHAR(50) NOT NULL,
 qr_token VARCHAR(64) NOT NULL, copies INT NOT NULL,
 FOREIGN KEY (order_id) REFERENCES tag_orders(order_id) ON DELETE CASCADE,
 FOREIGN KEY (member_id) REFERENCES family_members(member_id),
 UNIQUE KEY unique_order_token (order_id, qr_token)
) ENGINE=InnoDB`));
    for (const [name, definition] of [['bundle_quantity','INT NULL'], ['package_size','INT NULL'], ['total_peso','INT NULL']]) {
      await step(`order ${name}`, async () => {
        const [columns] = await connection.query('SHOW COLUMNS FROM tag_orders LIKE ?', [name]);
        if (!columns.length) await connection.query(`ALTER TABLE tag_orders ADD COLUMN ${name} ${definition}`);
      });
    }

    // ---- Verification -------------------------------------------------------
    // Proves the statements above actually took effect. Without this, a skipped
    // CREATE TABLE is indistinguishable from a successful deploy until a request
    // hits an undefined table at runtime.
    let missingTables = [];
    try {
      // Placeholders are built explicitly rather than using IN (?) because array
      // expansion is driver-dependent.
      const placeholders = REQUIRED_TABLES.map(() => '?').join(', ');
      const [rows] = await connection.query(
        `SELECT TABLE_NAME FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${placeholders})`,
        REQUIRED_TABLES
      );

      // information_schema column casing differs between MySQL versions.
      const present = new Set(rows.map((r) => r.TABLE_NAME || r.table_name));
      missingTables = REQUIRED_TABLES.filter((t) => !present.has(t));
    } catch (verifyErr) {
      failures.push({ label: 'verify required tables', message: verifyErr.message });
      console.warn('⚠️ Could not verify required tables:', verifyErr.message);
    }

    if (missingTables.length > 0) {
      console.error(`❌ Missing required table(s): ${missingTables.join(', ')}`);
      console.error('❌ The affected features will fail at runtime. Check the deploy log above for the failing step.');
    } else {
      console.log('✅ Verified all required tables are present.');
    }

    const summary = {
      success: failures.length === 0 && missingTables.length === 0,
      failures,
      missingTables
    };

    if (summary.success) {
      console.log('✅ Database migration completed successfully.');
    } else {
      console.error(`❌ Database migration completed with ${failures.length} failed step(s) and ${missingTables.length} missing table(s).`);
    }

    return summary;
  } finally {
    connection.release();
  }
}

// Allow running directly: `node src/config/migrate.js`
if (process.argv[1] && process.argv[1].endsWith('migrate.js')) {
  runMigrations()
    .then((summary) => {
      // Non-zero exit on partial failure so `npm run migrate` can be used as a
      // deployment verification step in CI or a pre-deploy check.
      if (summary && summary.success === false) {
        console.error('❌ Migration reported failures. Exiting with code 1.');
        process.exit(1);
      }
      process.exit(0);
    })
    .catch(() => process.exit(1));
}
