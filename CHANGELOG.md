# 📜 Catatan Perubahan (Changelog)

Semua perubahan penting pada proyek **Silsilah Keluarga Kolaboratif** didokumentasikan di file ini mengikuti standar [Keep a Changelog](https://keepachangelog.com/id/1.0.0/) dan [Semantic Versioning](https://semver.org/).

---

## [3.1.0] - 2026-09-16 — *Duitku Pop Sandbox Integration & Reviewer Testing Account*

### Ditambahkan (Added)
- **Integrasi Duitku Pop API (Sandbox & Production)**:
  - Endpoint Create Invoice Duitku Pop (`https://api-sandbox.duitku.com/api/merchant/createInvoice` dan fallback production `https://api-prod.duitku.com/api/merchant/createInvoice`).
  - Otentikasi Header Duitku Pop menggunakan `x-duitku-signature: HMAC-SHA256(merchantCode + timestamp, apiKey)` dan `x-duitku-timestamp`.
  - Mengembalikan `reference` (`DUITKU_REFERENCE`) dan `paymentUrl` ke frontend untuk menampilkan modal popup Duitku Pop.
- **Validasi Webhook Callback Duitku Pop**:
  - Verifikasi Signature `HMAC-SHA256(merchantCode + amount + merchantOrderId, apiKey)` dengan timing-safe comparison dan fallback multi-format.
  - Transaksi database ACID dengan row-level lock (`FOR UPDATE`), idempotency check, peningkatan otomatis kuota pohon `max_members`, dan pengiriman email kuitansi resmi via `emailService.sendPaymentInvoiceEmail`.
- **3 Skema Paket Resmi di `upgrade_plans`**:
  - `FREE`: Paket Dasar (0 IDR, 30 anggota, 1 pohon, 1 kolaborator)
  - `KELUARGA_BESAR`: Paket Keluarga Besar (67.000 IDR, 100 anggota, 2 pohon, 3 kolaborator)
  - `DINASTI`: Paket Dinasti (99.000 IDR, 200 anggota, 4 pohon, 5 kolaborator)
- **Script Seeder & SQL**:
  - `database/seed_plans.sql`: SQL seed untuk 3 paket resmi dengan `ON DUPLICATE KEY UPDATE`.
  - `database/seed_reviewer.sql`: SQL seed akun reviewer Duitku QA dan pohon silsilah awal.
  - `database/seed_duitku_setup.js`: Seeder Node.js (`npm run seed:duitku`) untuk setup otomatis.
- **Akun Khusus Reviewer Duitku QA**:
  - Email: `reviewer.duitku@silsilahkeluarga.id`
  - Password: `DuitkuTest2026!` (hash Bcrypt)
  - Pohon Silsilah: *"Keluarga Uji Coba Duitku"* lengkap dengan 5 anggota (3 generasi: Kakek, Nenek, Ayah, Ibu, Anak) dan 2 relasi perkawinan agar kanvas visual interaktif langsung aktif.
- **Konfigurasi Environment**:
  - `DUITKU_MERCHANT_CODE`, `DUITKU_API_KEY`, `DUITKU_ENV`, `DUITKU_CALLBACK_URL` di `.env` dan `.env.example`.

### Diubah (Changed)
- **`src/validations/index.js`**: `paymentInquirySchema` melonggarkan `paymentMethod` menjadi opsional agar modal Duitku Pop dapat menampilkan seluruh opsi pembayaran.
- **`src/repositories/transactionRepository.js`**: `findByMerchantOrderIdWithLock` diperluas menyertakan join ke tabel `users` dan `trees` untuk data invoice lengkap.
- **`src/container.js`**: dependency injection `emailService` ke dalam `PaymentService`.

---

## [3.0.0] - 2026-09-14 — *Full Production Release & Shared Hosting Hardening*

### Ditambahkan (Added)
- **Endpoint Diagnostik SMTP** (`GET /api/v1/health/smtp`): verifikasi handshake Nodemailer + test kirim email nyata via query param `?send_to=email@...`.
- **`src/utils/urlHelper.js`** — helper `getFrontendUrl()` untuk selalu menggunakan domain resmi `https://silsilahkeluarga.id` dan memblokir URL sementara (Vercel/localhost) dari semua email keluar.
- **Google OAuth Multi-Tier Verification** (commit `24c4211`): mekanisme verifikasi token Google berlapis tiga dengan DNS `ipv4first` untuk kompatibilitas cPanel Node.js 22.
- **`/api/v1/health`** — field `frontendUrl` aktif sebagai verifikasi cepat konfigurasi domain.
- **Phase 3 Complete CRUD APIs** — 14 endpoint baru: Users CRUD (Admin), Tree Delete, Collaborator Update/Delete, Marriage Update, Approval Delete, dengan validasi Zod.
- **Endpoint Pengguna Terpadu** (Auth): `PUT /auth/profile`, `PUT /auth/change-password`, `GET /auth/my-invitations`.
- **Forgot Password Flow**: `POST /auth/forgot-password` + `POST /auth/reset-password` dengan tabel `password_resets` dan email reset bertautan ke domain resmi.
- **Fitur Undangan Kolaborator Organik**: resend & revoke invitation. Auto-claim pending invitations saat pengguna baru mendaftar.
- **`scripts/generate_postman.js`**: auto-generator koleksi Postman dari definisi route.
- **`.htaccess` Passenger tuning**: `PassengerMaxInstances 1`, `PassengerPoolIdleTime 300`, `PassengerMaxRequests 1000` untuk shared hosting dengan NPROC limit 40/40.

### Diubah (Changed)
- **`src/server.js`**: `UV_THREADPOOL_SIZE=2` diset di baris pertama sebelum semua `require`. Tambah `dns.setDefaultResultOrder('ipv4first')` untuk DNS outbound di cPanel Node.js 22.
- **`src/config/database.js`**: `connectionLimit` dinamis (default 2 di production), `queueLimit: 50`, `connectTimeout: 10000`, `enableKeepAlive: true`, dual password fallback.
- **`src/services/emailService.js`**: `pool: false` mencegah dead socket timeout. Default config ke `mail.silsilahkeluarga.id:465`. `verifyConnection()` kini tampilkan detail config SMTP aktif.
- **`src/config/emailContent.js`**: brand `websiteUrl`, `supportEmail`, `footerCopyright` kini dinamis dari env vars.
- **`src/services/authService.js`** & **`treeService.js`**: gunakan `getFrontendUrl()` di semua konstruksi URL untuk email.
- **`src/services/paymentService.js`**: `defaultReturnUrl` fallback ke `https://silsilahkeluarga.id`. `phoneNumber` diambil dari `user.phone_number` (bukan hardcoded).
- **`package.json`**: versi `3.0.0`, deskripsi diperbarui ke Phase 3 Production.
- **`.env.example`**: penambahan semua variabel SMTP, tuning resource, dan `BACKEND_CALLBACK_URL`.

### Diperbaiki (Fixed)
- URL email yang tersasar ke domain Vercel — diperbaiki permanen via `getFrontendUrl()`.
- Startup database connection check dibungkus `finally { connection.release() }`.
- Email reset password yang masih mengarah ke URL Vercel lama.

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
