class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Permintaan tidak valid (Bad Request)', details = null) {
    super(message, 400, details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Autentikasi gagal atau token tidak valid', details = null) {
    super(message, 401, details);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Anda tidak memiliki hak akses untuk tindakan ini', details = null) {
    super(message, 403, details);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Data tidak ditemukan', details = null) {
    super(message, 404, details);
  }
}

// 409 Conflict: Kontrol Konkurensi (Optimistic Locking collision)
class ConflictError extends AppError {
  constructor(message = 'Konflik konkurensi: Data telah diperbarui oleh pengguna lain', details = null) {
    super(message, 409, details);
  }
}

// 422 Unprocessable Entity: Hard Limit 50 Nodes & Pencegahan Relasi Siklis (Anti-Cycle DAG)
class UnprocessableEntityError extends AppError {
  constructor(message = 'Entitas tidak dapat diproses', details = null) {
    super(message, 422, details);
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  UnprocessableEntityError,
};
