# 📜 Catatan Perubahan (Changelog)

Semua perubahan penting pada proyek **Silsilah Keluarga Kolaboratif** didokumentasikan di file ini mengikuti standar [Keep a Changelog](https://keepachangelog.com/id/1.0.0/) dan [Semantic Versioning](https://semver.org/).

---

## [2.0.0] - 2026-09-09 — *Production Release & Cloud Architecture*

### Ditambahkan (Added)
- **Database-Backed Marriage Engine:** Seluruh relasi pernikahan kini tersimpan permanen di database MariaDB (tabel `marriages`), menggantikan penyimpanan sementara *localStorage*.
- **Sistem Manajemen Kolaborator:** Penambahan `CollaboratorsModal.jsx` dan endpoint `GET /trees/:id/collaborators` bagi Admin Utama untuk mengundang kerabat via email (sebagai Kontributor atau Viewer) dan melihat daftar anggota pohon.
- **Landing Page Publik:** Halaman penyambutan `LandingPage.jsx` berestetika neo-monokrom untuk pengunjung yang belum login, lengkap dengan simulasi kanvas dan 3 pilar nilai kunci.
- **Halaman Publik About & FAQ:** Komponen `AboutFaqModal.jsx` yang memuat visi platform, tabel matriks perbandingan hak akses lengkap, dan jawaban pertanyaan calon pengguna.
- **Audit Keamanan Multi-Tenant (100% Passed):** Penegasan isolasi semesta pohon privat di mana Kontributor/Viewer hanya dapat melihat pohon yang ditentukan oleh Admin Utama.
- **Google OAuth 2.0 Sign-In:** Dukungan registrasi dan login 1-klik menggunakan akun Google (`google-auth-library` di backend & Google Identity Services di frontend) dengan otomatisasi verifikasi email.
- **Skema Pengguna Terpadu:** Penambahan kolom `google_id`, `avatar_url`, `auth_provider`, dan `is_verified` pada tabel `users` sebagai fondasi skalabel untuk OTP email.
- **Endpoint API Marriages:** Penambahan rute REST API `GET /trees/:id/marriages`, `POST /trees/:id/marriages`, dan `DELETE /trees/:id/marriages/:id` dengan otorisasi berbasis peran (*RBAC*).
- **Subway Lineage Color-Coding:** Penugasan palet warna dinamis deterministik untuk setiap simpul perkawinan (Hitam, Biru, Zamrud, Violet, Mawar, Sian) untuk mempermudah identifikasi garis keturunan antar cabang keluarga.
- **Parallel Bus Staggering & Custom SVG Path:** Penyesuaian ketinggian garis horizontal anak (*busOffset*) secara bertingkat (20px, 28px, 36px, 44px) untuk mencegah garis saling bertumpuk pada piksel yang sama.
- **Extended Database Seeder (`seed_extended.js`):** Menghasilkan dataset komprehensif 5 generasi, kasus poligami, relasi in-laws, 4 peran pengguna (Admin, Kontributor, Viewer), dan simulasi usulan tertunda.
- **Postman Collection v2.1:** Pembuatan file spesifikasi `silsilah-api.postman_collection.json` dengan 18 endpoint lengkap beserta variabel otomatis (`base_url`, `token`, `tree_id`).
- **Dokumentasi Komprehensif:** Penerbitan `docs/DEVELOPMENT.md` (arsitektur & algoritma) dan `docs/UX_JOURNEY.md` (filosofi desain & peta interaksi).

### Diubah (Changed)
- **Buku Panduan UX (`UserGuideModal.jsx`):** Pembaruan total menjadi 5 tab modern yang sinkron dengan fitur terkini (Gestur trackpad, Reorder anak, Warna subway, Poligami, dan Ekspor).
- **Pengaturan Lingkungan API (`api.js`):** Menggunakan variabel lingkungan `import.meta.env.VITE_API_BASE_URL` dengan fallback otomatis ke proxy dev lokal untuk kesiapan hosting di Vercel.
- **Konfigurasi Basis Data (`database.js`):** Penambahan konfigurasi eksplisit `charset: 'utf8mb4'`, `timezone: '+07:00'`, dan pembatasan `connectionLimit` produksi untuk kompatibilitas MariaDB 11.4 di cPanel Rumahweb.
- **Konfigurasi Keamanan CORS (`app.js`):** Dukungan multi-origin whitelist (berdasarkan koma) untuk mengizinkan domain Vercel dan lingkungan pengujian lokal secara bersamaan.

### Diperbaiki (Fixed)
- **Data Loss Kerentanan Pernikahan:** Menghilangkan risiko hilangnya garis pernikahan saat pengguna berganti perangkat atau membersihkan memori browser.
- **Penyelarasan Props Profile Drawer:** Penautan dan pemutusan hubungan pasangan kini terhubung langsung ke panggilan mutasi basis data.

---

## [1.5.0] - 2026-09-06 — *Sistem Tata Letak Simetris & Navigasi Gestur*

### Ditambahkan (Added)
- **Algoritma Bottom-Up Subtree Layout:** Rekayasa ulang logika Dagre dengan algoritma rekursif *bounding box* untuk memastikan anak berada simetris tepat di tengah orang tua.
- **Navigasi Trackpad Gestural:** Pengaktifan `panOnScroll={true}` dan `zoomOnScroll={false}` untuk navigasi sentuh dua jari yang sangat mulus di laptop dan mousepad.
- **Interactive Marriage Knots:** Simpul pertemuan suami-istri berukuran 24px dapat digeser bebas (*draggable*) oleh pengguna.
- **Fitur Pengurutan Kelahiran Anak:** Penambahan kontrol panah reorder `▲` dan `▼` di panel profil untuk mengatur urutan anak tertua (Sulung) hingga termuda (Bungsu) dari kiri ke kanan di kanvas.

### Diubah (Changed)
- Tombol **Rapikan Layout (TB)** dipindahkan ke posisi sentral di bilah navigasi utama untuk keterjangkauan yang lebih ergonomis.
- Penyesuaian kontras MiniMap dengan latar belakang gelap transparan dan batas aksen oranye.

---

## [1.0.0] - 2026-09-05 — *Pondasi Inti (Phase 1 Sandbox)*

### Ditambahkan (Added)
- Arsitektur dasar React 19 + Vite 8 dengan Tailwind CSS v4.
- Backend Node.js Express dengan Repository Pattern dan Service Layer.
- Skema database MariaDB untuk pengguna, pohon silsilah, anggota keluarga, dan persetujuan usulan.
- Otentikasi sesi JWT dan enkripsi sandi Bcrypt.
- Sistem otorisasi dua lapis: Admin Utama vs Kontributor dengan kontrol versi data (*Optimistic Locking*).
- Wizard Onboarding 4 langkah untuk inisialisasi semesta pohon pertama.
- Fitur ekspor kanvas ke gambar PNG resolusi tinggi dan dokumen HTML mandiri.
