-- Database DDL: Silsilah Keluarga (Phase 2)

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS upgrade_plans;
DROP TABLE IF EXISTS system_settings;
DROP TABLE IF EXISTS marriages;
DROP TABLE IF EXISTS pending_approvals;
DROP TABLE IF EXISTS family_members;
DROP TABLE IF EXISTS tree_members;
DROP TABLE IF EXISTS trees;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;


CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(191) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NULL,
    nama_lengkap VARCHAR(100) NOT NULL,
    google_id VARCHAR(191) NULL UNIQUE,
    avatar_url TEXT NULL,
    auth_provider ENUM('LOCAL', 'GOOGLE') NOT NULL DEFAULT 'LOCAL',
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    system_role ENUM('USER', 'SUPER_ADMIN') NOT NULL DEFAULT 'USER',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE trees (
    id VARCHAR(36) PRIMARY KEY,
    nama_silsilah VARCHAR(100) NOT NULL,
    created_by_user_id VARCHAR(36) NOT NULL,
    max_members INT DEFAULT 30,
    membership_plan VARCHAR(50) NOT NULL DEFAULT 'FREE',
    membership_expires_at DATETIME NULL,
    membership_status ENUM('ACTIVE', 'EXPIRED', 'LIFETIME') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE tree_members (
    id VARCHAR(36) PRIMARY KEY,
    tree_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    role ENUM('ADMIN_UTAMA', 'KONTRIBUTOR', 'VIEWER') NOT NULL DEFAULT 'VIEWER',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_tree (tree_id, user_id),
    FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE family_members (
    id VARCHAR(36) PRIMARY KEY,
    tree_id VARCHAR(36) NOT NULL,
    nama_lengkap VARCHAR(100) NOT NULL,
    jenis_kelamin ENUM('L', 'P') NOT NULL,
    tanggal_lahir DATE NULL,
    ayah_id VARCHAR(36) NULL,
    ibu_id VARCHAR(36) NULL,
    urutan_anak INT DEFAULT 0,
    kontributor_id VARCHAR(36) NULL,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE,
    FOREIGN KEY (ayah_id) REFERENCES family_members(id) ON DELETE SET NULL,
    FOREIGN KEY (ibu_id) REFERENCES family_members(id) ON DELETE SET NULL,
    FOREIGN KEY (kontributor_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE marriages (
    id VARCHAR(36) PRIMARY KEY,
    tree_id VARCHAR(36) NOT NULL,
    suami_id VARCHAR(36) NOT NULL,
    istri_id VARCHAR(36) NOT NULL,
    tanggal_pernikahan DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_marriage (tree_id, suami_id, istri_id),
    FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE,
    FOREIGN KEY (suami_id) REFERENCES family_members(id) ON DELETE CASCADE,
    FOREIGN KEY (istri_id) REFERENCES family_members(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pending_approvals (
    id VARCHAR(36) PRIMARY KEY,
    tree_id VARCHAR(36) NOT NULL,
    target_member_id VARCHAR(36) NOT NULL,
    proposed_by_user_id VARCHAR(36) NOT NULL,
    target_version INT NOT NULL,
    patch_data JSON NOT NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    review_notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE,
    FOREIGN KEY (target_member_id) REFERENCES family_members(id) ON DELETE CASCADE,
    FOREIGN KEY (proposed_by_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_pa_tree_status ON pending_approvals(tree_id, status);

CREATE TABLE system_settings (
    setting_key VARCHAR(50) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    description VARCHAR(255) NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('default_max_members', '30', 'Batas kuota node default untuk pohon baru'),
('default_max_trees', '1', 'Batas kuota pohon per user di fase gratis'),
('default_max_collaborators', '1', 'Batas kuota kolaborator per pohon di fase gratis'),
('duitku_merchant_code', '', 'Merchant Code dari portal Duitku'),
('duitku_api_key', '', 'API Key dari portal Duitku'),
('duitku_environment', 'sandbox', 'Lingkungan Duitku: sandbox atau production'),
('duitku_enabled_methods', '["QRIS", "OVO", "DANA", "SHOPEEPAY", "LINKAJA"]', 'Metode pembayaran yang diaktifkan');

CREATE TABLE upgrade_plans (
    id VARCHAR(36) PRIMARY KEY,
    kode_paket VARCHAR(50) UNIQUE NOT NULL,
    nama_paket VARCHAR(100) NOT NULL,
    deskripsi TEXT NULL,
    target_max_members INT NOT NULL,
    target_max_trees INT DEFAULT 1,
    target_max_collaborators INT DEFAULT 3,
    harga_normal DECIMAL(12,2) NOT NULL,
    harga_promo DECIMAL(12,2) NULL,
    is_promo_active BOOLEAN NOT NULL DEFAULT FALSE,
    promo_badge VARCHAR(50) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    urutan INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE transactions (
    id VARCHAR(36) PRIMARY KEY,
    merchant_order_id VARCHAR(64) UNIQUE NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    tree_id VARCHAR(36) NOT NULL,
    plan_id VARCHAR(36) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    duitku_reference VARCHAR(100) NULL,
    duitku_payment_url TEXT NULL,
    status ENUM('PENDING', 'SUCCESS', 'FAILED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    paid_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES upgrade_plans(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabel Undangan Kolaborator (Organic Growth Loop)
CREATE TABLE IF NOT EXISTS tree_invitations (
    id VARCHAR(36) PRIMARY KEY,
    tree_id VARCHAR(36) NOT NULL,
    inviter_user_id VARCHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role ENUM('ADMIN_UTAMA', 'KONTRIBUTOR', 'VIEWER') NOT NULL DEFAULT 'KONTRIBUTOR',
    token VARCHAR(64) NOT NULL UNIQUE,
    status ENUM('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE,
    FOREIGN KEY (inviter_user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_tree_invites (tree_id, status),
    INDEX idx_email_status (email, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabel Token Pemulihan Kata Sandi (Forgot & Reset Password)
CREATE TABLE IF NOT EXISTS password_resets (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(191) NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email_token (email, token),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabel Masukan & Saran Pengguna (User Feedback)
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


