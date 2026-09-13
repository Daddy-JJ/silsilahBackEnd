// Utamakan rute IPv4 untuk DNS lookup (mencegah timeout koneksi outbound ke Google/SMTP di cPanel Node 22)
const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

// Batasi threadpool libuv untuk meminimalkan jumlah OS threads di shared hosting (NPROC limit 40/40)
process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || '2';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const app = require('./app');
const { pool } = require('./container');

const PORT = process.env.PORT || 5000;
const pino = require('pino');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const server = app.listen(PORT, async () => {
  let connection;
  try {
    // Verifikasi konektivitas database saat startup
    connection = await pool.getConnection();
    logger.info('Database connected successfully to MySQL/MariaDB.');
  } catch (err) {
    logger.error({ err }, 'Warning: Failed to connect to MySQL/MariaDB on startup');
  } finally {
    if (connection) connection.release();
  }
  logger.info(`Silsilah Keluarga Backend Server is running on http://localhost:${PORT}`);
});

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down server gracefully...');
  server.close(async () => {
    try {
      await pool.end();
      logger.info('Database pool closed.');
    } catch (err) {
      logger.error({ err }, 'Error closing database pool');
    }
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
