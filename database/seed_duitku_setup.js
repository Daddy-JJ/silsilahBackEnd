/**
 * SilsilahKeluarga.id — Duitku Setup Seeder
 * Menjalankan seed 3 paket resmi upgrade_plans dan akun pengujian reviewer Duitku QA.
 * 
 * Jalankan: node database/seed_duitku_setup.js
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../src/config/database');

async function runDuitkuSetupSeed() {
  console.log('🚀 Memulai Seeding Paket Resmi & Akun Reviewer Duitku QA...\n');

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 0. Migrasi Skema: Kolom Masa Aktif Trees & Tabel user_feedbacks
    console.log('🛠️  0. Memastikan Kolom Masa Aktif Trees & Tabel Feedback Tersedia...');
    const [cols] = await conn.query(`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'trees'
    `);
    const colNames = cols.map(c => c.COLUMN_NAME);

    if (!colNames.includes('membership_plan')) {
      await conn.query(`ALTER TABLE trees ADD COLUMN membership_plan VARCHAR(50) NOT NULL DEFAULT 'FREE' AFTER max_members`);
    }
    if (!colNames.includes('membership_expires_at')) {
      await conn.query(`ALTER TABLE trees ADD COLUMN membership_expires_at DATETIME NULL AFTER membership_plan`);
    }
    if (!colNames.includes('membership_status')) {
      await conn.query(`ALTER TABLE trees ADD COLUMN membership_status ENUM('ACTIVE', 'EXPIRED', 'LIFETIME') NOT NULL DEFAULT 'ACTIVE' AFTER membership_expires_at`);
    }

    await conn.query(`
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
    `);
    console.log('   ✅ Skema tabel trees & user_feedbacks terverifikasi.');

    // 1. Sinkronisasi 3 Paket Resmi di tabel upgrade_plans
    console.log('\n📦 1. Menyinkronkan 3 Paket Resmi ke upgrade_plans...');
    
    // Nonaktifkan paket lama
    await conn.query(`
      UPDATE upgrade_plans 
      SET is_active = FALSE 
      WHERE kode_paket NOT IN ('FREE', 'KELUARGA_BESAR', 'DINASTI');
    `);

    const plans = [
      {
        id: '11111111-1111-4111-8111-111111111111',
        kode_paket: 'FREE',
        nama_paket: 'Paket Dasar',
        deskripsi: 'Paket awal gratis untuk membangun pohon silsilah keluarga inti.',
        target_max_members: 30,
        target_max_trees: 1,
        target_max_collaborators: 1,
        harga_normal: 0.00,
        promo_badge: 'GRATIS',
        urutan: 1,
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        kode_paket: 'KELUARGA_BESAR',
        nama_paket: 'Paket Keluarga Besar',
        deskripsi: 'Kapasitas hingga 100 anggota keluarga, 2 semesta pohon, dan 3 kolaborator aktif.',
        target_max_members: 100,
        target_max_trees: 2,
        target_max_collaborators: 3,
        harga_normal: 67000.00,
        promo_badge: 'POPULER',
        urutan: 2,
      },
      {
        id: '33333333-3333-4333-8333-333333333333',
        kode_paket: 'DINASTI',
        nama_paket: 'Paket Dinasti',
        deskripsi: 'Kapasitas penuh hingga 200 anggota keluarga multi-generasi, 4 semesta pohon, dan 5 kolaborator.',
        target_max_members: 200,
        target_max_trees: 4,
        target_max_collaborators: 5,
        harga_normal: 99000.00,
        promo_badge: 'TERBAIK',
        urutan: 3,
      },
    ];

    for (const p of plans) {
      await conn.query(`
        INSERT INTO upgrade_plans (
          id, kode_paket, nama_paket, deskripsi, target_max_members,
          target_max_trees, target_max_collaborators, harga_normal, harga_promo,
          is_promo_active, promo_badge, is_active, urutan
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, FALSE, ?, TRUE, ?)
        ON DUPLICATE KEY UPDATE
          kode_paket = VALUES(kode_paket),
          nama_paket = VALUES(nama_paket),
          deskripsi = VALUES(deskripsi),
          target_max_members = VALUES(target_max_members),
          target_max_trees = VALUES(target_max_trees),
          target_max_collaborators = VALUES(target_max_collaborators),
          harga_normal = VALUES(harga_normal),
          harga_promo = VALUES(harga_promo),
          is_promo_active = VALUES(is_promo_active),
          promo_badge = VALUES(promo_badge),
          is_active = VALUES(is_active),
          urutan = VALUES(urutan);
      `, [
        p.id,
        p.kode_paket,
        p.nama_paket,
        p.deskripsi,
        p.target_max_members,
        p.target_max_trees,
        p.target_max_collaborators,
        p.harga_normal,
        p.promo_badge,
        p.urutan
      ]);
    }
    console.log('   ✅ 3 Paket Resmi berhasil disinkronkan.');

    // 2. Pembuatan Akun Reviewer Duitku QA
    console.log('\n👤 2. Membuat Akun Reviewer Duitku QA...');
    const reviewerPassword = 'DuitkuTest2026!';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(reviewerPassword, salt);

    const reviewerId = 'a1111111-0000-4000-8000-000000000001';
    const treeId = 'b2222222-0000-4000-8000-000000000001';

    await conn.query(`
      INSERT INTO users (
        id, email, password_hash, nama_lengkap, system_role, auth_provider, is_verified
      ) VALUES (?, 'reviewer.duitku@silsilahkeluarga.id', ?, 'Reviewer Duitku QA', 'USER', 'LOCAL', TRUE)
      ON DUPLICATE KEY UPDATE
        password_hash = VALUES(password_hash),
        nama_lengkap = VALUES(nama_lengkap),
        system_role = VALUES(system_role),
        is_verified = VALUES(is_verified);
    `, [reviewerId, passwordHash]);
    console.log('   ✅ Akun reviewer.duitku@silsilahkeluarga.id siap.');

    // 3. Buat Pohon Silsilah "Keluarga Uji Coba Duitku" (Aktif 90 Hari > 60 Hari)
    console.log('\n🌳 3. Membuat Pohon Silsilah Awal Reviewer (Aktif 90 Hari)...');
    await conn.query(`
      INSERT INTO trees (id, nama_silsilah, created_by_user_id, max_members, membership_plan, membership_expires_at, membership_status)
      VALUES (?, 'Keluarga Uji Coba Duitku', ?, 30, 'FREE', DATE_ADD(NOW(), INTERVAL 90 DAY), 'ACTIVE')
      ON DUPLICATE KEY UPDATE
        nama_silsilah = VALUES(nama_silsilah),
        membership_plan = VALUES(membership_plan),
        membership_expires_at = VALUES(membership_expires_at),
        membership_status = VALUES(membership_status);
    `, [treeId, reviewerId]);

    // Role ADMIN_UTAMA
    await conn.query(`
      INSERT INTO tree_members (id, tree_id, user_id, role)
      VALUES ('c3333333-0000-4000-8000-000000000001', ?, ?, 'ADMIN_UTAMA')
      ON DUPLICATE KEY UPDATE
        role = VALUES(role);
    `, [treeId, reviewerId]);
    console.log('   ✅ Pohon silsilah terdaftar dengan role ADMIN_UTAMA.');

    // 4. Masukkan 5 Anggota Keluarga (3 Generasi: Kakek, Nenek, Ayah, Ibu, Anak)
    console.log('\n👨‍👩‍👧‍👦 4. Memasukkan 5 Node Anggota Keluarga...');
    const kakekId = 'd4444444-0000-4000-8000-000000000001';
    const nenekId = 'd4444444-0000-4000-8000-000000000002';
    const ayahId  = 'd4444444-0000-4000-8000-000000000003';
    const ibuId   = 'd4444444-0000-4000-8000-000000000004';
    const anakId  = 'd4444444-0000-4000-8000-000000000005';

    // Gen 1
    await conn.query(`
      INSERT INTO family_members (id, tree_id, nama_lengkap, jenis_kelamin, tanggal_lahir, version)
      VALUES 
      (?, ?, 'H. Soedirman', 'L', '1948-03-15', 1),
      (?, ?, 'Hj. Siti Rahayu', 'P', '1952-07-20', 1)
      ON DUPLICATE KEY UPDATE nama_lengkap = VALUES(nama_lengkap);
    `, [kakekId, treeId, nenekId, treeId]);

    // Gen 2
    await conn.query(`
      INSERT INTO family_members (id, tree_id, nama_lengkap, jenis_kelamin, tanggal_lahir, ayah_id, ibu_id, version)
      VALUES 
      (?, ?, 'Budi Santoso', 'L', '1976-05-10', ?, ?, 1),
      (?, ?, 'Dewi Lestari', 'P', '1979-11-25', NULL, NULL, 1)
      ON DUPLICATE KEY UPDATE nama_lengkap = VALUES(nama_lengkap), ayah_id = VALUES(ayah_id), ibu_id = VALUES(ibu_id);
    `, [ayahId, treeId, kakekId, nenekId, ibuId, treeId]);

    // Gen 3
    await conn.query(`
      INSERT INTO family_members (id, tree_id, nama_lengkap, jenis_kelamin, tanggal_lahir, ayah_id, ibu_id, urutan_anak, version)
      VALUES 
      (?, ?, 'Rizky Pratama', 'L', '2004-08-17', ?, ?, 1, 1)
      ON DUPLICATE KEY UPDATE nama_lengkap = VALUES(nama_lengkap), ayah_id = VALUES(ayah_id), ibu_id = VALUES(ibu_id);
    `, [anakId, treeId, ayahId, ibuId]);

    // Relasi Perkawinan (Marriages)
    await conn.query(`
      INSERT INTO marriages (id, tree_id, suami_id, istri_id, tanggal_pernikahan)
      VALUES 
      ('e5555555-0000-4000-8000-000000000001', ?, ?, ?, '1973-04-10'),
      ('e5555555-0000-4000-8000-000000000002', ?, ?, ?, '2002-09-08')
      ON DUPLICATE KEY UPDATE tanggal_pernikahan = VALUES(tanggal_pernikahan);
    `, [treeId, kakekId, nenekId, treeId, ayahId, ibuId]);
    console.log('   ✅ 5 Anggota keluarga dan 2 simpul pernikahan aktif.');

    await conn.commit();

    console.log('\n=============================================================');
    console.log('🎉 SEEDING SELESAI DENGAN SUKSES!');
    console.log('=============================================================');
    console.log('AKUN TESTING REVIEWER DUITKU:');
    console.log('Email        : reviewer.duitku@silsilahkeluarga.id');
    console.log('Password     : DuitkuTest2026!');
    console.log('Tree Id      : ' + treeId);
    console.log('Pohon Awal   : "Keluarga Uji Coba Duitku" (5 Anggota Silsilah)');
    console.log('=============================================================\n');

  } catch (err) {
    await conn.rollback();
    console.error('❌ Gagal melakukan seeding:', err);
    process.exit(1);
  } finally {
    conn.release();
    await pool.end();
  }
}

if (require.main === module) {
  runDuitkuSetupSeed();
}

module.exports = { runDuitkuSetupSeed };
