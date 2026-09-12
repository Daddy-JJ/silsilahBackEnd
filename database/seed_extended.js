/**
 * Extended Seeder — Silsilah Keluarga
 * 5 Generasi, poligami, multiple trees, banyak roles
 * Run: node database/seed_extended.js
 */
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const pool = require("../src/config/database");

async function seedExtended() {
  console.log("🌱 Running Extended Seeder...");
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash("password123", salt);

    // ─── USERS ─────────────────────────────────────────────────────────
    const [admin1Id, admin2Id, kont1Id, kont2Id, viewer1Id] = Array.from({ length: 5 }, () => uuidv4());

    const users = [
      [admin1Id,  "admin@silsilah.app",      hash, "Admin Utama"],
      [admin2Id,  "admin2@silsilah.app",     hash, "Admin Kedua"],
      [kont1Id,   "kont1@silsilah.app",      hash, "Kontributor Satu"],
      [kont2Id,   "kont2@silsilah.app",      hash, "Kontributor Dua"],
      [viewer1Id, "viewer@silsilah.app",     hash, "Viewer Satu"],
    ];

    for (const [id, email, pw, nama] of users) {
      const isSuperAdmin = email === "admin@silsilah.app";
      await conn.query(
        `INSERT INTO users (id, email, password_hash, nama_lengkap, system_role) VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE nama_lengkap = VALUES(nama_lengkap), system_role = VALUES(system_role)`,
        [id, email, pw, nama, isSuperAdmin ? 'SUPER_ADMIN' : 'USER']
      );
    }

    // ─── TREE ──────────────────────────────────────────────────────────
    const treeId = uuidv4();
    await conn.query(
      `INSERT INTO trees (id, nama_silsilah, created_by_user_id, max_members) VALUES (?, ?, ?, ?)`,
      [treeId, "Bani Mangkunegaran", admin1Id, 30]
    );

    // ─── TREE MEMBERS ──────────────────────────────────────────────────
    const roles = [
      [treeId, admin1Id,  "ADMIN_UTAMA"],
      [treeId, kont1Id,   "KONTRIBUTOR"],
      [treeId, kont2Id,   "KONTRIBUTOR"],
      [treeId, viewer1Id, "VIEWER"],
    ];
    for (const [tid, uid, role] of roles) {
      await conn.query(
        `INSERT INTO tree_members (id, tree_id, user_id, role) VALUES (?, ?, ?, ?)`,
        [uuidv4(), tid, uid, role]
      );
    }

    // ─── GEN 1: MBAH (2 pasang) ────────────────────────────────────────
    const [mbahKakung1, mbahPutri1, mbahKakung2, mbahPutri2] = Array.from({ length: 4 }, () => uuidv4());

    const gen1 = [
      [mbahKakung1, treeId, "Mbah Kakung Wiro", "L", "1920-01-01"],
      [mbahPutri1,  treeId, "Mbah Putri Wiro",  "P", "1923-05-15"],
      [mbahKakung2, treeId, "Mbah Kakung Sastro","L", "1918-03-20"],
      [mbahPutri2,  treeId, "Mbah Putri Sastro", "P", "1921-07-10"],
    ];
    for (const [id, tid, nama, gender, tgl] of gen1) {
      await conn.query(
        `INSERT INTO family_members (id, tree_id, nama_lengkap, jenis_kelamin, tanggal_lahir, version) VALUES (?, ?, ?, ?, ?, 1)`,
        [id, tid, nama, gender, tgl]
      );
    }

    // ─── GEN 2: ORANG TUA (3 pasang, poligami 1) ────────────────────────
    const [waluyo, suharsini, ngatmini, pakdeA, budeA, pakdeWit, budeWit] = Array.from({ length: 7 }, () => uuidv4());

    const gen2 = [
      [waluyo,   treeId, "Waluyo",   "L", "1945-04-10", mbahKakung1, mbahPutri1, 1],
      [suharsini,treeId, "Suharsini","P", "1948-08-20", mbahKakung2, mbahPutri2, 1],
      [ngatmini, treeId, "Ngatmini", "P", "1950-11-05", mbahKakung2, mbahPutri2, 2],
      [pakdeA,   treeId, "Pakde Ahmad","L","1943-01-01",mbahKakung1, mbahPutri1, 2],
      [budeA,    treeId, "Bude Ahmad","P", "1945-06-12", null,        null,       1],
      [pakdeWit, treeId, "Pakde Witono","L","1947-09-09",mbahKakung1,mbahPutri1, 3],
      [budeWit,  treeId, "Bude Witono","P","1950-02-28",null,         null,       1],
    ];
    for (const [id, tid, nama, gender, tgl, ayah, ibu, urutan] of gen2) {
      await conn.query(
        `INSERT INTO family_members (id, tree_id, nama_lengkap, jenis_kelamin, tanggal_lahir, ayah_id, ibu_id, urutan_anak, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [id, tid, nama, gender, tgl, ayah || null, ibu || null, urutan]
      );
    }

    // ─── GEN 3: ANAK-ANAK ─────────────────────────────────────────────
    const [arwan,  denik, cindy, saka, bhaga, budi, mbaWitik, masMuch] = Array.from({ length: 8 }, () => uuidv4());

    const gen3 = [
      [arwan,    treeId, "Arwan",    "L", "1972-03-12", waluyo, suharsini, 1],
      [denik,    treeId, "Denik",    "P", "1975-07-20", waluyo, suharsini, 2],
      [budi,     treeId, "Budi",     "L", "1978-10-01", waluyo, ngatmini,  1],
      [mbaWitik, treeId, "Mba Witik","P", "1973-04-05", pakdeWit, budeWit, 1],
      [masMuch,  treeId, "Mas Much", "L", "1976-12-15", pakdeWit, budeWit, 2],
    ];
    for (const [id, tid, nama, gender, tgl, ayah, ibu, urutan] of gen3) {
      await conn.query(
        `INSERT INTO family_members (id, tree_id, nama_lengkap, jenis_kelamin, tanggal_lahir, ayah_id, ibu_id, urutan_anak, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [id, tid, nama, gender, tgl, ayah || null, ibu || null, urutan]
      );
    }

    // Add Cindy (istri Arwan, dari luar keluarga)
    const cindyId = cindy;
    await conn.query(
      `INSERT INTO family_members (id, tree_id, nama_lengkap, jenis_kelamin, tanggal_lahir, version) VALUES (?, ?, ?, ?, ?, 1)`,
      [cindyId, treeId, "Cindy", "P", "1975-01-01"]
    );

    // ─── GEN 4: CUCU ─────────────────────────────────────────────────
    const [sakaId, bhagaId] = [saka, bhaga];
    const gen4 = [
      [sakaId,  treeId, "Saka",  "L", "2000-02-14", arwan, cindyId, 1],
      [bhagaId, treeId, "Bhaga", "L", "2003-05-20", arwan, cindyId, 2],
    ];
    for (const [id, tid, nama, gender, tgl, ayah, ibu, urutan] of gen4) {
      await conn.query(
        `INSERT INTO family_members (id, tree_id, nama_lengkap, jenis_kelamin, tanggal_lahir, ayah_id, ibu_id, urutan_anak, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [id, tid, nama, gender, tgl, ayah, ibu, urutan]
      );
    }

    // ─── MARRIAGES ────────────────────────────────────────────────────
    const marriages = [
      [treeId, mbahKakung1, mbahPutri1],
      [treeId, mbahKakung2, mbahPutri2],
      [treeId, waluyo,      suharsini],
      [treeId, waluyo,      ngatmini],
      [treeId, pakdeA,      budeA],
      [treeId, pakdeWit,    budeWit],
      [treeId, arwan,       cindyId],
    ];
    for (const [tid, suami, istri] of marriages) {
      await conn.query(
        `INSERT IGNORE INTO marriages (id, tree_id, suami_id, istri_id) VALUES (?, ?, ?, ?)`,
        [uuidv4(), tid, suami, istri]
      );
    }

    // ─── PENDING APPROVALS ────────────────────────────────────────────
    await conn.query(
      `INSERT INTO pending_approvals (id, tree_id, target_member_id, proposed_by_user_id, target_version, patch_data, status, review_notes)
       VALUES (?, ?, ?, ?, 1, ?, 'PENDING', 'Perbaikan ejaan nama resmi')`,
      [uuidv4(), treeId, arwan, kont1Id, JSON.stringify({ nama_lengkap: "Ir. Arwan Wibowo, S.T." })]
    );

    await conn.commit();
    console.log("\n✅ Extended Seeder selesai!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("AKUN DEMO:");
    console.log("Admin Utama  : admin@silsilah.app   / password123");
    console.log("Kontributor 1: kont1@silsilah.app   / password123");
    console.log("Kontributor 2: kont2@silsilah.app   / password123");
    console.log("Viewer       : viewer@silsilah.app  / password123");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } catch (err) {
    await conn.rollback();
    console.error("❌ Seeder gagal:", err.message);
    process.exit(1);
  } finally {
    conn.release();
    await pool.end();
  }
}

seedExtended();
