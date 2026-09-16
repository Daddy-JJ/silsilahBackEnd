-- ========================================================
-- SilsilahKeluarga.id — Official Upgrade Plans Seed
-- Tabel: upgrade_plans
-- ========================================================

-- 1. Nonaktifkan paket lama yang tidak sesuai skema resmi
UPDATE upgrade_plans 
SET is_active = FALSE 
WHERE kode_paket NOT IN ('FREE', 'KELUARGA_BESAR', 'DINASTI');

-- 2. Masukkan / Sinkronkan 3 Paket Resmi
INSERT INTO upgrade_plans (
    id,
    kode_paket,
    nama_paket,
    deskripsi,
    target_max_members,
    target_max_trees,
    target_max_collaborators,
    harga_normal,
    harga_promo,
    is_promo_active,
    promo_badge,
    is_active,
    urutan
) VALUES 
(
    '11111111-1111-4111-8111-111111111111',
    'FREE',
    'Paket Dasar',
    'Paket awal gratis untuk membangun pohon silsilah keluarga inti.',
    30,
    1,
    1,
    0.00,
    NULL,
    FALSE,
    'GRATIS',
    TRUE,
    1
),
(
    '22222222-2222-4222-8222-222222222222',
    'KELUARGA_BESAR',
    'Paket Keluarga Besar',
    'Kapasitas hingga 100 anggota keluarga, 2 semesta pohon, dan 3 kolaborator aktif.',
    100,
    2,
    3,
    67000.00,
    NULL,
    FALSE,
    'POPULER',
    TRUE,
    2
),
(
    '33333333-3333-4333-8333-333333333333',
    'DINASTI',
    'Paket Dinasti',
    'Kapasitas penuh hingga 200 anggota keluarga multi-generasi, 4 semesta pohon, dan 5 kolaborator.',
    200,
    4,
    5,
    99000.00,
    NULL,
    FALSE,
    'TERBAIK',
    TRUE,
    3
)
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
