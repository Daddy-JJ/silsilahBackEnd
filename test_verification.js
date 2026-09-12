/**
 * Skrip Verifikasi Komprehensif: Backend Silsilah Keluarga (Phase 1)
 * Menguji seluruh aturan bisnis, transaksi, optimistic locking, batasan 50 nodes, dan format React Flow.
 */

const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const app = require('./src/app');
const { pool } = require('./src/container');

let server;
let baseUrl;

async function startServer() {
  return new Promise((resolve) => {
    // Jalankan pada port acak/terisolasi untuk testing
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}/api/v1`;
      console.log(`Test server running at ${baseUrl}`);
      resolve();
    });
  });
}

async function request(endpoint, options = {}) {
  const url = `${baseUrl}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => null);
  return {
    status: response.status,
    body: data,
  };
}

async function runTests() {
  console.log('=== MEMULAI PENGUJIAN VERIFIKASI BACKEND SILSILAH KELUARGA ===\n');

  await startServer();

  try {
    // ----------------------------------------------------
    // TEST 1: Health Check
    // ----------------------------------------------------
    console.log('[TEST 1] Memeriksa endpoint Health Check...');
    const health = await request('/health');
    assert.strictEqual(health.status, 200, 'Health check harus return 200');
    assert.strictEqual(health.body.success, true);
    console.log('  PASS: Server aktif dan merespon sehat.\n');

    // ----------------------------------------------------
    // TEST 2: Registrasi & Login (Admin Utama & Kontributor)
    // ----------------------------------------------------
    console.log('[TEST 2] Registrasi & Login Pengguna...');
    const timestamp = Date.now();
    const adminPayload = {
      email: `admin_${timestamp}@test.com`,
      password: 'password123',
      nama_lengkap: 'Budi Santoso (Admin)',
    };
    const regAdmin = await request('/auth/register', {
      method: 'POST',
      body: adminPayload,
    });
    assert.strictEqual(regAdmin.status, 201, 'Registrasi Admin harus return 201');
    const adminToken = regAdmin.body.data.token;
    const adminUser = regAdmin.body.data.user;
    console.log(`  Admin terdaftar: ${adminUser.email}`);

    const kontributorPayload = {
      email: `kontributor_${timestamp}@test.com`,
      password: 'password123',
      nama_lengkap: 'Siti Rahma (Kontributor)',
    };
    const regKontributor = await request('/auth/register', {
      method: 'POST',
      body: kontributorPayload,
    });
    assert.strictEqual(regKontributor.status, 201, 'Registrasi Kontributor harus return 201');
    const kontributorToken = regKontributor.body.data.token;
    const kontributorUser = regKontributor.body.data.user;
    console.log(`  Kontributor terdaftar: ${kontributorUser.email}`);
    console.log('  PASS: Registrasi & otentikasi JWT berhasil.\n');

    // ----------------------------------------------------
    // TEST 3: Pembuatan Semesta Pohon Keluarga (Multi-Universe)
    // ----------------------------------------------------
    console.log('[TEST 3] Pembuatan Pohon Keluarga & Asosiasi Role...');
    const createTreeRes = await request('/trees', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        nama_silsilah: 'Bani Santoso Universe',
        max_members: 50,
      },
    });
    assert.strictEqual(createTreeRes.status, 201, 'Pembuatan pohon harus 201');
    const tree = createTreeRes.body.data;
    const treeId = tree.id;
    assert.strictEqual(tree.currentUserRole, 'ADMIN_UTAMA');
    console.log(`  Pohon dibuat: ${tree.nama_silsilah} (ID: ${treeId})`);

    // Tambahkan kontributor ke semesta pohon
    const addMemberRes = await request(`/trees/${treeId}/collaborators`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        targetUserEmail: kontributorUser.email,
        role: 'KONTRIBUTOR',
      },
    });
    assert.strictEqual(addMemberRes.status, 201, 'Menambahkan kontributor harus 201');
    console.log('  PASS: Semesta pohon dan role KONTRIBUTOR berhasil didaftarkan.\n');

    // ----------------------------------------------------
    // TEST 4: Penambahan Anggota Keluarga Berjenjang (Kakek, Ayah, Anak)
    // ----------------------------------------------------
    console.log('[TEST 4] Penambahan Node Anggota Silsilah Berjenjang...');
    // 1. Kakek
    const kakekRes = await request(`/trees/${treeId}/members`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        nama_lengkap: 'Kakek Ahmad',
        jenis_kelamin: 'L',
        tanggal_lahir: '1940-01-01',
      },
    });
    assert.strictEqual(kakekRes.status, 201);
    const kakek = kakekRes.body.data;
    assert.strictEqual(kakek.version, 1, 'Versi awal harus 1');

    // 2. Nenek
    const nenekRes = await request(`/trees/${treeId}/members`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        nama_lengkap: 'Nenek Maryam',
        jenis_kelamin: 'P',
        tanggal_lahir: '1945-05-10',
      },
    });
    assert.strictEqual(nenekRes.status, 201);
    const nenek = nenekRes.body.data;

    // 3. Ayah (Anak dari Kakek & Nenek)
    const ayahRes = await request(`/trees/${treeId}/members`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        nama_lengkap: 'Ayah Bambang',
        jenis_kelamin: 'L',
        tanggal_lahir: '1970-08-17',
        ayah_id: kakek.id,
        ibu_id: nenek.id,
      },
    });
    if (ayahRes.status !== 201) {
      console.error('ayahRes error:', JSON.stringify(ayahRes));
    }
    assert.strictEqual(ayahRes.status, 201);
    const ayah = ayahRes.body.data;

    // 4. Ibu (Menantu, orang tua bebas)
    const ibuRes = await request(`/trees/${treeId}/members`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        nama_lengkap: 'Ibu Ratna',
        jenis_kelamin: 'P',
        tanggal_lahir: '1972-12-01',
      },
    });
    assert.strictEqual(ibuRes.status, 201);
    const ibu = ibuRes.body.data;

    // 5. Cucu (Anak dari Ayah & Ibu)
    const cucuRes = await request(`/trees/${treeId}/members`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        nama_lengkap: 'Cucu Dian',
        jenis_kelamin: 'P',
        tanggal_lahir: '2000-03-25',
        ayah_id: ayah.id,
        ibu_id: ibu.id,
      },
    });
    assert.strictEqual(cucuRes.status, 201);
    const cucu = cucuRes.body.data;
    console.log('  PASS: Silsilah 3 generasi berhasil ditambahkan.\n');

    // ----------------------------------------------------
    // TEST 5: CRITICAL RULE 2 - Pencegahan Relasi Siklis (Anti-Cycle DAG)
    // ----------------------------------------------------
    console.log('[TEST 5] Validasi Aturan Kritis: Anti-Cycle DAG...');
    // Coba jadikan Cucu sebagai ayah bagi Kakek (Siklus: Kakek -> Ayah -> Cucu -> Kakek)
    const cycleRes = await request(`/trees/${treeId}/members/${kakek.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        version: kakek.version,
        patch_data: {
          ayah_id: cucu.id,
        },
      },
    });
    assert.strictEqual(
      cycleRes.status,
      422,
      'Relasi siklis harus ditolak dengan status HTTP 422 Unprocessable Entity'
    );
    assert.strictEqual(cycleRes.body.success, false);
    console.log(`  Respon galat 422: "${cycleRes.body.message}"`);

    // Coba jadikan Kakek sebagai ayah bagi dirinya sendiri (Self-parenting)
    const selfParentRes = await request(`/trees/${treeId}/members/${kakek.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        version: kakek.version,
        patch_data: {
          ayah_id: kakek.id,
        },
      },
    });
    assert.strictEqual(selfParentRes.status, 422, 'Self-parenting harus ditolak dengan status HTTP 422');
    console.log('  PASS: Anti-Cycle DAG berhasil menggagalkan siklus dengan galat HTTP 422.\n');

    // ----------------------------------------------------
    // TEST 6: CRITICAL RULE 4 - Kontrol Konkurensi (Optimistic Locking)
    // ----------------------------------------------------
    console.log('[TEST 6] Validasi Aturan Kritis: Optimistic Locking...');
    // Update pertama yang sukses (version 1 -> version 2)
    const validUpdateRes = await request(`/trees/${treeId}/members/${kakek.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        version: 1,
        patch_data: {
          nama_lengkap: 'Kakek Ahmad Sastrawan',
        },
      },
    });
    assert.strictEqual(validUpdateRes.status, 200, 'Update dengan versi cocok harus berhasil');
    assert.strictEqual(validUpdateRes.body.data.version, 2, 'Versi harus naik menjadi 2');
    console.log('  Update berhasil: versi naik dari 1 menjadi 2');

    // Update kedua dengan versi basi (stale version 1) harus ditolak dengan 409 Conflict!
    const conflictUpdateRes = await request(`/trees/${treeId}/members/${kakek.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        version: 1, // Versi basi!
        patch_data: {
          nama_lengkap: 'Kakek Ahmad Terkini',
        },
      },
    });
    assert.strictEqual(
      conflictUpdateRes.status,
      409,
      'Lost Update harus dicegah dengan HTTP 409 Conflict'
    );
    console.log(`  Respon galat 409: "${conflictUpdateRes.body.message}"`);
    console.log('  PASS: Kontrol Konkurensi Optimistic Locking berhasil (HTTP 409).\n');

    // ----------------------------------------------------
    // TEST 7: Handover & Approval Workflow dengan Transaksi Basis Data
    // ----------------------------------------------------
    console.log('[TEST 7] Alur Usulan Perubahan (Handover & Approval) dengan Transaksi...');
    // Kontributor mengajukan usulan perubahan pada Ayah Bambang (versi saat ini = 1)
    const proposeRes = await request(`/trees/${treeId}/approvals`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${kontributorToken}` },
      body: {
        target_member_id: ayah.id,
        target_version: ayah.version,
        patch_data: {
          nama_lengkap: 'Ayah Bambang Subagio, S.T.',
        },
      },
    });
    assert.strictEqual(proposeRes.status, 201, 'Pengajuan usulan harus return 201');
    const approval = proposeRes.body.data;
    assert.strictEqual(approval.status, 'PENDING');
    console.log(`  Usulan dibuat dengan ID: ${approval.id}`);

    // Admin Utama menyetujui usulan perubahan (APPROVED)
    const resolveRes = await request(`/trees/${treeId}/approvals/${approval.id}/resolve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        action: 'APPROVED',
        review_notes: 'Data gelar terkonfirmasi valid.',
      },
    });
    assert.strictEqual(resolveRes.status, 200, 'Persetujuan usulan harus return 200');
    assert.strictEqual(resolveRes.body.data.approval.status, 'APPROVED');
    assert.strictEqual(resolveRes.body.data.updatedMember.nama_lengkap, 'Ayah Bambang Subagio, S.T.');
    assert.strictEqual(resolveRes.body.data.updatedMember.version, 2, 'Versi naik menjadi 2');
    console.log('  PASS: Persetujuan usulan berhasil dan versi data ter-update dalam transaksi.\n');

    // ----------------------------------------------------
    // TEST 8: State Frontend - React Flow Canvas Mapping
    // ----------------------------------------------------
    console.log('[TEST 8] Memeriksa format state React Flow Canvas...');
    const canvasRes = await request(`/trees/${treeId}/canvas`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(canvasRes.status, 200);
    const canvas = canvasRes.body.data;
    assert.ok(Array.isArray(canvas.nodes), 'canvas.nodes harus berupa array');
    assert.ok(Array.isArray(canvas.edges), 'canvas.edges harus berupa array');
    assert.ok(canvas.nodes.length >= 5, 'Jumlah node minimal 5');
    assert.ok(canvas.edges.length >= 4, 'Jumlah edge minimal 4');

    // Verifikasi struktur node
    const firstNode = canvas.nodes[0];
    assert.ok(firstNode.id, 'Node harus memiliki id');
    assert.ok(firstNode.data && firstNode.data.label, 'Node data harus memiliki label');
    assert.ok(
      typeof firstNode.position?.x === 'number' && typeof firstNode.position?.y === 'number',
      'Node harus memiliki position x dan y'
    );

    // Verifikasi struktur edge
    const firstEdge = canvas.edges[0];
    assert.ok(firstEdge.id, 'Edge harus memiliki id');
    assert.ok(firstEdge.source, 'Edge harus memiliki source');
    assert.ok(firstEdge.target, 'Edge harus memiliki target');
    console.log(`  Nodes count: ${canvas.nodes.length}, Edges count: ${canvas.edges.length}`);
    console.log('  PASS: Format visualisasi React Flow valid.\n');

    // ----------------------------------------------------
    // TEST 9: CRITICAL RULE 1 - Batas Kapasitas (Default Limit 30 Nodes di Phase 2)
    // ----------------------------------------------------
    console.log('[TEST 9] Validasi Aturan Kritis: Hard Limit 30 Nodes Phase 2 (Galat 422)...');
    // Ambil jumlah anggota yang sudah ada (saat ini ada 5 node)
    const currentMembersRes = await request(`/trees/${treeId}/members`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const currentTotal = currentMembersRes.body.data.length;
    console.log(`  Jumlah node saat ini: ${currentTotal}. Mengisi hingga 30 node...`);

    // Tambahkan node hingga tepat 30
    for (let i = currentTotal + 1; i <= 30; i++) {
      const fillRes = await request(`/trees/${treeId}/members`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          nama_lengkap: `Anggota Uji #${i}`,
          jenis_kelamin: i % 2 === 0 ? 'L' : 'P',
        },
      });
      assert.strictEqual(fillRes.status, 201, `Gagal menambahkan anggota ke-${i}`);
    }
    console.log('  Tepat 30 node berhasil disimpan.');

    // Sekarang coba tambahkan node ke-31. Ini HARUS dilempar galat 422 Unprocessable Entity!
    console.log('  Mencoba menambahkan node ke-31 (melebihi kuota 30)...');
    const overflowRes = await request(`/trees/${treeId}/members`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        nama_lengkap: 'Anggota Terlarang #31',
        jenis_kelamin: 'L',
      },
    });

    assert.strictEqual(
      overflowRes.status,
      422,
      `Harus melempar 422 Unprocessable Entity ketika node melebihi 30. Diterima: ${overflowRes.status}`
    );
    console.log(`  Respon galat 422: "${overflowRes.body.message}"`);
    console.log('  PASS: Hard Limit 30 nodes per pohon berhasil ditegakkan!');

    console.log('================================================================');
    console.log('SEMUA PENGUJIAN VERIFIKASI SELESAI DENGAN SUKSES 100%!');
    console.log('================================================================\n');
  } catch (err) {
    console.error('PENGUJIAN GAGAL:', err);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
    await pool.end();
  }
}

runTests();
