const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../src/config/database');

async function seed() {
  console.log('Seeding demo data to MariaDB/MySQL...');

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    const adminId = uuidv4();
    const kontributorId = uuidv4();

    // 1. Insert Demo Users (ON DUPLICATE KEY UPDATE)
    console.log('Creating demo users...');
    await conn.query(
      `INSERT INTO users (id, email, password_hash, nama_lengkap, system_role)
       VALUES (?, 'admin_demo@silsilah.local', ?, 'Admin Utama Demo', 'SUPER_ADMIN')
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), nama_lengkap = VALUES(nama_lengkap), system_role = VALUES(system_role);`,
      [adminId, passwordHash]
    );

    await conn.query(
      `INSERT INTO users (id, email, password_hash, nama_lengkap)
       VALUES (?, 'kontributor_demo@silsilah.local', ?, 'Kontributor Demo')
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), nama_lengkap = VALUES(nama_lengkap);`,
      [kontributorId, passwordHash]
    );

    // Ambil ID aktual jika user sudah pernah dibuat
    const [[adminUser]] = await conn.query(
      `SELECT id FROM users WHERE email = 'admin_demo@silsilah.local'`
    );
    const [[kontributorUser]] = await conn.query(
      `SELECT id FROM users WHERE email = 'kontributor_demo@silsilah.local'`
    );

    // 2. Insert Demo Tree
    console.log('Creating demo tree universe...');
    const treeId = uuidv4();
    await conn.query(
      `INSERT INTO trees (id, nama_silsilah, created_by_user_id, max_members)
       VALUES (?, 'Bani Raden Mangkunegaran', ?, 30);`,
      [treeId, adminUser.id]
    );

    // 3. Insert Tree Members (Roles)
    console.log('Assigning roles to tree...');
    await conn.query(
      `INSERT INTO tree_members (id, tree_id, user_id, role)
       VALUES (?, ?, ?, 'ADMIN_UTAMA');`,
      [uuidv4(), treeId, adminUser.id]
    );

    await conn.query(
      `INSERT INTO tree_members (id, tree_id, user_id, role)
       VALUES (?, ?, ?, 'KONTRIBUTOR');`,
      [uuidv4(), treeId, kontributorUser.id]
    );

    // 4. Insert 3 Generations of Family Members
    console.log('Inserting 3-generation family tree nodes...');
    const kakekId = uuidv4();
    const nenekId = uuidv4();
    const ayahId = uuidv4();
    const ibuId = uuidv4();
    const anak1Id = uuidv4();
    const anak2Id = uuidv4();

    // Gen 1: Kakek & Nenek
    await conn.query(
      `INSERT INTO family_members (id, tree_id, nama_lengkap, jenis_kelamin, tanggal_lahir, version)
       VALUES (?, ?, 'K.R.T. Suryokusumo', 'L', '1945-02-10', 1);`,
      [kakekId, treeId]
    );

    await conn.query(
      `INSERT INTO family_members (id, tree_id, nama_lengkap, jenis_kelamin, tanggal_lahir, version)
       VALUES (?, ?, 'R.Ay. Siti Aminah', 'P', '1948-08-17', 1);`,
      [nenekId, treeId]
    );

    // Gen 2: Ayah & Ibu
    await conn.query(
      `INSERT INTO family_members (id, tree_id, nama_lengkap, jenis_kelamin, tanggal_lahir, ayah_id, ibu_id, version)
       VALUES (?, ?, 'Bambang Suryo Wibowo', 'L', '1972-04-12', ?, ?, 1);`,
      [ayahId, treeId, kakekId, nenekId]
    );

    await conn.query(
      `INSERT INTO family_members (id, tree_id, nama_lengkap, jenis_kelamin, tanggal_lahir, version)
       VALUES (?, ?, 'Ratna Dewi Kusuma', 'P', '1975-11-20', 1);`,
      [ibuId, treeId]
    );

    // Gen 3: Cucu 1 & Cucu 2
    await conn.query(
      `INSERT INTO family_members (id, tree_id, nama_lengkap, jenis_kelamin, tanggal_lahir, ayah_id, ibu_id, version)
       VALUES (?, ?, 'Dimas Suryo Prasetyo', 'L', '2001-05-02', ?, ?, 1);`,
      [anak1Id, treeId, ayahId, ibuId]
    );

    await conn.query(
      `INSERT INTO family_members (id, tree_id, nama_lengkap, jenis_kelamin, tanggal_lahir, ayah_id, ibu_id, version)
       VALUES (?, ?, 'Anisa Suryo Paramita', 'P', '2005-09-14', ?, ?, 1);`,
      [anak2Id, treeId, ayahId, ibuId]
    );

    // 5. Insert Sample Pending Approval from Kontributor
    console.log('Creating sample pending approval...');
    await conn.query(
      `INSERT INTO pending_approvals (id, tree_id, target_member_id, proposed_by_user_id, target_version, patch_data, status, review_notes)
       VALUES (?, ?, ?, ?, 1, ?, 'PENDING', 'Pembaruan gelar kehormatan dan penulisan nama resmi.');`,
      [
        uuidv4(),
        treeId,
        ayahId,
        kontributorUser.id,
        JSON.stringify({ nama_lengkap: 'Ir. Bambang Suryo Wibowo, M.Sc.' }),
      ]
    );

    await conn.commit();
    console.log('\nSeed completed successfully!');
    console.log('--------------------------------------------------');
    console.log('DEMO ACCOUNTS READY TO USE:');
    console.log('Admin Utama : admin_demo@silsilah.local  / password123');
    console.log('Kontributor : kontributor_demo@silsilah.local / password123');
    console.log('--------------------------------------------------');
  } catch (err) {
    await conn.rollback();
    console.error('Seed failed:', err);
  } finally {
    conn.release();
    await pool.end();
  }
}

seed();
