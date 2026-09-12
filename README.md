# ⚙️ Silsilah Backend API (Node.js 20 LTS + Express + MariaDB)

> REST API Peladen untuk aplikasi Silsilah Keluarga Kolaboratif yang dibangun dengan Clean Architecture, kontrol konkurensi versi data (*Optimistic Locking*), dan pencegahan siklus biologis graf (*Anti-Cycle DAG*).

[![NodeJS](https://img.shields.io/badge/Node.js-20.x%20LTS-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MariaDB](https://img.shields.io/badge/MariaDB-11.4-003545?logo=mariadb&logoColor=white)](https://mariadb.org/)
[![JWT](https://img.shields.io/badge/Auth-JWT-000000?logo=json-web-tokens&logoColor=white)](https://jwt.io/)

---

## 📖 Dokumentasi Terkait
- 🛠️ [Arsitektur Sistem, Skema DB & Logika Algoritma](docs/DEVELOPMENT.md)
- 🎨 [Perjalanan Desain & Matriks Peran Pengguna](docs/UX_JOURNEY.md)
- 📜 [Catatan Perubahan (Changelog)](CHANGELOG.md)
- 📬 [Postman API Collection v2.1](silsilah-api.postman_collection.json)

---

## ⚡ Fitur Utama Backend
- **Repository-Service Pattern:** Pemisahan tanggung jawab kode yang rapi, mudah diuji, dan skalabel.
- **Penyimpanan Pernikahan Mandiri:** Manajemen pasangan resmi tersimpan di basis data (mendukung poligami dan pasangan tanpa anak).
- **Anti-Cycle DAG Traversal:** Validasi berbasis graf untuk mencegah kekeliruan silsilah biologis (anak menjadi orang tua bagi leluhurnya).
- **Optimistic Locking:** Proteksi integritas data dengan kolom `version` pada setiap anggota keluarga untuk mencegah pembaruan data yang saling bertumpuk (*Lost Update*).
- **Alur Persetujuan Dua Lapis (Handover):** Pemisahan hak akses antara Admin Utama dan usulan Kontributor.
- **Keamanan Berlapis:** Rate limiting, sanitasi parameter query, header HTTP aman via Helmet, dan CORS multi-origin.

---

## 🛠️ Menjalankan Lokal

```bash
# 1. Pasang dependensi
npm install

# 2. Setup database di MariaDB / MySQL (XAMPP Port 3306)
# Jalankan migrasi skema tabel
npm run migrate

# 3. Masukkan data seeder komprehensif (5 generasi + poligami)
npm run seed:extended

# 4. Jalankan server (Port 5000)
npm run dev
```

---

## 🚀 Deployment ke cPanel (Rumahweb) / Railway

Aplikasi ini siap dijalankan menggunakan **Node.js 20 LTS** di cPanel via *Phusion Passenger* atau *Railway.app*.

### Variabel Lingkungan Produksi (`.env`):
```env
PORT=5000
NODE_ENV=production
DB_HOST=localhost
DB_PORT=3306
DB_USER=user_database_cpanel
DB_PASS=password_database_cpanel
DB_NAME=nama_database_cpanel
JWT_SECRET=kunci_rahasia_acak_minimal_32_karakter
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://silsilah-keluarga.vercel.app
LOG_LEVEL=info
```
