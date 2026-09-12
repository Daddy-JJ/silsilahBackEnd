const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'silsilah_keluarga_db',
  waitForConnections: true,
  connectionLimit: process.env.NODE_ENV === 'production' ? 5 : 10,
  queueLimit: 0,
  decimalNumbers: true,
  // Charset eksplisit untuk kompatibilitas dengan shared hosting MariaDB
  charset: 'utf8mb4',
  timezone: '+07:00',
  // Tidak pakai SSL di shared hosting (internal localhost connection)
  ssl: false,
});

module.exports = pool;
