# 🛠️ Dokumentasi Pengembangan (Development & Architecture Guide)

> **Proyek:** Silsilah Keluarga Kolaboratif  
> **Versi:** 2.0.0 (Production Ready)  
> **Tanggal Rilis:** September 2026  
> **Standar Arsitektur:** Clean Architecture, Repository Pattern, Stateless REST API, DAG Graph Visualization

---

## 1. Ikhtisar Arsitektur Sistem

Aplikasi Silsilah Keluarga dibangun menggunakan pemisahan tegas antara antarmuka (*Client-Side SPA*) dan peladen (*Server-Side REST API*):

```
┌──────────────────────────────────────────────────────────┐
│              FRONTEND (Vercel Production)                │
│  React 19 + Vite + Tailwind CSS v4 + @xyflow/react       │
│  - Orthogonal Lineage Renderer (Custom SVG SmoothStep)   │
│  - Bottom-Up Subtree Dagre Layout Engine                 │
│  - Gestural Navigation (Pan/Zoom on Touchpad/Mobile)     │
└────────────────────────────┬─────────────────────────────┘
                             │ HTTPS / Bearer JWT
                             ▼
┌──────────────────────────────────────────────────────────┐
│              BACKEND (Rumahweb cPanel / Railway)         │
│  Node.js 20 LTS + Express.js + Phusion Passenger         │
│  - Controller -> Service -> Repository Pattern           │
│  - Anti-Cycle DAG Validator (Kahn's / DFS Algorithm)     │
│  - Optimistic Locking Concurrency Control                │
│  - Zod Input Validation & Pino Logging                   │
└────────────────────────────┬─────────────────────────────┘
                             │ MySQL2 Connection Pool (utf8mb4)
                             ▼
┌──────────────────────────────────────────────────────────┐
│              DATABASE (Rumahweb MariaDB 11.4)            │
│  Tables: users, trees, tree_members, family_members,      │
│          marriages, pending_approvals                    │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Tumpukan Teknologi (Tech Stack)

### Frontend (`silsilah-frontend`)
- **Runtime & Build:** Node.js, Vite 8
- **UI Library:** React 19, Lucide React (Icons)
- **Canvas Visualisasi Graf:** `@xyflow/react` (React Flow v12)
- **Graph Layout Engine:** `@dagrejs/dagre` + Custom Subtree Centering Math
- **CSS Framework:** Tailwind CSS v4 (`@tailwindcss/vite`)
- **Image Export:** `html-to-image` (Canvas Canvas-to-Blob HD 2x)

### Backend (`silsilah-backend`)
- **Runtime:** Node.js 20 LTS (CommonJS)
- **Framework:** Express.js 4.x
- **Database Driver:** `mysql2/promise` (Connection Pool)
- **Skema Validasi:** Zod 3.x
- **Otentikasi:** JWT (`jsonwebtoken`) + Password Hashing (`bcryptjs` 10 rounds)
- **Keamanan:** Helmet (Security Headers), CORS (Multi-Origin Whitelist), Express Rate Limit
- **Logging:** Pino & Pino-HTTP

---

## 3. Skema Basis Data & Model Relasi

Database dirancang dengan integritas referensial penuh menggunakan *Foreign Key* dan mekanisme *Cascading/Set Null*:

```sql
users (id PK, email UK, password_hash, nama_lengkap, created_at)
  │
  ├──< trees (id PK, nama_silsilah, created_by_user_id FK, max_members, created_at)
  │      │
  │      ├──< tree_members (id PK, tree_id FK, user_id FK, role ENUM, created_at)
  │      │      (UQ: tree_id + user_id)
  │      │
  │      ├──< family_members (id PK, tree_id FK, nama_lengkap, jenis_kelamin ENUM('L','P'),
  │      │                   tanggal_lahir DATE, ayah_id FK, ibu_id FK, urutan_anak INT,
  │      │                   kontributor_id FK, version INT DEFAULT 1, timestamps)
  │      │
  │      ├──< marriages (id PK, tree_id FK, suami_id FK, istri_id FK, tanggal_pernikahan DATE)
  │      │      (UQ: tree_id + suami_id + istri_id)
  │      │
  │      └──< pending_approvals (id PK, tree_id FK, target_member_id FK, proposed_by_user_id FK,
  │                              target_version INT, patch_data JSON, status ENUM, review_notes)
```

### Konsep Database Kunci:
1. **Optimistic Locking (`family_members.version`):** Mencegah *lost update*. Setiap update mutlak menyertakan versi saat ini (`WHERE id = ? AND version = ?`). Jika cocok, versi bertambah `version = version + 1`.
2. **Karakter Set `utf8mb4`:** Dikonfigurasi eksplisit pada koneksi `database.js` untuk mendukung karakter multibyte, nama tradisional, dan emoji status.
3. **Penyimpanan Pernikahan Mandiri (`marriages`):** Pasangan resmi disimpan independen dari data anak, memungkinkan relasi tanpa anak dan poligami tercatat secara terstruktur.

---

## 4. Algoritma & Formula Kritis

### A. Algoritma Bottom-Up Subtree Layout (`layout.js`)
Standar layout Dagre dasar menempatkan node berdasarkan *rank separation*, yang seringkali membuat garis keturunan anak bergeser asimetris mendekati paman/bibi. Algoritma kami memperbaikinya:
1. **Pembangunan Hutan Pohon (`treeChildren`):** Mengelompokkan anak berdasarkan simpul pasangan (`ayahId_ibuId`).
2. **Rekursi Lebar Bounding Box (Bottom-Up):** Menghitung total lebar yang dibutuhkan oleh seluruh sub-cabang dari generasi terbawah hingga puncak.
3. **Penetapan Koordinat X Simetris (Top-Down):** Menghitung titik tengah simpul orang tua (`midX = (parentLeft + parentRight) / 2`), lalu mendistribusikan koordinat X anak-anak tepat di tengah area bounding box tersebut.

### B. Parallel Bus Staggering & Custom Path (`JumpEdge.jsx`)
React Flow standar menarik garis belokan di koordinat `midY = (sourceY + targetY) / 2`. Jika dua keluarga berada pada level Y yang sama, garis horizontalnya bertumpuk pada piksel yang sama.
- **Formula Offset:**
  $$\text{midY} = \text{sourceY} + \text{busOffset}$$
  di mana $\text{busOffset} = 20 + (\text{knotIndex} \pmod 4) \times 8 \text{ px}$ (menghasilkan ketinggian bertingkat 20px, 28px, 36px, 44px).
- **Kurva Quadratic Bezier:**
  Jika $X_1 \neq X_2$, kurva lekukan halus digambar menggunakan perintah SVG `Q` dengan pembatasan radius otomatis ($\max(r)$) agar tidak patah saat jarak simpul rapat.
- **Arc Jumps on Intersection:** Jika garis melintasi garis lain, busur lengkung digambar di atas persilangan untuk merepresentasikan kabel lompat (standar skematik sirkuit).

### C. Validasi Anti-Siklus Graf (Anti-Cycle DAG Validator)
Mencegah paradoks biologis silsilah (anak menjadi leluhur dari dirinya sendiri):
- Setiap penambahan atau perubahan `ayah_id` / `ibu_id` menjalankan *Depth-First Search (DFS)* traversal ke atas (*ancestor path*).
- Jika ID target anggota ditemukan di jalur leluhur calon orang tua, sistem segera menolak transaksi dengan galat `422 Unprocessable Entity: Deteksi Siklus Terlarang`.

---

## 5. Manajemen Status & Konfigurasi Lingkungan

### Environment Frontend (`.env`)
```bash
# Biarkan kosong pada localhost (otomatis memanfaatkan Vite Proxy port 5000)
# Diisi pada dashboard Vercel Project Settings:
VITE_API_BASE_URL=https://apisilsilah.kartunamadigital.id/api/v1
```

### Environment Backend (`.env` cPanel Node.js App)
```bash
PORT=5000
NODE_ENV=production
# Application Root: public_html/apisilsilah.kartunamadigital.id
# Application URL: apisilsilah.kartunamadigital.id
DB_HOST=localhost
DB_PORT=3306
DB_USER=karj9582_silsilah_user
DB_PASS=PasswordKuatDatabase123!
DB_NAME=karj9582_silsilah
JWT_SECRET=super_secret_key_minimum_32_characters_random_string
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://silsilahkeluarga.id,https://silsilahkeluarga-mu.vercel.app,http://localhost:3000
LOG_LEVEL=info

# SMTP Email Resmi
SMTP_HOST=localhost
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=admin@silsilahkeluarga.id
SMTP_PASS=(password_email_cpanel)
SMTP_FROM_NAME=SilsilahKeluarga.id
SMTP_FROM_EMAIL=admin@silsilahkeluarga.id
```

---

## 6. Prosedur Pengujian & CI/CD Checklist

Sebelum merilis perubahan baru ke repositori Git:
1. **Audit Linting & Syntax:**
   ```bash
   cd silsilah-frontend && npm run build
   cd ../silsilah-backend && node --check src/server.js
   ```
2. **Eksekusi Seeder Data Uji:**
   ```bash
   cd silsilah-backend && npm run seed:extended
   ```
3. **Verifikasi Endpoint via Postman:**
   Impor `silsilah-backend/silsilah-api.postman_collection.json`, jalankan tes koleksi terhadap `http://localhost:5000/api/v1`.
