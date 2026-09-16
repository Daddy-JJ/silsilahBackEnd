-- ====================================================================
-- Migrasi: Skema Masa Aktif Pohon (Membership) & Tabel Feedback Pengguna
-- Non-destruktif: Aman dijalankan pada database yang sudah berisi data
-- ====================================================================

-- 1. Tambah Kolom membership_plan pada tabel trees (jika belum ada)
SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'trees' 
      AND COLUMN_NAME = 'membership_plan'
);
SET @sql := IF(@col_exists = 0, 
    'ALTER TABLE trees ADD COLUMN membership_plan VARCHAR(50) NOT NULL DEFAULT \'FREE\' AFTER max_members', 
    'SELECT \'Column membership_plan already exists\''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Tambah Kolom membership_expires_at pada tabel trees (jika belum ada)
SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'trees' 
      AND COLUMN_NAME = 'membership_expires_at'
);
SET @sql := IF(@col_exists = 0, 
    'ALTER TABLE trees ADD COLUMN membership_expires_at DATETIME NULL AFTER membership_plan', 
    'SELECT \'Column membership_expires_at already exists\''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Tambah Kolom membership_status pada tabel trees (jika belum ada)
SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'trees' 
      AND COLUMN_NAME = 'membership_status'
);
SET @sql := IF(@col_exists = 0, 
    'ALTER TABLE trees ADD COLUMN membership_status ENUM(\'ACTIVE\', \'EXPIRED\', \'LIFETIME\') NOT NULL DEFAULT \'ACTIVE\' AFTER membership_expires_at', 
    'SELECT \'Column membership_status already exists\''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Buat Tabel user_feedbacks (jika belum ada)
CREATE TABLE IF NOT EXISTS user_feedbacks (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    category VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_feedbacks_user (user_id),
    INDEX idx_feedbacks_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
