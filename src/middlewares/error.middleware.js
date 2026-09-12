const { AppError } = require('../errors/AppError');
const { ZodError } = require('zod');

function errorMiddleware(err, req, res, next) {
  // Tangani Zod validation errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      message: 'Validasi input gagal',
      errors: formattedErrors,
    });
  }

  // Tangani AppError operasional
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.details || null,
    });
  }

  // Galat tak terduga (500 Internal Server Error)
  console.error('Unhandled Server Error:', err);
  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Terjadi kesalahan internal pada server' 
      : (err.message || 'Internal Server Error'),
    errors: null,
  });
}

module.exports = errorMiddleware;
