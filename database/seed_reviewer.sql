-- ========================================================
-- SilsilahKeluarga.id — Akun Reviewer Testing Duitku QA
-- Akun khusus untuk verifikasi tim reviewer Duitku
-- ========================================================

-- 1. Buat User Reviewer Duitku QA
-- Email: reviewer.duitku@silsilahkeluarga.id
-- Password asli: DuitkuTest2026!
INSERT INTO users (
    id,
    email,
    password_hash,
    nama_lengkap,
    system_role,
    auth_provider,
    is_verified
) VALUES (
    'a1111111-0000-4000-8000-000000000001',
    'reviewer.duitku@silsilahkeluarga.id',
    '$2a$10$052kX73tStiqNStLO4HogO52SNnExSBzU0rtryO74m/75lZ403LxC',
    'Reviewer Duitku QA',
    'USER',
    'LOCAL',
    TRUE
)
ON DUPLICATE KEY UPDATE
    password_hash = VALUES(password_hash),
    nama_lengkap = VALUES(nama_lengkap),
    system_role = VALUES(system_role),
    is_verified = VALUES(is_verified);

-- 2. Buat Pohon Silsilah Awal Milik Akun Reviewer (Aktif 90 Hari > 60 Hari)
INSERT INTO trees (
    id,
    nama_silsilah,
    created_by_user_id,
    max_members,
    membership_plan,
    membership_expires_at,
    membership_status
) VALUES (
    'b2222222-0000-4000-8000-000000000001',
    'Keluarga Uji Coba Duitku',
    'a1111111-0000-4000-8000-000000000001',
    30,
    'FREE',
    DATE_ADD(NOW(), INTERVAL 90 DAY),
    'ACTIVE'
)
ON DUPLICATE KEY UPDATE
    nama_silsilah = VALUES(nama_silsilah),
    membership_plan = VALUES(membership_plan),
    membership_expires_at = VALUES(membership_expires_at),
    membership_status = VALUES(membership_status);

-- 3. Tetapkan Peran ADMIN_UTAMA untuk Reviewer pada Pohon Tersebut
INSERT INTO tree_members (
    id,
    tree_id,
    user_id,
    role
) VALUES (
    'c3333333-0000-4000-8000-000000000001',
    'b2222222-0000-4000-8000-000000000001',
    'a1111111-0000-4000-8000-000000000001',
    'ADMIN_UTAMA'
)
ON DUPLICATE KEY UPDATE
    role = VALUES(role);

-- 4. Masukkan Data Anggota Keluarga (3 Generasi: Kakek, Nenek, Ayah, Ibu, Anak)
-- Gen 1: Kakek & Nenek
INSERT INTO family_members (id, tree_id, nama_lengkap, jenis_kelamin, tanggal_lahir, version)
VALUES 
('d4444444-0000-4000-8000-000000000001', 'b2222222-0000-4000-8000-000000000001', 'H. Soedirman', 'L', '1948-03-15', 1),
('d4444444-0000-4000-8000-000000000002', 'b2222222-0000-4000-8000-000000000001', 'Hj. Siti Rahayu', 'P', '1952-07-20', 1)
ON DUPLICATE KEY UPDATE nama_lengkap = VALUES(nama_lengkap);

-- Gen 2: Ayah (anak dari Kakek & Nenek) & Ibu
INSERT INTO family_members (id, tree_id, nama_lengkap, jenis_kelamin, tanggal_lahir, ayah_id, ibu_id, version)
VALUES 
('d4444444-0000-4000-8000-000000000003', 'b2222222-0000-4000-8000-000000000001', 'Budi Santoso', 'L', '1976-05-10', 'd4444444-0000-4000-8000-000000000001', 'd4444444-0000-4000-8000-000000000002', 1),
('d4444444-0000-4000-8000-000000000004', 'b2222222-0000-4000-8000-000000000001', 'Dewi Lestari', 'P', '1979-11-25', NULL, NULL, 1)
ON DUPLICATE KEY UPDATE nama_lengkap = VALUES(nama_lengkap), ayah_id = VALUES(ayah_id), ibu_id = VALUES(ibu_id);

-- Gen 3: Anak (anak dari Budi Santoso & Dewi Lestari)
INSERT INTO family_members (id, tree_id, nama_lengkap, jenis_kelamin, tanggal_lahir, ayah_id, ibu_id, urutan_anak, version)
VALUES 
('d4444444-0000-4000-8000-000000000005', 'b2222222-0000-4000-8000-000000000001', 'Rizky Pratama', 'L', '2004-08-17', 'd4444444-0000-4000-8000-000000000003', 'd4444444-0000-4000-8000-000000000004', 1, 1)
ON DUPLICATE KEY UPDATE nama_lengkap = VALUES(nama_lengkap), ayah_id = VALUES(ayah_id), ibu_id = VALUES(ibu_id);

-- 5. Relasi Perkawinan (Marriages)
INSERT INTO marriages (id, tree_id, suami_id, istri_id, tanggal_pernikahan)
VALUES 
('e5555555-0000-4000-8000-000000000001', 'b2222222-0000-4000-8000-000000000001', 'd4444444-0000-4000-8000-000000000001', 'd4444444-0000-4000-8000-000000000002', '1973-04-10'),
('e5555555-0000-4000-8000-000000000002', 'b2222222-0000-4000-8000-000000000001', 'd4444444-0000-4000-8000-000000000003', 'd4444444-0000-4000-8000-000000000004', '2002-09-08')
ON DUPLICATE KEY UPDATE tanggal_pernikahan = VALUES(tanggal_pernikahan);
