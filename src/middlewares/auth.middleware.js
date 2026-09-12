const jwt = require('jsonwebtoken');
const { UnauthorizedError } = require('../errors/AppError');

function createAuthMiddleware(jwtSecret) {
  return (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedError('Token otentikasi tidak ditemukan. Harap sertakan Bearer token.');
      }

      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, jwtSecret);

      req.user = decoded;
      next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
        return next(new UnauthorizedError('Token tidak valid atau telah kedaluwarsa.'));
      }
      next(error);
    }
  };
}

module.exports = createAuthMiddleware;
