const express = require('express');
const cors = require('cors');
const createApiRouter = require('./routes');
const container = require('./container');
const errorMiddleware = require('./middlewares/error.middleware');
const { NotFoundError } = require('./errors/AppError');

const helmet = require('helmet');
const pinoHttp = require('pino-http');
const pino = require('pino');

const app = express();

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// Middlewares
app.use(helmet()); // Security headers

// CORS: mendukung multiple origins (local dev + Vercel production)
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000,http://localhost:3001')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, curl, same-origin)
      if (!origin) return callback(null, true);
      
      // In development, automatically allow all localhost / 127.0.0.1 origins
      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:[0-9]+)?$/.test(origin);
      if (process.env.NODE_ENV !== 'production' && isLocalhost) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      callback(new Error(`Origin ${origin} tidak diizinkan oleh CORS`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(pinoHttp({ logger })); // Request logging

// API v1 Routes
app.use('/api/v1', createApiRouter(container));

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Collaborative Family Tree API',
    version: '1.0.0',
    docs: '/api/v1/health',
  });
});

// 404 Handler
app.use((req, res, next) => {
  next(new NotFoundError(`Rute ${req.method} ${req.originalUrl} tidak ditemukan.`));
});

// Centralized Error Handling Middleware
app.use(errorMiddleware);

module.exports = app;
