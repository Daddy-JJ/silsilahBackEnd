const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'silsilah_keluarga_db',
  waitForConnections: true,
  // Dibatasi 2 di production untuk mitigasi limit proses shared hosting (NPROC 40/40)
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || (process.env.NODE_ENV === 'production' ? 2 : 10),
  // Maksimal 50 antrean sebelum menolak request (mencegah memory leak & hanging process)
  queueLimit: Number(process.env.DB_QUEUE_LIMIT) || 50,
  // Batas waktu tunggu koneksi 10 detik agar request tidak menggantung
  connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT) || 10000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  decimalNumbers: true,
  // Charset eksplisit untuk kompatibilitas dengan shared hosting MariaDB
  charset: 'utf8mb4',
  timezone: '+07:00',
  // Tidak pakai SSL di shared hosting (internal localhost connection)
  ssl: false,
});

module.exports = pool;
