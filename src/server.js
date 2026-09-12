const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const app = require('./app');
const { pool } = require('./container');

const PORT = process.env.PORT || 5000;
const pino = require('pino');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const server = app.listen(PORT, async () => {
  try {
    // Verifikasi konektivitas database saat startup
    const connection = await pool.getConnection();
    logger.info('Database connected successfully to MySQL/MariaDB.');
    connection.release();
  } catch (err) {
    logger.error({ err }, 'Warning: Failed to connect to MySQL/MariaDB on startup');
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
